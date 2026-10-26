import "server-only";
import sharp from "sharp";
import { User } from "../models";
import { limitRequests } from "../repositories/mobile";
import { uploadPhotoKey } from "../providers/local-listing-photos";
import { listingPhotoStorage } from "./listing-photo-storage";
import { connectDb } from "../db/connect";
import { AppError } from "../utils/errors";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export async function uploadListingPhoto(
  userId: string,
  operation: string,
  file: Blob,
) {
  await connectDb();
  if (!file.size || file.size > MAX_PHOTO_BYTES)
    throw new AppError(413, "PHOTO_TOO_LARGE", "Choose a photo up to 5 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new AppError(422, "PHOTO_INVALID", "Choose JPEG, PNG or WebP.");
  await limitRequests("listing-photo", userId, 30, 3600000);
  let result: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, {
      limitInputPixels: 25000000,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format || "") ||
      (metadata.pages || 1) > 1
    )
      throw new Error("Invalid format");
    result = await image
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new AppError(
      422,
      "PHOTO_INVALID",
      "Choose a valid nonanimated JPEG, PNG or WebP.",
    );
  }
  if (!(await User.exists({ _id: userId, status: "active" })))
    throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
  const key = uploadPhotoKey(userId, operation);
  await listingPhotoStorage.store(key, userId, result);
  return { photoObjectKey: key, photoUrl: `/listing-photos/${key}` };
}
