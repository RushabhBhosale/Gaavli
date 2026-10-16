import nextEnv from "@next/env";
import mongoose from "mongoose";
nextEnv.loadEnvConfig(process.cwd());
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const collection = mongoose.connection.db.collection("villagecoordinators");
  const conflicts = await collection
    .aggregate([
      { $group: { _id: "$villageId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();
  if (conflicts.length)
    throw new Error(
      `${conflicts.length} villages have multiple coordinators. Select one per village before applying the unique index; no assignments were removed.`,
    );
  await collection.createIndex({ villageId: 1 }, { unique: true });
  console.log(
    "One-coordinator-per-village unique index: PASS. Existing assignments preserved.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
