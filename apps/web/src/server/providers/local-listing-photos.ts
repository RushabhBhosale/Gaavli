import "server-only";
import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  link,
  unlink,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { AppError } from "../utils/errors";

export const uploadedPhotoKeyPattern =
  /^listings\/[a-f0-9]{24}\/uploads\/[a-f0-9]{64}\.webp$/;
function filename(key: string) {
  if (process.env.NODE_ENV !== "development")
    throw new AppError(
      503,
      "PHOTO_STORAGE_UNAVAILABLE",
      "Photo storage is not configured.",
    );
  if (!uploadedPhotoKeyPattern.test(key))
    throw new AppError(404, "PHOTO_UNAVAILABLE", "Photo unavailable.");
  // Only validated fixed-depth keys can select a path inside this provider root.
  return path.join(
    process.env.LISTING_PHOTO_UPLOAD_DIR ||
      path.join(process.cwd(), ".local", "listing-photos"),
    ...key.split("/"),
  );
}
export function uploadPhotoKey(userId: string, operation: string) {
  const id = createHash("sha256")
    .update(`${userId}:${operation}`)
    .digest("hex");
  return `listings/${userId}/uploads/${id}.webp`;
}
export async function storeLocalListingPhoto(key: string, bytes: Buffer) {
  const destination = filename(key);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes, { flag: "wx" });
  try {
    // Publish a complete immutable file atomically. Never overwrite an old key.
    try {
      await link(temporary, destination);
    } catch (error) {
      if (!(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "EEXIST"
      ))
        throw error;
      const existing = await readFile(destination);
      if (!existing.equals(bytes))
        throw new AppError(
          409,
          "PHOTO_OPERATION_CONFLICT",
          "Use a new operation for another photo.",
        );
    }
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}
export async function readLocalListingPhoto(key: string) {
  try {
    return await readFile(filename(key));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(404, "PHOTO_UNAVAILABLE", "Photo unavailable.");
  }
}
export async function requireLocalListingPhoto(key: string) {
  if (!uploadedPhotoKeyPattern.test(key))
    throw new AppError(422, "PHOTO_FORBIDDEN", "Invalid upload reference.");
  try {
    await stat(filename(key));
  } catch {
    throw new AppError(
      422,
      "PHOTO_UNAVAILABLE",
      "Upload the photo before publishing.",
    );
  }
}
