import "server-only";
import { User, Village, VillageCoordinator, type UserRecord } from "../models";
import type { FilterQuery } from "mongoose";
import type { UserDto } from "@/lib/contracts";
export function userDto(
  user: UserRecord,
  village?: { _id: unknown; nameEn: string } | null,
  coordinatorVillages?: { id: string; name: string }[],
): UserDto {
  return {
    id: String(user._id),
    name: user.name,
    mobile: user.mobile || "",
    roles: user.roles,
    status: user.status as UserDto["status"],
    village: village ? { id: String(village._id), name: village.nameEn } : null,
    ...(coordinatorVillages ? { coordinatorVillages } : {}),
    createdAt: user.createdAt.toISOString(),
    version: user.__v || 0,
  };
}
async function coordinatorVillagesFor(userIds: unknown[]) {
  const map = new Map<string, { id: string; name: string }[]>();
  if (!userIds.length) return map;
  const assignments = await VillageCoordinator.find({
    userId: { $in: userIds },
  })
    .sort({ createdAt: 1, _id: 1 })
    .lean();
  const villages = await Village.find({
    _id: { $in: assignments.map((row) => row.villageId) },
  })
    .select("nameEn")
    .lean();
  const names = new Map(
    villages.map((village) => [String(village._id), village.nameEn]),
  );
  for (const row of assignments) {
    const name = names.get(String(row.villageId));
    if (!name) continue;
    const key = String(row.userId);
    const list = map.get(key) ?? [];
    list.push({ id: String(row.villageId), name });
    map.set(key, list);
  }
  return map;
}
export async function findUsers(
  filter: FilterQuery<UserRecord>,
  page: number,
  limit: number,
  sort: "name" | "mobile" | "status" | "createdAt",
  direction: "asc" | "desc",
) {
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ [sort]: direction === "asc" ? 1 : -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  const [villages, coordinatorVillages] = await Promise.all([
    Village.find({
      _id: { $in: users.map((u) => u.village) },
    }).lean(),
    coordinatorVillagesFor(users.map((u) => u._id)),
  ]);
  return {
    users: users.map((u) =>
      userDto(
        u as UserRecord,
        villages.find((v) => String(v._id) === String(u.village)),
        coordinatorVillages.get(String(u._id)) ?? [],
      ),
    ),
    total,
    page,
    limit,
  };
}
export async function findUsersForExport(
  filter: FilterQuery<UserRecord>,
  limit: number,
) {
  const total = await User.countDocuments(filter);
  if (total > limit) return { users: [], total };
  const users = await User.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();
  const villages = await Village.find({
    _id: { $in: users.map((user) => user.village) },
  }).lean();
  return {
    users: users.map((user) =>
      userDto(
        user as UserRecord,
        villages.find(
          (village) => String(village._id) === String(user.village),
        ),
      ),
    ),
    total,
  };
}
