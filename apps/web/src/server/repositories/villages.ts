import "server-only";
import {
  Types,
  type ClientSession,
  type FilterQuery,
  type InferSchemaType,
} from "mongoose";
import { User, Village, VillageCoordinator } from "../models";
import { masterLinksForVillages } from "./geography";
import type { VillagesPage } from "@/lib/contracts";
export async function countVillageDependencies(
  id: string,
  session?: ClientSession,
) {
  const db = Village.db.db!;
  const refs = [new Types.ObjectId(id), id];
  const referenceFilter = {
    $or: ["village", "villageId", "home_village_id"].map((field) => ({
      [field]: { $in: refs },
    })),
  };
  const users = await db
    .collection("users")
    .countDocuments(referenceFilter, { session });
  const listings = await db
    .collection("listings")
    .countDocuments(referenceFilter, { session });
  const coordinators = await db
    .collection("villagecoordinators")
    .countDocuments({ villageId: { $in: refs } }, { session });
  let mappings = 0;
  for (const collection of [
    "villageRelationships",
    "village_proximity_default",
  ]) {
    mappings += await db.collection(collection).countDocuments(
      {
        $or: [
          "sourceVillageId",
          "targetVillageId",
          "village_id",
          "nearby_village_id",
        ].map((field) => ({ [field]: { $in: refs } })),
      },
      { session },
    );
  }
  let preferences = 0;
  for (const collection of [
    "userVillagePreferences",
    "userNearbyPreferences",
    "user_village_preference",
  ]) {
    preferences += await db.collection(collection).countDocuments(
      {
        $or: [
          "villageId",
          "village_id",
          "addedVillageIds",
          "removedVillageIds",
          "added",
          "removed",
          "added_villages",
          "removed_villages",
        ].map((field) => ({ [field]: { $in: refs } })),
      },
      { session },
    );
  }
  const services = await db
    .collection("services")
    .countDocuments(referenceFilter, { session });
  const subscriptions = await db
    .collection("notificationSubscriptions")
    .countDocuments(referenceFilter, { session });
  return {
    users,
    listings,
    coordinators,
    mappings,
    preferences,
    services,
    subscriptions,
  };
}

export async function findVillages(
  filter: FilterQuery<InferSchemaType<typeof Village.schema>>,
  requestedPage: number,
  limit: number,
  sort: "name" | "users" | "status",
  direction: "asc" | "desc",
): Promise<VillagesPage> {
  const [total, districts] = await Promise.all([
    Village.countDocuments(filter),
    Village.distinct("district"),
  ]);
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / limit)));
  const sortDirection = direction === "asc" ? 1 : -1;
  let villages;
  let usersByVillage: Map<string, number>;
  if (sort === "users") {
    const ordered = await Village.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      { $match: filter },
      {
        $lookup: {
          from: User.collection.name,
          localField: "_id",
          foreignField: "village",
          pipeline: [{ $count: "count" }],
          as: "userCounts",
        },
      },
      {
        $set: {
          userCount: {
            $ifNull: [{ $arrayElemAt: ["$userCounts.count", 0] }, 0],
          },
        },
      },
      { $sort: { userCount: sortDirection, _id: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: { _id: 1, count: "$userCount" } },
    ]);
    const records = await Village.find({
      _id: { $in: ordered.map((village) => village._id) },
    })
      .select(
        "nameEn nameMr taluka district pinCode isActive location __v villageMasterId districtId talukaId",
      )
      .lean();
    const recordsById = new Map(
      records.map((village) => [String(village._id), village]),
    );
    villages = ordered.flatMap((village) => {
      const record = recordsById.get(String(village._id));
      return record ? [record] : [];
    });
    usersByVillage = new Map(
      ordered.map((village) => [String(village._id), village.count]),
    );
  } else {
    const sortField = sort === "status" ? "isActive" : "nameEn";
    const primaryDirection =
      sort === "status" ? (direction === "asc" ? -1 : 1) : sortDirection;
    villages = await Village.find(filter)
      .select(
        "nameEn nameMr taluka district pinCode isActive location __v villageMasterId districtId talukaId",
      )
      .sort({ [sortField]: primaryDirection, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const counts = await User.aggregate<{ _id: unknown; count: number }>([
      { $match: { village: { $in: villages.map((village) => village._id) } } },
      { $group: { _id: "$village", count: { $sum: 1 } } },
    ]);
    usersByVillage = new Map(
      counts.map((entry) => [String(entry._id), entry.count]),
    );
  }
  const assignments = await VillageCoordinator.find({
    villageId: { $in: villages.map((v) => v._id) },
  }).lean();
  const coordinators = await User.find({
    _id: { $in: assignments.map((a) => a.userId) },
    roles: "coordinator",
  })
    .select("name")
    .lean();
  const masterLinks = await masterLinksForVillages(
    villages
      .filter((village) => !village.villageMasterId)
      .map((village) => ({
        id: String(village._id),
        name: village.nameEn,
        nameMr: village.nameMr,
        taluka: village.taluka || "",
        district: village.district || "",
      })),
  );
  return {
    villages: villages.map((village) => ({
      id: String(village._id),
      name: village.nameEn,
      nameMr: village.nameMr,
      taluka: village.taluka || "",
      district: village.district || "",
      pinCode: village.pinCode || null,
      users: usersByVillage.get(String(village._id)) ?? 0,
      status: village.isActive ? "active" : "inactive",
      latitude: village.location?.coordinates[1] ?? null,
      longitude: village.location?.coordinates[0] ?? null,
      villageMasterId: village.villageMasterId
        ? String(village.villageMasterId)
        : (masterLinks.get(String(village._id))?.villageMasterId ?? null),
      districtId: village.districtId
        ? String(village.districtId)
        : (masterLinks.get(String(village._id))?.districtId ?? null),
      talukaId: village.talukaId
        ? String(village.talukaId)
        : (masterLinks.get(String(village._id))?.talukaId ?? null),
      version: village.__v ?? 0,
      coordinators: assignments
        .filter((a) => String(a.villageId) === String(village._id))
        .flatMap((a) => {
          const user = coordinators.find(
            (u) => String(u._id) === String(a.userId),
          );
          return user
            ? [
                {
                  id: String(user._id),
                  name: user.name,
                  publicContactPhone: a.publicContactPhone ?? null,
                },
              ]
            : [];
        }),
      nearbyMapped: null,
    })),
    districts: districts
      .filter(
        (district): district is string =>
          typeof district === "string" && !!district.trim(),
      )
      .sort((a, b) => a.localeCompare(b)),
    total,
    page,
    limit,
  };
}
export async function findVillagesForExport(
  filter: FilterQuery<InferSchemaType<typeof Village.schema>>,
  limit: number,
) {
  const total = await Village.countDocuments(filter);
  if (total > limit) return { villages: [], total };
  const villages = await Village.find(filter)
    .select("nameEn nameMr taluka district pinCode location")
    .sort({ nameEn: 1, _id: 1 })
    .limit(limit)
    .lean();
  return {
    total,
    villages: villages.map((village) => ({
      name: village.nameEn,
      nameMr: village.nameMr,
      taluka: village.taluka || "",
      district: village.district || "",
      pinCode: village.pinCode || "",
      latitude:
        village.location?.coordinates[1] == null
          ? ""
          : String(village.location.coordinates[1]),
      longitude:
        village.location?.coordinates[0] == null
          ? ""
          : String(village.location.coordinates[0]),
    })),
  };
}
