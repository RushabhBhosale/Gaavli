import "server-only";
import { Types } from "mongoose";
import type { z } from "zod";
import {
  mobileLanguageSchema,
  type villageSearchSchema,
} from "@gaavli/validation";
import { Village, User, VillageCoordinator, type UserRecord } from "../models";
import { MobileRateLimit } from "../models/mobile-auth";
import { discoveryVillageIds } from "./village-discovery";
import { hashToken } from "../auth/mobile-policy";
import { AppError } from "../utils/errors";

export async function limitRequests(
  scope: string,
  identity: string,
  limit: number,
  periodMs: number,
) {
  const bucket = Math.floor(Date.now() / periodMs);
  const key = hashToken(`${scope}:${identity}:${bucket}`);
  let record;
  try {
    record = await MobileRateLimit.findOneAndUpdate(
      { key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((bucket + 2) * periodMs) },
      },
      { upsert: true, new: true },
    );
  } catch (error) {
    if (!(
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ))
      throw error;
    record = await MobileRateLimit.findOneAndUpdate(
      { key },
      { $inc: { count: 1 } },
      { new: true },
    );
  }
  if (!record || record.count > limit)
    throw new AppError(
      429,
      "RATE_LIMITED",
      "Too many requests. Try again later.",
    );
}

type VillageRow = {
  _id: unknown;
  nameEn: string;
  nameMr: string;
  taluka?: string | null;
  district?: string | null;
  pinCode?: string | null;
  distance?: number;
};
export function mobileVillageDto(v: VillageRow) {
  return {
    id: String(v._id),
    name: v.nameEn,
    nameMr: v.nameMr,
    taluka: v.taluka || "",
    district: v.district || "",
    pinCode: v.pinCode || null,
    ...(v.distance === undefined
      ? {}
      : { distanceKm: Math.round(v.distance / 100) / 10 }),
  };
}
// "Riya More" -> Riya / More; a single word is a first name only; a number
// (the placeholder used before a name was known) is not a name.
export function legacyNameParts(name?: string | null, mobile?: string | null) {
  const full = (name ?? "").trim();
  if (!full || /^[+\d\s-]+$/.test(full) || full === mobile) return null;
  const words = full.split(/\s+/);
  return {
    firstName: words.slice(0, -1).join(" ") || words[0],
    lastName: words.length > 1 ? words[words.length - 1] : "",
  };
}
export async function mobileUserDto(user: UserRecord) {
  const assignments =
    user.roles.includes("coordinator") && user.status === "active"
      ? await VillageCoordinator.find({ userId: user._id }).lean()
      : [];
  const coordinatorVillages = await Village.find({
    _id: { $in: assignments.map((row) => row.villageId) },
    isActive: true,
  })
    .sort({ nameEn: 1, _id: 1 })
    .lean();
  const village = user.village
    ? await Village.findOne({ _id: user.village, isActive: true }).lean()
    : null;
  return {
    isCoordinator:
      user.roles.includes("coordinator") && user.status === "active",
    coordinatorVillages: coordinatorVillages.map(mobileVillageDto),
    isSeller: user.roles.includes("seller"),
    id: String(user._id),
    name: user.name,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    language: mobileLanguageSchema.catch("mr").parse(user.preferredLanguage),
    village: village ? mobileVillageDto(village) : null,
  };
}
export async function searchMobileVillages(
  query: z.infer<typeof villageSearchSchema>,
  excludedVillageIds: string[] = [],
  areaFilter: {
    district?: string;
    taluka?: string;
    excludeTaluka?: string;
    districtFilter?: string;
    talukaFilter?: string;
  } = {},
) {
  const search = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const districtFilter = areaFilter.districtFilter;
  const talukaFilter = areaFilter.talukaFilter;
  const filter = {
    isActive: true,
    ...(areaFilter.district ? { district: areaFilter.district } : {}),
    ...(districtFilter ? { district: districtFilter } : {}),
    ...(areaFilter.taluka
      ? { taluka: areaFilter.taluka }
      : areaFilter.excludeTaluka
        ? { taluka: { $nin: [areaFilter.excludeTaluka, "", null] } }
        : talukaFilter
          ? { taluka: talukaFilter }
          : {}),
    ...(excludedVillageIds.length
      ? {
          _id: { $nin: excludedVillageIds.map((id) => new Types.ObjectId(id)) },
        }
      : {}),
    ...(search
      ? {
          $or: ["nameEn", "nameMr", "taluka", "district", "pinCode"].map(
            (field) => ({
              [field]: { $regex: search, $options: "i" },
            }),
          ),
        }
      : {}),
  };
  if (query.latitude !== undefined && query.longitude !== undefined) {
    const [result] = await Village.aggregate<{
      villages: VillageRow[];
      count: { total: number }[];
    }>([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [query.longitude, query.latitude],
          },
          key: "location",
          distanceField: "distance",
          spherical: true,
          maxDistance: (query.maxDistanceKm ?? 50) * 1000,
          query: filter,
        },
      },
      { $sort: { distance: 1, _id: 1 } },
      {
        $facet: {
          villages: [
            { $skip: (query.page - 1) * query.limit },
            { $limit: query.limit },
          ],
          count: [{ $count: "total" }],
        },
      },
    ]);
    return {
      villages: (result?.villages || []).map(mobileVillageDto),
      total: result?.count[0]?.total || 0,
      page: query.page,
      limit: query.limit,
    };
  }
  const [villages, total] = await Promise.all([
    Village.find(filter)
      .sort({ nameEn: 1, _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Village.countDocuments(filter),
  ]);
  return {
    villages: villages.map(mobileVillageDto),
    total,
    page: query.page,
    limit: query.limit,
  };
}
export async function saveMobileVillage(
  userId: string,
  input: { villageId: string; firstName?: string; lastName?: string },
) {
  return User.db.transaction(async (session) => {
    // Same write lock as admin membership/deactivation/deletion writers.
    const village = await Village.findOneAndUpdate(
      { _id: input.villageId, isActive: true },
      { $inc: { __v: 1 } },
      { new: true, session },
    );
    if (!village)
      throw new AppError(
        422,
        "VILLAGE_UNAVAILABLE",
        "Select an active village.",
      );
    const current = await User.findOne({
      _id: userId,
      status: "active",
    }).session(session);
    if (!current) throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
    // Older accounts have a display name but no first/last name: keep it,
    // and fill the two parts from it. A bare mobile number is not a name.
    const legacy =
      !current.firstName && !input.firstName
        ? legacyNameParts(current.name, current.mobile)
        : null;
    if (!current.firstName && !input.firstName && !legacy)
      throw new AppError(422, "VALIDATION_ERROR", "Enter your name.");
    const names = legacy
      ? {
          firstName: legacy.firstName,
          lastName: legacy.lastName,
          name: current.name,
        }
      : input.firstName
        ? {
            firstName: input.firstName,
            lastName: input.lastName || "",
            name: `${input.firstName} ${input.lastName || ""}`.trim(),
          }
        : {};
    const user = await User.findOneAndUpdate(
      { _id: userId, status: "active" },
      { $set: { village: input.villageId, ...names }, $inc: { __v: 1 } },
      { new: true, session },
    );
    if (!user) throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
    return mobileUserDto(user.toObject() as UserRecord);
  });
}

// Villages mapped with this one (never the village itself), by name.
export async function mappedVillages(villageId: string) {
  const ids = (await discoveryVillageIds(villageId)).filter(
    (id) => id !== villageId,
  );
  if (!ids.length) return [];
  const rows = await Village.find({ _id: { $in: ids }, isActive: true })
    .sort({ nameEn: 1 })
    .lean();
  return rows.map((row) => mobileVillageDto(row as unknown as VillageRow));
}
