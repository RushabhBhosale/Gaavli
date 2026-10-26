// Copy legacy development uploads to the configured Atlas DB. No file deletion.
// Dry run by default. Run from apps/web with --apply to publish the copies.
import nextEnv from "@next/env";
import mongoose from "mongoose";
process.env.NODE_ENV = "development";
nextEnv.loadEnvConfig(process.cwd(), true);
const apply = process.argv.includes("--apply");
const { connectDb } = await import("../src/server/db/connect");
const { Listing } = await import("../src/server/models");
const { ListingPhoto } = await import("../src/server/models/listing-photo");
const { uploadedPhotoKeyPattern, readLocalListingPhoto } =
  await import("../src/server/providers/local-listing-photos");
const { storeGridFsListingPhoto } =
  await import("../src/server/providers/gridfs-listing-photos");

try {
  await connectDb();
  const keys = await Listing.distinct("photoObjectKey", {
    photoObjectKey: { $type: "string" },
  });
  let copied = 0,
    missing = 0,
    existing = 0,
    available = 0;
  for (const key of keys) {
    if (!uploadedPhotoKeyPattern.test(key)) continue;
    let record = await ListingPhoto.findById(key).lean();
    if (!record) {
      let bytes: Buffer;
      try {
        bytes = await readLocalListingPhoto(key);
      } catch {
        missing++;
        continue;
      }
      available++;
      if (!apply) continue;
      await storeGridFsListingPhoto(key, key.split("/")[1], bytes);
      record = await ListingPhoto.findById(key).lean();
      copied++;
    } else existing++;
    if (apply && record?.state === "ready")
      await Listing.updateMany(
        { photoObjectKey: key },
        { $set: { photoImageId: record.fileId } },
      );
  }
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      available,
      copied,
      existing,
      missing,
      originalsDeleted: 0,
    }),
  );
  if (missing) process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
