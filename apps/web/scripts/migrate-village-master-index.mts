import nextEnv from "@next/env";
import mongoose from "mongoose";
import { connectDb } from "../src/server/db/connect";

// One-off and idempotent. Mongoose autoIndex creates indexes declared on the
// Village schema, and this app never calls syncIndexes, so startup will not
// drop the old unique nameEn_1 index. This script does that drop itself.
const partialFilter = { villageMasterId: { $type: "objectId" } };

async function main() {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB database connection is unavailable");
  const villages = db.collection("villages");
  const before = await villages.indexes();
  const nameIndex = before.find((index) => index.name === "nameEn_1");
  const droppedUniqueNameEn = Boolean(nameIndex?.unique);
  if (droppedUniqueNameEn) await villages.dropIndex("nameEn_1");
  await villages.createIndex(
    { villageMasterId: 1 },
    {
      name: "uq_village_master",
      unique: true,
      partialFilterExpression: partialFilter,
    },
  );
  await villages.createIndex({ nameEn: 1, _id: 1 }, { name: "name_en_id" });
  await db.collection("villageMasters").createIndex(
    { talukaId: 1, nameEn: 1 },
    { name: "taluka_name_en" },
  );
  const after = await villages.indexes();
  console.log(
    JSON.stringify(
      {
        droppedUniqueNameEn,
        villageIndexes: after.map((index) => index.name),
      },
      null,
      2,
    ),
  );
}

nextEnv.loadEnvConfig(process.cwd());
try {
  await main();
} finally {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
