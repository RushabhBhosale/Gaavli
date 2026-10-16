import "server-only";
import { Types } from "mongoose";
import type { z } from "zod";
import { connectDb } from "../db/connect";
import {
  User,
  Village,
  VillageCoordinator,
  AuditLog,
  Notification,
  type UserRecord,
} from "../models";
import { mergeUserRoles, coordinatorRoleChange } from "@/lib/user-roles";
import { findUsers, userDto } from "../repositories/users";
import { AppError } from "../utils/errors";
import type {
  userSchema,
  editUserSchema,
  usersQuerySchema,
  statusUpdateSchema,
} from "@/schemas";
export async function listUsers(query: z.infer<typeof usersQuerySchema>) {
  await connectDb();
  const filter = {
    ...(query.role ? { roles: query.role } : {}),
    ...(query.village ? { village: new Types.ObjectId(query.village) } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          $or: [
            {
              name: {
                $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                $options: "i",
              },
            },
            {
              mobile: {
                $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              },
            },
          ],
        }
      : {}),
  };
  return findUsers(filter, query.page, query.limit);
}
export async function counts() {
  await connectDb();
  const [all, seller, buyer, coordinator] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ roles: "seller" }),
    User.countDocuments({ roles: "buyer" }),
    User.countDocuments({ roles: "coordinator" }),
  ]);
  return { all, seller, buyer, coordinator };
}
export async function villages() {
  await connectDb();
  return (
    await Village.find({ isActive: true }).sort({ nameEn: 1 }).lean()
  ).map((v) => ({ id: String(v._id), name: v.nameEn }));
}
export async function saveUser(
  actorId: string,
  input: z.infer<typeof userSchema> | z.infer<typeof editUserSchema>,
  id?: string,
) {
  await connectDb();
  const village = await Village.findOne({
    _id: input.village,
    isActive: true,
  }).lean();
  if (!village)
    throw new AppError(422, "VALIDATION_ERROR", "Select an active village.");
  const fields = {
    name: input.name,
    mobile: input.mobile,
    roles: mergeUserRoles(input.roles),
    village: village._id,
    status: input.status,
  };
  // Transaction couples sensitive mutations to their audit record. Atlas supports transactions.
  return User.db.transaction(async (session) => {
    const villageLock = await Village.updateOne(
      { _id: village._id, isActive: true },
      { $inc: { __v: 1 } },
      { session },
    );
    if (!villageLock.matchedCount)
      throw new AppError(422, "VALIDATION_ERROR", "Select an active village.");
    let user;
    let previousRoles: string[] = [];
    if (id && "version" in input) {
      // Only the authenticated Super Admin routes can manage coordinator roles.
      const existing = await User.findById(id).session(session);
      if (!existing) throw new AppError(404, "NOT_FOUND", "User not found.");
      previousRoles = existing.roles;
      fields.roles = mergeUserRoles(input.roles, existing.roles);
      user = await User.findOneAndUpdate(
        { _id: id, __v: input.version },
        { $set: fields, $inc: { __v: 1 } },
        { new: true, runValidators: true, session },
      );
      if (!user)
        throw new AppError(
          409,
          "STALE_VERSION",
          "This user changed. Refresh and try again.",
        );
    } else {
      [user] = await User.create([fields], { session });
    }
    await AuditLog.create(
      [
        {
          actorId,
          action: id ? "user.updated" : "user.created",
          targetId: user._id,
        },
      ],
      { session },
    );
    const coordinatorChange = coordinatorRoleChange(previousRoles, user.roles);
    if (coordinatorChange) {
      if (coordinatorChange === "removed") {
        const assignments = await VillageCoordinator.find({ userId: user._id })
          .session(session)
          .lean();
        for (const assignment of assignments) {
          await Village.updateOne(
            { _id: assignment.villageId },
            { $inc: { __v: 1 } },
            { session },
          );
          await AuditLog.create(
            [
              {
                actorId,
                action: "village.coordinator.removed",
                targetId: assignment.villageId,
              },
            ],
            { session },
          );
        }
        await VillageCoordinator.deleteMany({ userId: user._id }).session(
          session,
        );
      }
      const granted = coordinatorChange === "granted";
      await AuditLog.create(
        [
          {
            actorId,
            action: `user.coordinator.${coordinatorChange}`,
            targetId: user._id,
          },
        ],
        { session },
      );
      // Persist an in-app notice atomically; no paid channel is sent without consent.
      await Notification.create(
        [
          {
            userId: user._id,
            type: granted ? "COORDINATOR_GRANTED" : "COORDINATOR_REMOVED",
            title: granted ? "समन्वयक भूमिका मिळाली" : "समन्वयक भूमिका काढली",
            body: granted
              ? "प्रशासकाने तुम्हाला समन्वयक भूमिका दिली आहे. तुमचे विद्यमान खाते आणि इतिहास कायम आहेत."
              : "प्रशासकाने तुमची समन्वयक भूमिका काढली आहे. तुमचा खरेदीदार आणि विक्रेता इतिहास कायम आहे.",
          },
        ],
        { session },
      );
    }
    return userDto(user.toObject() as UserRecord, village);
  });
}
export async function changeStatus(
  actorId: string,
  id: string,
  input: z.infer<typeof statusUpdateSchema>,
) {
  await connectDb();
  return User.db.transaction(async (session) => {
    const user = await User.findOneAndUpdate(
      { _id: id, __v: input.version },
      { $set: { status: input.status }, $inc: { __v: 1 } },
      { new: true, runValidators: true, session },
    );
    if (!user) {
      if (!(await User.exists({ _id: id }).session(session)))
        throw new AppError(404, "NOT_FOUND", "User not found.");
      throw new AppError(
        409,
        "STALE_VERSION",
        "This user changed. Refresh and try again.",
      );
    }
    await AuditLog.create(
      [{ actorId, action: `user.${input.status}`, targetId: user._id }],
      { session },
    );
    return { id: String(user._id), status: user.status, version: user.__v };
  });
}
