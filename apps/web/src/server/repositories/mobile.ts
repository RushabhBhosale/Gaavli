import "server-only";
import type { z } from "zod";
import type { villageSearchSchema } from "@gaavli/validation";
import { Village, User, type UserRecord } from "../models";
import { MobileRateLimit } from "../models/mobile-auth";
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
export async function mobileUserDto(user: UserRecord) {
  const village = user.village
    ? await Village.findOne({ _id: user.village, isActive: true }).lean()
    : null;
  return {
    isSeller: user.roles.includes("seller"),
    id: String(user._id),
    name: user.name,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    language:
      user.preferredLanguage === "en" ? ("en" as const) : ("mr" as const),
    village: village ? mobileVillageDto(village) : null,
  };
}
export async function searchMobileVillages(
  query: z.infer<typeof villageSearchSchema>,
) {
  const search = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = {
    isActive: true,
    ...(search
      ? {
          $or: ["nameEn", "nameMr", "taluka", "pinCode"].map((field) => ({
            [field]: { $regex: search, $options: "i" },
          })),
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
          maxDistance: 50_000,
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
export async function saveMobileVillage(userId: string, villageId: string) {
  return User.db.transaction(async (session) => {
    // Same write lock as admin membership/deactivation/deletion writers.
    const village = await Village.findOneAndUpdate(
      { _id: villageId, isActive: true },
      { $inc: { __v: 1 } },
      { new: true, session },
    );
    if (!village)
      throw new AppError(
        422,
        "VILLAGE_UNAVAILABLE",
        "Select an active village.",
      );
    const user = await User.findOneAndUpdate(
      { _id: userId, status: "active" },
      { $set: { village: villageId }, $inc: { __v: 1 } },
      { new: true, session },
    );
    if (!user) throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
    return {
      isSeller: user.roles.includes("seller"),
      id: String(user._id),
      name: user.name,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      language:
        user.preferredLanguage === "en" ? ("en" as const) : ("mr" as const),
      village: mobileVillageDto(village),
    };
  });
}
