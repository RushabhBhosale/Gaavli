import nextEnv from "@next/env";
import mongoose from "mongoose";
import { connectDb } from "../src/server/db/connect";

async function main() {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB database connection is unavailable");

  const collection = db.collection("villagecoordinators");
  const indexes = await collection.indexes();
  const villageOnlyUniqueIndexes = indexes.filter(
    (index) =>
      index.unique &&
      Object.keys(index.key ?? {}).length === 1 &&
      index.key?.villageId === 1,
  );
  for (const index of villageOnlyUniqueIndexes) {
    if (index.name) await collection.dropIndex(index.name);
  }

  await collection.createIndex(
    { villageId: 1, userId: 1 },
    { name: "villageId_1_userId_1", unique: true },
  );
  await collection.createIndex({ villageId: 1 }, { name: "villageId_1" });
  await collection.createIndex({ userId: 1 }, { name: "userId_1" });

  const after = await collection.indexes();
  console.log(
    JSON.stringify(
      {
        droppedUniqueVillageIndexes: villageOnlyUniqueIndexes.map(
          (index) => index.name,
        ),
        villageCoordinatorIndexes: after.map((index) => ({
          name: index.name,
          key: index.key,
          unique: index.unique ?? false,
        })),
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
