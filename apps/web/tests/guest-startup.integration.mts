// Only the fresh, randomly named test database is written or dropped.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import mongoose from "mongoose";

nextEnv.loadEnvConfig(process.cwd());
const originalUri = process.env.MONGODB_URI;
if (!originalUri)
  throw new Error("MONGODB_URI is required for guest integration.");
const databaseName = `gaavli_guest_test_${randomBytes(8).toString("hex")}`;
const uri = new URL(originalUri);
uri.pathname = `/${databaseName}`;
process.env.MONGODB_URI = uri.toString();
Object.assign(process.env, { NODE_ENV: "development" });

const { GET: getVillages } = await import("../src/app/api/v1/villages/route");
const { Village } = await import("../src/server/models");
const request = () => new Request("http://localhost/api/v1/villages");
try {
  // No sign-in, seed, or explicit connect may precede the first guest request.
  assert.equal(mongoose.connection.readyState, 0);
  const first = await getVillages(request());
  assert.equal(first.status, 200);
  assert.equal(mongoose.connection.readyState, 1);
  const empty = await first.json();
  assert.equal(empty.success, true);
  assert.deepEqual(empty.data.villages, []);
  assert.equal(empty.data.total, 0);

  const active = await Village.create({
    nameEn: "Guest startup village",
    nameMr: "गाव",
    taluka: "Test",
    district: "Test",
    isActive: true,
  });
  await Village.create({
    nameEn: "Inactive village",
    nameMr: "बंद गाव",
    taluka: "Test",
    district: "Test",
    isActive: false,
  });
  const populated = await getVillages(request());
  assert.equal(populated.status, 200);
  const page = await populated.json();
  assert.equal(page.data.total, 1);
  assert.equal(page.data.villages[0].id, String(active._id));

  const invalidBearer = await getVillages(
    new Request(request(), { headers: { Authorization: "Bearer invalid" } }),
  );
  assert.equal(invalidBearer.status, 401);
  assert.equal((await invalidBearer.json()).error.code, "AUTH_REQUIRED");
  console.log(
    "PASS: guest village cold startup, active-only reads and invalid bearer rejection.",
  );
} finally {
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === databaseName &&
    /^gaavli_guest_test_[a-f0-9]{16}$/.test(databaseName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
