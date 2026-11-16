import "server-only";
import { Types, type ClientSession } from "mongoose";
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
import { findUsers, findUsersForExport, userDto } from "../repositories/users";
import { AppError } from "../utils/errors";
import type {
  userSchema,
  editUserSchema,
  usersFilterSchema,
  usersQuerySchema,
  statusUpdateSchema,
} from "@/schemas";
import {
  readUserCsv,
  USER_CSV_BYTE_LIMIT,
  usersToCsv,
  userInputFromCsvRow,
} from "@/lib/user-csv";

export const USER_EXPORT_LIMIT = 5000;

function userFilter(query: z.infer<typeof usersFilterSchema>) {
  return {
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
}
export async function listUsers(query: z.infer<typeof usersQuerySchema>) {
  await connectDb();
  return findUsers(userFilter(query), query.page, query.limit);
}
export async function exportUsersCsv(query: z.infer<typeof usersFilterSchema>) {
  await connectDb();
  const page = await findUsersForExport(userFilter(query), USER_EXPORT_LIMIT);
  if (page.total > USER_EXPORT_LIMIT)
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "Narrow the filters. An export can include at most 5,000 users.",
    );
  return usersToCsv(page.users);
}
function importFailure(error: unknown) {
  if (error instanceof AppError) return error.message;
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  )
    return "This mobile number or email already exists.";
  return "Unable to add this user.";
}
export async function importUsers(actorId: string, text: string) {
  if (text.length > USER_CSV_BYTE_LIMIT)
    throw new AppError(413, "VALIDATION_ERROR", "CSV file is too large.");
  const read = readUserCsv(text);
  if ("error" in read) throw new AppError(422, "VALIDATION_ERROR", read.error);
  await connectDb();
  const villages = await Village.find({ isActive: true })
    .select("nameEn")
    .lean();
  const byName = new Map<string, string | null>();
  for (const village of villages) {
    const key = village.nameEn.trim().toLowerCase();
    if (byName.has(key)) byName.set(key, null);
    else byName.set(key, String(village._id));
  }
  const failed: { line: number; message: string }[] = [];
  const seen = new Set<string>();
  let created = 0;
  for (const row of read.rows) {
    const villageId = byName.get(row.village.trim().toLowerCase());
    if (row.village && villageId === null) {
      failed.push({
        line: row.line,
        message: "More than one active village uses this name.",
      });
      continue;
    }
    if (row.mobile && seen.has(row.mobile)) {
      failed.push({
        line: row.line,
        message: "This mobile number is repeated in the file.",
      });
      continue;
    }
    if (row.mobile) seen.add(row.mobile);
    const input = userInputFromCsvRow(row, villageId || undefined);
    if (!input.ok) {
      failed.push({ line: row.line, message: input.message });
      continue;
    }
    try {
      await saveUser(actorId, input.data);
      created += 1;
    } catch (error) {
      failed.push({ line: row.line, message: importFailure(error) });
    }
  }
  return { created, failed };
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
function isDuplicateKey(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}
export async function villages() {
  await connectDb();
  return (
    await Village.find({ isActive: true }).sort({ nameEn: 1 }).lean()
  ).map((v) => ({ id: String(v._id), name: v.nameEn }));
}
async function syncCoordinatorVillage(
  session: ClientSession,
  actorId: string,
  userId: Types.ObjectId,
  village: { _id: Types.ObjectId; nameMr: string },
) {
  const assignments = await VillageCoordinator.find({ userId })
    .session(session)
    .sort({ createdAt: 1, _id: 1 });
  const occupant = await VillageCoordinator.findOne({
    villageId: village._id,
    userId: { $ne: userId },
  }).session(session);
  if (occupant)
    throw new AppError(
      409,
      "CONFLICT",
      "This village already has a coordinator.",
    );
  const current = assignments.find(
    (row) => String(row.villageId) === String(village._id),
  );
  const keep = current ?? assignments[0];
  if (!keep) {
    try {
      await VillageCoordinator.create([{ villageId: village._id, userId }], {
        session,
      });
    } catch (error) {
      if (isDuplicateKey(error))
        throw new AppError(
          409,
          "CONFLICT",
          "This village already has a coordinator.",
        );
      throw error;
    }
    await AuditLog.create(
      [
        {
          actorId,
          action: "village.coordinator.assigned",
          targetId: village._id,
        },
      ],
      { session },
    );
    await Notification.create(
      [
        {
          userId,
          type: "VILLAGE_ASSIGNED",
          title: "गावाची जबाबदारी मिळाली",
          body: `${village.nameMr} गावासाठी तुमची समन्वयक म्हणून नियुक्ती झाली आहे.`,
        },
      ],
      { session },
    );
    return;
  }
  if (String(keep.villageId) !== String(village._id)) {
    const previousVillageId = keep.villageId;
    const previousVillage = await Village.findById(previousVillageId)
      .select("nameMr")
      .session(session)
      .lean();
    keep.villageId = village._id;
    try {
      await keep.save({ session });
    } catch (error) {
      if (isDuplicateKey(error))
        throw new AppError(
          409,
          "CONFLICT",
          "This village already has a coordinator.",
        );
      throw error;
    }
    await Village.updateOne(
      { _id: previousVillageId },
      { $inc: { __v: 1 } },
      { session },
    );
    await AuditLog.create(
      [
        {
          actorId,
          action: "village.coordinator.removed",
          targetId: previousVillageId,
        },
        {
          actorId,
          action: "village.coordinator.assigned",
          targetId: village._id,
        },
      ],
      { session },
    );
    await Notification.create(
      [
        {
          userId,
          type: "VILLAGE_UNASSIGNED",
          title: "गावाची जबाबदारी काढली",
          body: `${previousVillage?.nameMr || "गाव"} गावासाठी तुमची समन्वयक नियुक्ती काढली आहे. तुमचे खाते आणि इतिहास कायम आहेत.`,
        },
        {
          userId,
          type: "VILLAGE_ASSIGNED",
          title: "गावाची जबाबदारी मिळाली",
          body: `${village.nameMr} गावासाठी तुमची समन्वयक म्हणून नियुक्ती झाली आहे.`,
        },
      ],
      { session },
    );
  }
  for (const extra of assignments) {
    if (String(extra._id) === String(keep._id)) continue;
    const extraVillage = await Village.findById(extra.villageId)
      .select("nameMr")
      .session(session)
      .lean();
    await extra.deleteOne({ session });
    await Village.updateOne(
      { _id: extra.villageId },
      { $inc: { __v: 1 } },
      { session },
    );
    await AuditLog.create(
      [
        {
          actorId,
          action: "village.coordinator.removed",
          targetId: extra.villageId,
        },
      ],
      { session },
    );
    await Notification.create(
      [
        {
          userId,
          type: "VILLAGE_UNASSIGNED",
          title: "गावाची जबाबदारी काढली",
          body: `${extraVillage?.nameMr || "गाव"} गावासाठी तुमची समन्वयक नियुक्ती काढली आहे. तुमचे खाते आणि इतिहास कायम आहेत.`,
        },
      ],
      { session },
    );
  }
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
    if (user.roles.includes("coordinator"))
      await syncCoordinatorVillage(session, actorId, user._id, {
        _id: village._id,
        nameMr: village.nameMr,
      });
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
