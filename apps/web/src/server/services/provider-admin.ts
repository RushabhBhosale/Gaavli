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
  const filter = {
    ...(query.providerType ? { providerType: query.providerType } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(key
      ? { nameKey: { $regex: key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") } }
      : {}),
  };
  const [rows, total] = await Promise.all([
    ProviderProfile.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    ProviderProfile.countDocuments(filter),
  ]);
  const [owners, villages] = await Promise.all([
    User.find({ _id: { $in: rows.map((row) => row.ownerId) } })
      .select("name mobile")
      .lean(),
    Village.find({ _id: { $in: rows.map((row) => row.villageId) } })
      .select("nameEn")
      .lean(),
  ]);
  return {
    profiles: rows.map((row) => ({
      id: String(row._id),
      providerType: row.providerType,
      name: row.name,
      status: row.status,
      village:
        villages.find((v) => String(v._id) === String(row.villageId))?.nameEn ??
        "",
      owner:
        owners.find((o) => String(o._id) === String(row.ownerId))?.name ?? "",
      ownerMobile:
        owners.find((o) => String(o._id) === String(row.ownerId))?.mobile ?? "",
      contacts: row.contacts.length,
      createdAt: (
        row as unknown as { createdAt: Date }
      ).createdAt.toISOString(),
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
