import nextEnv from "@next/env";
import mongoose from "mongoose";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

nextEnv.loadEnvConfig(process.cwd());
const base = "http://localhost:3000";
const marker = `Category-${randomUUID().slice(0, 8)}`;
let cookie;
let categoryId;
const listingIds = [];
async function request(
  path,
  method = "GET",
  body,
  expected = 200,
  origin = base,
) {
  const response = await fetch(`${base}/api/v1/admin/categories${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { Origin: origin, "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  assert.equal(response.status, expected, payload.error?.message);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return payload.data;
}
try {
  await request("", "GET", undefined, 401);
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      remember: false,
    }),
  });
  assert.equal(login.status, 200, "Admin login failed");
  cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const initial = await request("");
  assert.ok(
    initial.categories.some((category) => category.code === "PERISHABLE"),
  );
  assert.ok(
    initial.categories.every(
      (category) => !Object.hasOwn(category, "sendTime"),
    ),
  );
  const input = {
    code: marker.toUpperCase().replaceAll("-", "_"),
    name: marker,
    nameMr: "चाचणी श्रेणी",
    defaultShelfLife: "2 days",
    notifyMode: "daily_digest",
  };
  await request("", "POST", input, 403, "https://example.invalid");
  await request("", "POST", { ...input, notifyMode: "instant" }, 422);
  await request("?sort=%24where", "GET", undefined, 422);
  const created = await request("", "POST", input, 201);
  categoryId = created.id;
  await request("", "POST", input, 409);
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  assert.ok(
    await db.collection("auditlogs").findOne({
      targetId: new mongoose.Types.ObjectId(categoryId),
      action: "CATEGORY_CREATED",
    }),
  );
  for (const fields of [
    {
      category: input.code,
      status: "active",
      expiresAt: new Date(Date.now() + 86400000),
    },
    { categoryId: new mongoose.Types.ObjectId(categoryId), status: "active" },
    {
      categoryId,
      status: "active",
      expiresAt: new Date(Date.now() + 86400000),
    },
    { category: input.code, status: "expired" },
    { category: input.code, status: "active", expiresAt: new Date(0) },
  ]) {
    const { insertedId } = await db
      .collection("listings")
      .insertOne({ ...fields, productName: marker });
    listingIds.push(insertedId);
  }
  const found = await request(
    `?search=${marker}&sort=activeListings&direction=desc&page=100&limit=1`,
  );
  assert.equal(found.total, 1);
  assert.equal(found.page, 1);
  assert.equal(found.categories[0].id, categoryId);
  assert.equal(found.categories[0].activeListings, 3);
  assert.equal(
    (await request("?search=%5B")).total,
    0,
    "Regex search must be literal",
  );
  console.log(
    "PASS: category authorization, CSRF, validation, defaults, create, duplicate handling, audit, literal search, pagination and active-listing counts.",
  );
} finally {
  if (mongoose.connection.db) {
    await mongoose.connection.db
      .collection("listings")
      .deleteMany({ _id: { $in: listingIds } });
    if (categoryId)
      await mongoose.connection.db
        .collection("categories")
        .deleteOne({ _id: new mongoose.Types.ObjectId(categoryId) });
    console.log(
      "Temporary category/listing fixtures removed; audit evidence retained.",
    );
  }
  if (cookie)
    await fetch(`${base}/api/auth/logout`, {
      method: "POST",
      headers: { Origin: base, Cookie: cookie },
    });
  await mongoose.disconnect();
}
