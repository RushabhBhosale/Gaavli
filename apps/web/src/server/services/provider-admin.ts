import "server-only";
import { z } from "zod";
import { ProviderType } from "@gaavli/constants";
import { connectDb } from "../db/connect";
import { AuditLog, User, Village } from "../models";
import { ProviderClaim, ProviderProfile } from "../models/provider-profile";
import { Service } from "../models/service";
import { AppError } from "../utils/errors";
import { syncDirectoryEntry } from "./provider-profiles";

export const adminProfilesQuerySchema = z
  .object({
    providerType: z.enum(ProviderType).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    search: z.string().trim().max(80).default(""),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(15),
    sort: z
      .enum(["name", "providerType", "village", "owner", "status", "createdAt"])
      .default("createdAt"),
    direction: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();
export const adminClaimsQuerySchema = z
  .object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
  })
  .strict();
const id = z.string().regex(/^[a-f0-9]{24}$/i);
export const adminIdSchema = id;
export const adminClaimActionSchema = z
  .object({ action: z.enum(["approve", "reject"]) })
  .strict();
export const adminProfileStatusSchema = z
  .object({ status: z.enum(["ACTIVE", "INACTIVE"]) })
  .strict();

export async function listProfilesForAdmin(
  query: z.infer<typeof adminProfilesQuerySchema>,
) {
  await connectDb();
  const key = query.search
    .normalize("NFKC")
    .toLocaleLowerCase("en-IN")
    .replace(/[^\p{L}\p{N}]+/gu, "");
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const villageRows = key
    ? await Village.find({
        $or: [
          { nameEn: { $regex: escapedSearch, $options: "i" } },
          { nameMr: { $regex: escapedSearch, $options: "i" } },
        ],
      })
        .select("_id")
        .lean()
    : [];
  const filter = {
    ...(query.providerType ? { providerType: query.providerType } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(key
      ? {
          $or: [
            { nameKey: { $regex: escapedKey } },
            { villageId: { $in: villageRows.map((village) => village._id) } },
          ],
        }
      : {}),
  };
  const sortFields = {
    name: "name",
    providerType: "providerType",
    village: "villageRow.nameEn",
    owner: "ownerRow.name",
    status: "status",
    createdAt: "createdAt",
  } as const;
  const direction = query.direction === "asc" ? 1 : -1;
  type AdminProfileRow = {
    _id: unknown;
    providerType: ProviderType;
    name: string;
    status: "ACTIVE" | "INACTIVE";
    village: string;
    owner: string;
    ownerMobile: string;
    contacts: number;
    createdAt: Date;
  };
  const [result] = await ProviderProfile.aggregate<{
    profiles: AdminProfileRow[];
    total: { count: number }[];
  }>([
    { $match: filter },
    {
      $lookup: {
        from: Village.collection.name,
        localField: "villageId",
        foreignField: "_id",
        as: "villageRow",
      },
    },
    {
      $unwind: { path: "$villageRow", preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: User.collection.name,
        localField: "ownerId",
        foreignField: "_id",
        as: "ownerRow",
      },
    },
    { $unwind: { path: "$ownerRow", preserveNullAndEmptyArrays: true } },
    {
      $sort: {
        [sortFields[query.sort]]: direction,
        _id: 1,
      },
    },
    {
      $facet: {
        profiles: [
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
          {
            $project: {
              _id: 1,
              providerType: 1,
              name: 1,
              status: 1,
              village: { $ifNull: ["$villageRow.nameEn", ""] },
              owner: { $ifNull: ["$ownerRow.name", ""] },
              ownerMobile: { $ifNull: ["$ownerRow.mobile", ""] },
              contacts: { $size: { $ifNull: ["$contacts", []] } },
              createdAt: 1,
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    },
  ]);
  const rows = result?.profiles ?? [];
  const total = result?.total[0]?.count ?? 0;
  return {
    profiles: rows.map((row) => ({
      id: String(row._id),
      providerType: row.providerType,
      name: row.name,
      status: row.status,
      village: row.village,
      owner: row.owner,
      ownerMobile: row.ownerMobile,
      contacts: row.contacts,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page: query.page,
    limit: query.limit,
  };
}
export async function setProfileStatusForAdmin(
  actorId: string,
  profileId: string,
  status: "ACTIVE" | "INACTIVE",
) {
  await connectDb();
  const row = await ProviderProfile.findById(profileId);
  if (!row)
    throw new AppError(404, "PROFILE_UNAVAILABLE", "Profile not found.");
  row.status = status;
  await row.save();
  await syncDirectoryEntry(row);
  await AuditLog.create({
    actorId,
    action: "PROVIDER_PROFILE_STATUS_CHANGED",
    targetId: row._id,
    targetName: row.name,
  });
  return { id: String(row._id), status: row.status };
}
export async function listClaimsForAdmin(
  query: z.infer<typeof adminClaimsQuerySchema>,
) {
  await connectDb();
  const rows = await ProviderClaim.find({ status: query.status })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const [profiles, claimants] = await Promise.all([
    ProviderProfile.find({ _id: { $in: rows.map((r) => r.profileId) } })
      .select("name providerType ownerId")
      .lean(),
    User.find({ _id: { $in: rows.map((r) => r.claimantId) } })
      .select("name mobile")
      .lean(),
  ]);
  const owners = await User.find({
    _id: { $in: profiles.map((p) => p.ownerId) },
  })
    .select("name mobile")
    .lean();
  return {
    claims: rows.map((row) => {
      const profile = profiles.find(
        (p) => String(p._id) === String(row.profileId),
      );
      const claimant = claimants.find(
        (c) => String(c._id) === String(row.claimantId),
      );
      const owner = owners.find(
        (o) => String(o._id) === String(profile?.ownerId),
      );
      return {
        id: String(row._id),
        status: row.status,
        note: row.note ?? "",
        profileId: String(row.profileId),
        profileName: profile?.name ?? "(removed)",
        providerType: profile?.providerType ?? "",
        claimant: claimant?.name ?? "",
        claimantMobile: claimant?.mobile ?? "",
        currentOwner: owner?.name ?? "",
        currentOwnerMobile: owner?.mobile ?? "",
        createdAt: (
          row as unknown as { createdAt: Date }
        ).createdAt.toISOString(),
      };
    }),
  };
}
// Approving hands the profile to the claimant; the former owner keeps their
// account but not the listing.
export async function resolveClaim(
  actorId: string,
  claimId: string,
  action: "approve" | "reject",
) {
  await connectDb();
  const claim = await ProviderClaim.findById(claimId);
  if (!claim || claim.status !== "PENDING")
    throw new AppError(
      404,
      "CLAIM_UNAVAILABLE",
      "This claim is already resolved.",
    );
  claim.status = action === "approve" ? "APPROVED" : "REJECTED";
  claim.resolvedAt = new Date();
  await claim.save();
  if (action === "approve") {
    const profile = await ProviderProfile.findById(claim.profileId);
    if (profile) {
      profile.ownerId = claim.claimantId;
      await profile.save();
      await Service.updateOne(
        { profileId: profile._id },
        { $set: { userId: claim.claimantId } },
      );
      await User.updateOne(
        { _id: claim.claimantId },
        { $addToSet: { roles: "service_provider" } },
      );
      await ProviderClaim.updateMany(
        { profileId: profile._id, status: "PENDING" },
        { $set: { status: "REJECTED", resolvedAt: new Date() } },
      );
    }
  }
  await AuditLog.create({
    actorId,
    action:
      action === "approve"
        ? "PROVIDER_CLAIM_APPROVED"
        : "PROVIDER_CLAIM_REJECTED",
    targetId: claim._id,
  });
  return { id: String(claim._id), status: claim.status };
}
