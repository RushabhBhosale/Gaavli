import "server-only";
import bcrypt from "bcryptjs";
import { connectDb } from "../db/connect";
import { Admin, AdminSession, AuditLog } from "../models";
import { signToken, verifyToken } from "../auth/token";
import { AppError } from "../utils/errors";
import type { z } from "zod";
import type { loginSchema } from "@/schemas";
const invalid = () =>
  new AppError(
    401,
    "INVALID_CREDENTIALS",
    "Unable to sign in. Check your credentials or try again later.",
  );
// Equal bcrypt work for unknown identifiers; no plaintext credential is stored here.
const dummyHash = bcrypt.hashSync("gaavli-dummy-credential", 12);
export async function login(input: z.infer<typeof loginSchema>) {
  await connectDb();
  const admin = await Admin.findOne(
    input.identifier.includes("@")
      ? { email: input.identifier }
      : { mobile: input.identifier },
  ).select("+passwordHash");
  const matches = await bcrypt.compare(
    input.password,
    admin?.passwordHash || dummyHash,
  );
  if (
    !admin ||
    admin.status !== "active" ||
    admin.role !== "super_admin" ||
    (admin.lockUntil && admin.lockUntil > new Date())
  )
    throw invalid();
  if (!matches) {
    // Pipeline update makes the fifth concurrent failed attempt lock the account atomically.
    const failed = await Admin.findOneAndUpdate(
      { _id: admin._id },
      [
        {
          $set: {
            failedLoginAttempts: {
              $add: [
                {
                  $cond: [
                    {
                      $lte: [
                        { $ifNull: ["$lockUntil", new Date(0)] },
                        new Date(),
                      ],
                    },
                    {
                      $cond: [
                        { $ne: [{ $ifNull: ["$lockUntil", null] }, null] },
                        0,
                        "$failedLoginAttempts",
                      ],
                    },
                    "$failedLoginAttempts",
                  ],
                },
                1,
              ],
            },
          },
        },
        {
          $set: {
            lockUntil: {
              $cond: [
                { $gte: ["$failedLoginAttempts", 5] },
                new Date(Date.now() + 15 * 60 * 1000),
                null,
              ],
            },
          },
        },
      ],
      { new: true },
    );
    if (failed?.failedLoginAttempts === 5)
      await AuditLog.create({
        actorId: admin._id,
        action: "admin.locked",
        targetId: admin._id,
      });
    throw invalid();
  }
  const unlocked = await Admin.findOneAndUpdate(
    {
      _id: admin._id,
      status: "active",
      $or: [{ lockUntil: null }, { lockUntil: { $lte: new Date() } }],
    },
    {
      $set: {
        failedLoginAttempts: 0,
        lockUntil: null,
        lastLoginAt: new Date(),
      },
    },
  );
  if (!unlocked) throw invalid();
  const seconds = (input.remember ? 30 : 1) * 86400;
  const session = await AdminSession.create({
    admin: admin._id,
    expiresAt: new Date(Date.now() + seconds * 1000),
  });
  await AuditLog.create({
    actorId: admin._id,
    action: "admin.login",
    targetId: admin._id,
  });
  return {
    token: await signToken(String(admin._id), String(session._id), seconds),
    seconds,
    admin: {
      id: String(admin._id),
      name: admin.name,
      role: "super_admin" as const,
    },
  };
}
export async function logout(token?: string) {
  const payload = await verifyToken(token);
  if (payload) {
    await connectDb();
    await AdminSession.deleteOne({
      _id: payload.sessionId,
      admin: payload.adminId,
    });
    await AuditLog.create({
      actorId: payload.adminId,
      action: "admin.logout",
      targetId: payload.adminId,
    });
  }
}
