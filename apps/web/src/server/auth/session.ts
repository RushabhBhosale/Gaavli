import "server-only";
import { cookies } from "next/headers";
import { connectDb } from "../db/connect";
import { Admin, AdminSession } from "../models";
import { COOKIE, verifyToken } from "./token";
import { AppError } from "../utils/errors";
import type { AdminDto } from "@/lib/contracts";
export async function currentAdmin(): Promise<AdminDto | null> {
  const payload = await verifyToken((await cookies()).get(COOKIE)?.value);
  if (!payload) return null;
  await connectDb();
  const session = await AdminSession.exists({
    _id: payload.sessionId,
    admin: payload.adminId,
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  const admin = await Admin.findOne({
    _id: payload.adminId,
    role: "super_admin",
    status: "active",
  }).lean();
  return admin
    ? { id: String(admin._id), name: admin.name, role: "super_admin" }
    : null;
}
export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin)
    throw new AppError(401, "AUTH_REQUIRED", "Please sign in to continue.");
  return admin;
}
