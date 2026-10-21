import "server-only";
import type { ClientSession } from "mongoose";
import { Village } from "../models";
import { VillageConnection } from "../models/coordinator";

export async function discoveryVillageIds(
  villageId: string,
  session: ClientSession | null = null,
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
  ];
  const villages = await Village.find({ _id: { $in: ids }, isActive: true })
    .select("_id")
    .session(session)
    .lean();
  return villages.map((village) => String(village._id));
}
