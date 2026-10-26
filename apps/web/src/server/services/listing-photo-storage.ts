import "server-only";
import type { ClientSession } from "mongoose";
import { ListingPhoto } from "../models/listing-photo";
import { Listing, User } from "../models";
import { AppError } from "../utils/errors";
import { limitRequests } from "../repositories/mobile";
import {
  listingPhotoBucket,
  readGridFsListingPhoto,
  storeGridFsListingPhoto,
} from "../providers/gridfs-listing-photos";
import {
  readLocalListingPhoto,
  requireLocalListingPhoto,
  uploadedPhotoKeyPattern,
} from "../providers/local-listing-photos";

// Provider boundary: upload and read can later use S3 without changing mobile DTOs.
export const listingPhotoStorage = {
  store: storeGridFsListingPhoto,
  async read(key: string) {
    if (!uploadedPhotoKeyPattern.test(key))
      throw new AppError(404, "PHOTO_UNAVAILABLE", "Photo unavailable.");
    const bytes = await readGridFsListingPhoto(key);
    if (bytes) return bytes;
    // Read-only compatibility. New uploads never write to the filesystem.
    return readLocalListingPhoto(key);
  },
  async require(key: string, owner: string, session: ClientSession) {
    const row = await ListingPhoto.findOneAndUpdate(
      { _id: key, owner, state: "ready" },
      { $inc: { revision: 1 } },
      { new: true, session },
    );
    if (row) return row.fileId;
    if (await ListingPhoto.exists({ _id: key }).session(session))
      throw new AppError(422, "PHOTO_UNAVAILABLE", "Select the photo again.");
    await requireLocalListingPhoto(key);
    return null;
  },
};

// Explicit physical deletion is allowed only after all listings release the key.
// The shared manifest lock serializes deletion with create/replace transactions.
export async function deleteUnusedListingPhoto(owner: string, imageId: string) {
  const bucket = await listingPhotoBucket();
  await ListingPhoto.init();
  await limitRequests("listing-photo-delete", owner, 30, 3600000);
  const photo = await User.db.transaction(async (session) => {
    if (!(await User.exists({ _id: owner, status: "active" }).session(session)))
      throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
    const row = await ListingPhoto.findOneAndUpdate(
      { owner, fileId: imageId },
      { $inc: { revision: 1 } },
      { new: true, session },
    );
    if (!row)
      throw new AppError(404, "PHOTO_UNAVAILABLE", "Photo unavailable.");
    if (await Listing.exists({ photoObjectKey: row._id }).session(session))
      throw new AppError(
        409,
        "PHOTO_IN_USE",
        "Remove the photo from its products first.",
      );
    if (row.state !== "deleted") {
      row.state = "deleting";
      await row.save({ session });
    }
    return row.toObject();
  });
  if (photo.state !== "deleted") {
    // Delete is retryable if the process stops between GridFS and manifest writes.
    const exists = await bucket.find({ _id: photo.fileId }).hasNext();
    if (exists) await bucket.delete(photo.fileId);
    await ListingPhoto.updateOne(
      { _id: photo._id, state: "deleting" },
      { $set: { state: "deleted" } },
    );
  }
  return { deleted: true };
}
