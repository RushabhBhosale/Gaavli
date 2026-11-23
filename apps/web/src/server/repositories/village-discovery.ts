import "server-only";
import type { ClientSession } from "mongoose";
import { Village } from "../models";
import { VillageConnection } from "../models/coordinator";

export const DEFAULT_DISCOVERY_RADIUS_KM = 50;
const EARTH_RADIUS_KM = 6378.1;
const NEARBY_LIMIT = 5000;

// Active villages within radiusKm of this one (by stored coordinates), never itself.
async function nearbyVillageIds(
  villageId: string,
  radiusKm: number,
  session: ClientSession | null,
) {
  if (radiusKm <= 0) return [];
  const home = await Village.findById(villageId)
    .select("location")
    .session(session)
    .lean();
  const center = home?.location?.coordinates;
  if (!center || center.length !== 2) return [];
  const rows = await Village.find({
    isActive: true,
    _id: { $ne: villageId },
    location: {
      $geoWithin: { $centerSphere: [center, radiusKm / EARTH_RADIUS_KM] },
    },
  })
    .select("_id")
    .limit(NEARBY_LIMIT)
    .session(session)
    .lean();
  return rows.map((row) => String(row._id));
}

export async function discoveryVillageIds(
  villageId: string,
  session: ClientSession | null = null,
  radiusKm: number = DEFAULT_DISCOVERY_RADIUS_KM,
) {
  if (
    !(await Village.exists({ _id: villageId, isActive: true }).session(session))
  )
    return [];
  const rows = await VillageConnection.find({
    active: true,
    $or: [{ sourceVillageId: villageId }, { targetVillageId: villageId }],
  })
    .session(session)
    .lean();
  const ids = [
    villageId,
    ...rows.map((row) =>
      String(row.sourceVillageId) === villageId
        ? row.targetVillageId
        : row.sourceVillageId,
    ),
    ...(await nearbyVillageIds(villageId, radiusKm, session)),
  ];
  const villages = await Village.find({ _id: { $in: ids }, isActive: true })
    .select("_id")
    .session(session)
    .lean();
  return villages.map((village) => String(village._id));
}

// Active villages within radiusKm of this one, nearest first, with distance in
// metres. Empty when the village has no stored coordinates.
export async function nearbyVillages(villageId: string, radiusKm: number) {
  if (radiusKm <= 0) return [];
  const home = await Village.findById(villageId).select("location").lean();
  const center = home?.location;
  if (!center?.coordinates?.length) return [];
  return Village.aggregate<Record<string, unknown>>([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: center.coordinates as [number, number],
        },
        key: "location",
        distanceField: "distance",
        spherical: true,
        maxDistance: radiusKm * 1000,
        query: { isActive: true, _id: { $ne: home?._id } },
      },
    },
    { $limit: 300 },
  ]);
}
