import "server-only";
import mongoose from "mongoose";
import { createHash } from "node:crypto";
import { finished } from "node:stream/promises";
import { connectDb } from "../db/connect";
import { ListingPhoto } from "../models/listing-photo";
import { AppError } from "../utils/errors";

export async function listingPhotoBucket() {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db)
    throw new AppError(
      503,
      "PHOTO_STORAGE_UNAVAILABLE",
      "Photo storage unavailable.",
    );
  return new mongoose.mongo.GridFSBucket(db, { bucketName: "listingPhotos" });
}

export async function storeGridFsListingPhoto(
  key: string,
  owner: string,
  bytes: Buffer,
) {
  const bucket = await listingPhotoBucket();
  await ListingPhoto.init();
  const digest = createHash("sha256").update(bytes).digest("hex");
  const existing = await ListingPhoto.findById(key).lean();
  function check(row: NonNullable<typeof existing>) {
    if (String(row.owner) !== owner || row.digest !== digest)
      throw new AppError(
        409,
        "PHOTO_OPERATION_CONFLICT",
        "Use a new operation for another photo.",
      );
    if (row.state !== "ready")
      throw new AppError(422, "PHOTO_UNAVAILABLE", "Select the photo again.");
    return row.fileId;
  }
  if (existing) return check(existing);

  // Each concurrent attempt writes its own file. Only one immutable key is
  // published, so a duplicate stream can never corrupt the winning chunks.
  const stream = bucket.openUploadStream(key, {
    metadata: { owner, digest, contentType: "image/webp" },
  });
  const completion = finished(stream);
  stream.end(bytes);
  try {
    await completion;
  } catch (error) {
    await stream.abort().catch(() => undefined);
    throw error;
  }
  try {
    const row = await ListingPhoto.findOneAndUpdate(
      { _id: key },
      {
        $setOnInsert: {
          owner,
          fileId: stream.id,
          digest,
          state: "ready",
          revision: 0,
        },
      },
      { upsert: true, new: true, runValidators: true },
    ).lean();
    if (!row) throw new Error("Photo publication failed");
    if (!row.fileId.equals(stream.id)) await bucket.delete(stream.id);
    return check(row);
  } catch (error) {
    // Never delete a published file after an ambiguous database/network result.
    // Unpublished files from interrupted requests can be audited independently.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      const winner = await ListingPhoto.findById(key).lean();
      if (winner && !winner.fileId.equals(stream.id)) {
        await bucket.delete(stream.id);
        return check(winner);
      }
    }
    throw error;
  }
}

export async function readGridFsListingPhoto(key: string) {
  const bucket = await listingPhotoBucket();
  const photo = await ListingPhoto.findById(key).lean();
  if (!photo) return null;
  if (photo.state !== "ready")
    throw new AppError(404, "PHOTO_REMOVED", "Photo unavailable.");
  const chunks: Buffer[] = [];
  for await (const chunk of bucket.openDownloadStream(photo.fileId))
    chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
