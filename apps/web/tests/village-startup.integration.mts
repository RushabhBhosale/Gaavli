// Writes and cleanup are restricted to a fresh, randomly named test database.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import mongoose from "mongoose";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
const databaseName = `gaavli_village_test_${randomBytes(8).toString("hex")}`;
const uri = new URL(process.env.MONGODB_URI);
uri.pathname = `/${databaseName}`;
process.env.MONGODB_URI = uri.toString();
const client = new mongoose.mongo.MongoClient(uri.toString());

try {
  await client.connect();
  const villages = client.db(databaseName).collection("villages");
  // Reproduce imported data before Mongoose creates any indexes on cold start.
  const inserted = await villages.insertMany(
    ["Karjat", "Panvel"].map((taluka) => ({
      nameEn: "Morbe",
      nameMr: "मोरबे",
      district: "Raigad",
      taluka,
      isActive: true,
      location: { type: "Point", coordinates: [73.2, 18.9] },
    })),
  );
  const { GET } = await import("../src/app/api/v1/villages/route");
  assert.equal(mongoose.connection.readyState, 0);
  const response = await GET(
    new Request("http://localhost/api/v1/villages?search=Morbe"),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const page = await response.json();
  assert.equal(page.data.total, 2);
  assert.deepEqual(
    page.data.villages.map((v: { id: string }) => v.id).sort(),
    Object.values(inserted.insertedIds).map(String).sort(),
  );
  assert.deepEqual(
    page.data.villages.map((v: { taluka: string }) => v.taluka).sort(),
    ["Karjat", "Panvel"],
  );
  const nearby = await GET(
    new Request(
      "http://localhost/api/v1/villages?latitude=18.9&longitude=73.2",
    ),
  );
  assert.equal(nearby.status, 200, "the required geo index remains available");
  assert.equal((await nearby.json()).data.total, 2);
  const invalidBearer = await GET(
    new Request("http://localhost/api/v1/villages", {
      headers: { Authorization: "Bearer invalid" },
    }),
  );
  assert.equal(invalidBearer.status, 401);
  const userIndexes = await client
    .db(databaseName)
    .collection("users")
    .indexes();
  for (const field of ["mobile", "email"])
    assert.ok(
      userIndexes.some((index) => index.key[field] === 1 && index.unique),
    );
  console.log(
    "PASS: cold startup with same-name villages, distinct IDs, geo search and auth/identity protection.",
  );
} finally {
  await mongoose.disconnect();
  if (/^gaavli_village_test_[a-f0-9]{16}$/.test(databaseName))
    await client.db(databaseName).dropDatabase();
  await client.close();
}
