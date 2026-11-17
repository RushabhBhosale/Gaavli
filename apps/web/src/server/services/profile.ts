import "server-only";
import type { z } from "zod";
import type { updateMobileProfileSchema } from "@gaavli/validation";
import { connectDb } from "../db/connect";
import {
  findOwnProfile,
  updateOwnProfile,
  attachOwnProfilePhoto,
} from "../repositories/profile";
import { ListingPhoto } from "../models/listing-photo";
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
  if (!key.startsWith(`listings/${userId}/uploads/`))
    throw new AppError(403, "PHOTO_FORBIDDEN", "Use your own uploaded photo.");
  // Uploads live in the same store as listing photos; the key must be a ready
  // upload by this person.
  if (!(await ListingPhoto.exists({ _id: key, owner: userId, state: "ready" })))
    throw new AppError(422, "PHOTO_UNAVAILABLE", "Upload the photo again.");
  return attachOwnProfilePhoto(userId, key, version);
}
