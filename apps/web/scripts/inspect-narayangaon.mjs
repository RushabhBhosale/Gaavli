import nextEnv from "@next/env";
import mongoose from "mongoose";
nextEnv.loadEnvConfig(process.cwd());
try {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: false,
    autoCreate: false,
  });
  const db = mongoose.connection.db;
  const villages = await db
    .collection("villages")
    .find({
      $or: [
        { nameEn: /narayan|narayang|narayango|narayanga/i },
        { nameMr: /नारायण/ },
      ],
    })
    .project({ nameEn: 1, nameMr: 1, taluka: 1, district: 1, isActive: 1 })
    .toArray();
  for (const village of villages) {
    const sellers = await db.collection("users").countDocuments({
      village: village._id,
      status: "active",
      roles: "seller",
    });
    const listings = await db
      .collection("listings")
      .countDocuments({ village: village._id });
    console.log(JSON.stringify({ ...village, sellers, listings }));
  }
  if (!villages.length) console.log("No matching village found.");
  console.log(
    JSON.stringify({
      categories: await db
        .collection("categories")
        .find({ status: "ACTIVE" })
        .project({ _id: 0, code: 1, name: 1 })
        .toArray(),
    }),
  );
  console.log(
    JSON.stringify({
      photoStorageConfigured: Boolean(process.env.LISTING_PHOTO_BASE_URL),
      database: mongoose.connection.name,
    }),
  );
} catch {
  console.error("Village inspection failed. Check database access.");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
