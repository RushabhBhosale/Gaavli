import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { connectDb } from "../src/server/db/connect";
import { User, Village, Listing } from "../src/server/models";
loadEnvConfig(process.cwd());
const names = [
  "Ganesh Patil",
  "Sunita More",
  "Ramesh Jadhav",
  "Priya Shinde",
  "Amit Kale",
  "Suresh Pawar",
  "Neha Deshmukh",
  "Vijay Sawant",
  "Madhavi Naik",
  "Sachin Kadam",
  "Anjali Joshi",
  "Santosh Chavan",
  "Kavita Patil",
];
const villages = [
  ["Morbe", "मोरबे"],
  ["Kashale", "कशाळे"],
  ["Chowk", "चौक"],
  ["Neral", "नेरळ"],
  ["Karjat", "कर्जत"],
  ["Khandas", "खांडस"],
  ["Kalamb", "कळंब"],
  ["Dahivali", "दहिवली"],
];
function sampleId(kind: string, index: number) {
  return new mongoose.Types.ObjectId(
    createHash("sha256")
      .update(`gaavli-development-sample-v1:${kind}:${index}`)
      .digest("hex")
      .slice(0, 24),
  );
}
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Sample data is development-only");
  await connectDb();
  await Promise.all([User.init(), Village.init(), Listing.init()]);
  const now = new Date();
  const villageDocs = villages.map(
    ([nameEn, nameMr], i) =>
      new Village({
        _id: sampleId("village", i),
        nameEn,
        nameMr,
        taluka: "Karjat",
        district: "Raigad",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }),
  );
  const userDocs = Array.from(
    { length: 13 },
    (_, i) =>
      new User({
        _id: sampleId("user", i),
        name: names[i],
        mobile: String(9000000000 + i),
        roles:
          i >= 10
            ? ["buyer", "seller", "coordinator"]
            : i % 3
              ? ["buyer", "seller"]
              : ["buyer"],
        village: villageDocs[i % 8]._id,
        status: i === 8 ? "blocked" : i === 9 ? "pending" : "active",
        createdAt: new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth() - (i % 6),
            Math.min(1 + (i % 7), now.getUTCDate()),
          ),
        ),
        updatedAt: now,
        __v: 0,
      }),
  );
  const sellers = userDocs
    .slice(0, 10)
    .filter((user) => user.roles.includes("seller"));
  const listingDocs = Array.from(
    { length: 10 },
    (_, i) =>
      new Listing({
        _id: sampleId("listing", i),
        productName: [
          "Rice",
          "Tomatoes",
          "Mangoes",
          "Cashews",
          "Spinach",
          "Coconuts",
        ][i % 6],
        category: "Produce",
        quantity: 10 + i,
        unit: "kg",
        price: 30 + i * 2,
        seller: sellers[i % sellers.length]._id,
        village: sellers[i % sellers.length].village,
        status:
          i < 6
            ? "active"
            : i < 8
              ? "expired"
              : i === 8
                ? "reported"
                : "pending",
        expiresAt: new Date(now.getTime() + (i < 6 ? 14 : -7) * 86400000),
        createdAt: new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth() - (i % 6),
            Math.min(1 + (i % 7), now.getUTCDate()),
          ),
        ),
        updatedAt: now,
      }),
  );
  // Validate everything before writing. Stable IDs and insert-only upserts allow
  // interrupted standalone runs to resume without overwriting or duplicating data.
  await Promise.all(
    [...villageDocs, ...userDocs, ...listingDocs].map((doc) => doc.validate()),
  );
  async function insertSamples(session?: mongoose.ClientSession) {
    if (
      (await User.exists({
        _id: { $nin: userDocs.map((doc) => doc._id) },
      }).session(session ?? null)) ||
      (await Village.exists({
        _id: { $nin: villageDocs.map((doc) => doc._id) },
      }).session(session ?? null)) ||
      (await Listing.exists({
        _id: { $nin: listingDocs.map((doc) => doc._id) },
      }).session(session ?? null))
    ) {
      console.log(
        "Database already has marketplace data; sample seed skipped.",
      );
      return;
    }
    const options = { upsert: true, timestamps: false, session };
    for (const doc of villageDocs)
      await Village.updateOne(
        { _id: doc._id },
        { $setOnInsert: doc.toObject() },
        options,
      );
    for (const doc of userDocs)
      await User.updateOne(
        { _id: doc._id },
        { $setOnInsert: doc.toObject() },
        options,
      );
    for (const doc of listingDocs)
      await Listing.updateOne(
        { _id: doc._id },
        { $setOnInsert: doc.toObject() },
        options,
      );
    const counts = await Promise.all([
      Village.countDocuments({
        _id: { $in: villageDocs.map((doc) => doc._id) },
      }).session(session ?? null),
      User.countDocuments({
        _id: { $in: userDocs.map((doc) => doc._id) },
      }).session(session ?? null),
      Listing.countDocuments({
        _id: { $in: listingDocs.map((doc) => doc._id) },
      }).session(session ?? null),
      User.countDocuments({
        _id: { $in: userDocs.slice(10).map((doc) => doc._id) },
        roles: { $all: ["buyer", "seller", "coordinator"] },
      }).session(session ?? null),
    ]);
    if (
      counts[0] !== 8 ||
      counts[1] !== 13 ||
      counts[2] !== 10 ||
      counts[3] !== 3
    )
      throw new Error("Sample record verification failed");
    console.log(
      "Sample data ready: 8 villages, 13 users (including 3 coordinators), and 10 listings. Existing sample records preserved.",
    );
  }
  const topology = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (topology.setName || topology.msg === "isdbgrid") {
    await User.db.transaction((session) => insertSamples(session));
  } else {
    console.log(
      "Standalone MongoDB detected; using restart-safe sample upserts.",
    );
    await insertSamples();
  }
}
main()
  .catch((error: unknown) => {
    console.error(
      "Sample seed failed. Check the development database connection and access.",
    );
    if (error instanceof Error) {
      console.error(`Error type: ${error.name}`);
      if ("code" in error && typeof error.code === "number") {
        console.error(`Database error code: ${error.code}`);
        if (error.code === 20)
          console.error("Transactions require a MongoDB replica set or Atlas.");
        if (error.code === 18)
          console.error("Database authentication failed. Check MONGODB_URI.");
      }
    }
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
