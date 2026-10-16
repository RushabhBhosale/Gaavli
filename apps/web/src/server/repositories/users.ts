import "server-only";
import { User, Village, type UserRecord } from "../models";
import type { FilterQuery } from "mongoose";
import type { UserDto } from "@/lib/contracts";
export function userDto(
  user: UserRecord,
  village?: { _id: unknown; nameEn: string } | null,
): UserDto {
  return {
    id: String(user._id),
    name: user.name,
    mobile: user.mobile || "",
    roles: user.roles,
    status: user.status as UserDto["status"],
    village: village ? { id: String(village._id), name: village.nameEn } : null,
    createdAt: user.createdAt.toISOString(),
    version: user.__v || 0,
  };
}
export async function findUsers(
  filter: FilterQuery<UserRecord>,
  page: number,
  limit: number,
) {
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  const villages = await Village.find({
    _id: { $in: users.map((u) => u.village) },
  }).lean();
  return {
    users: users.map((u) =>
      userDto(
        u as UserRecord,
        villages.find((v) => String(v._id) === String(u.village)),
      ),
    ),
    total,
    page,
    limit,
  };
}
