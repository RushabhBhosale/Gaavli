import "server-only";
import type { z } from "zod";
import type { updateMobileProfileSchema } from "@gaavli/validation";
import { connectDb } from "../db/connect";
import {
  findOwnProfile,
  updateOwnProfile,
  attachOwnProfilePhoto,
} from "../repositories/profile";
import { requireLocalListingPhoto } from "../providers/local-listing-photos";
import { AppError } from "../utils/errors";

export async function getMobileProfile(userId: string) {
  await connectDb();
  return findOwnProfile(userId);
}
export async function saveMobileProfile(
  userId: string,
  input: z.infer<typeof updateMobileProfileSchema>,
) {
  await connectDb();
  return updateOwnProfile(userId, input);
}
export async function saveProfilePhoto(
  userId: string,
  key: string,
  version: number,
) {
  await connectDb();
  if (process.env.NODE_ENV !== "development")
    throw new AppError(
      503,
      "PHOTO_STORAGE_UNAVAILABLE",
      "Configure a production photo provider.",
    );
  if (!key.startsWith(`listings/${userId}/uploads/`))
    throw new AppError(403, "PHOTO_FORBIDDEN", "Use your own uploaded photo.");
  await requireLocalListingPhoto(key);
  return attachOwnProfilePhoto(userId, key, version);
}
