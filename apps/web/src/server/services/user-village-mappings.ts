import "server-only";
import { Types } from "mongoose";
import { Village } from "../models";
import { UserVillageMapping } from "../models/user-village-mapping";
import { mobileVillageDto } from "../repositories/mobile";
import { connectDb } from "../db/connect";
import { AppError } from "../utils/errors";
import type { UserRecord } from "../models";

export const MAX_USER_MAPPED_VILLAGES = 10;
type VillageRow = Parameters<typeof mobileVillageDto>[0];

function homeVillageId(user: UserRecord) {
  if (!user.village)
    throw new AppError(
      422,
      "VILLAGE_REQUIRED",
      "Choose your village before adding another one.",
    );
  return String(user.village);
}

// The villages this user added next to their own village.
export async function listUserMappedVillages(user: UserRecord) {
  await connectDb();
  if (!user.village) return { villages: [] };
  const rows = await UserVillageMapping.find({
    userId: user._id,
    sourceVillageId: user.village,
  }).lean();
  const villages = await Village.find({
    _id: { $in: rows.map((row) => row.targetVillageId) },
    isActive: true,
  })
    .sort({ nameEn: 1 })
    .lean();
  return {
    villages: villages.map((row) =>
      mobileVillageDto(row as unknown as VillageRow),
    ),
  };
}

export async function addUserMappedVillage(
  user: UserRecord,
  targetVillageId: string,
) {
  await connectDb();
  const source = homeVillageId(user);
  if (targetVillageId === source)
    throw new AppError(
      422,
      "VILLAGE_UNAVAILABLE",
      "Choose a village other than your own.",
    );
  if (!(await Village.exists({ _id: targetVillageId, isActive: true })))
    throw new AppError(422, "VILLAGE_UNAVAILABLE", "Select an active village.");
  const existing = await UserVillageMapping.countDocuments({
    userId: user._id,
    sourceVillageId: source,
  });
  const already = await UserVillageMapping.exists({
    userId: user._id,
    sourceVillageId: source,
    targetVillageId,
  });
  if (!already && existing >= MAX_USER_MAPPED_VILLAGES)
    throw new AppError(
      422,
      "MAPPED_VILLAGE_LIMIT",
      "You can add up to 10 villages. Remove one first.",
    );
  await UserVillageMapping.updateOne(
    { userId: user._id, sourceVillageId: source, targetVillageId },
    { $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  return listUserMappedVillages(user);
}

export async function removeUserMappedVillage(
  user: UserRecord,
  targetVillageId: string,
) {
  await connectDb();
  await UserVillageMapping.deleteMany({
    userId: user._id,
    sourceVillageId: homeVillageId(user),
    targetVillageId: new Types.ObjectId(targetVillageId),
  });
  return listUserMappedVillages(user);
}
