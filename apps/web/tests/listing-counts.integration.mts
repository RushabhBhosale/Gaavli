// Counts use real routes and only a fresh isolated test database.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import { mobileListingPageSchema } from "@gaavli/validation";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
const databaseName = `gaavli_counts_test_${randomBytes(8).toString("hex")}`;
const uri = new URL(process.env.MONGODB_URI);
uri.pathname = `/${databaseName}`;
process.env.MONGODB_URI = uri.toString();
process.env.NODE_ENV = "development";
mongoose.set("maxTimeMS", 15000);
const { connectMobileDb } = await import("../src/server/db/mobile");
const { User, Village, Listing, Category } =
  await import("../src/server/models");
const { MobileSession } = await import("../src/server/models/mobile-auth");
const { hashToken } = await import("../src/server/auth/mobile-policy");
const { GET } = await import("../src/app/api/v1/listings/route");
try {
  await connectMobileDb();
  await Promise.all([Listing.init(), Category.init()]);
  const [village, other] = await Village.create([
    { nameEn: "Selected", nameMr: "निवडलेले" },
    { nameEn: "Other", nameMr: "दुसरे" },
  ]);
  const [viewer, seller] = await User.create([
    { name: "Viewer", village: village._id },
    { name: "Seller", village: village._id, roles: ["buyer", "seller"] },
  ]);
  const token = randomBytes(32).toString("hex");
  await MobileSession.create({
    user: viewer._id,
    provider: "test",
    accessHash: hashToken(token),
    refreshHash: hashToken(randomBytes(32).toString("hex")),
    accessExpiresAt: new Date(Date.now() + 900000),
    expiresAt: new Date(Date.now() + 86400000),
  });
  await Category.create({
    code: "PERISHABLE",
    name: "Fresh",
    nameMr: "ताजे",
    defaultShelfLife: "2 days",
    notifyMode: "daily_digest",
    status: "ACTIVE",
  });
  const base = {
    productName: "Tomato",
    productGroup: "vegetables",
    village: village._id,
    seller: seller._id,
    category: "PERISHABLE",
    quantity: 10,
    unit: "kg",
    status: "active",
    expiresAt: new Date(Date.now() + 86400000),
  };
  await Listing.create([
    ...Array.from({ length: 3 }, () => ({ ...base })),
    ...Array.from({ length: 2 }, () => ({
      ...base,
      productName: "Apple",
      productGroup: "fruits",
    })),
    { ...base, productName: "Milk", productGroup: "dairy" },
    { ...base, seller: viewer._id },
    ...Array.from({ length: 7 }, () => ({ ...base, village: other._id })),
    { ...base, expiresAt: new Date(0) },
    { ...base, status: "sold_out", quantity: 0 },
  ]);
  async function page(
    params: Record<string, string> = {},
    signedIn = false,
    source = String(village._id),
  ) {
    const query = new URLSearchParams({
      sourceVillageId: source,
      villageId: source,
      includeProductGroupCounts: "true",
      limit: "1",
      ...params,
    });
    const response = await GET(
      new Request(`http://localhost/api/v1/listings?${query}`, {
        headers: signedIn ? { Authorization: `Bearer ${token}` } : {},
      }),
    );
    assert.equal(response.status, 200);
    return mobileListingPageSchema.parse((await response.json()).data);
  }
  const count = (data: Awaited<ReturnType<typeof page>>, group: string) =>
    data.productGroupCounts?.find((row) => row.productGroup === group)?.count;
  const guest = await page({ productGroup: "vegetables" });
  assert.equal(guest.listings.length, 1);
  assert.equal(guest.total, 4);
  assert.equal(count(guest, "vegetables"), 4);
  assert.equal(count(guest, "fruits"), 2);
  assert.equal(count(guest, "dairy"), 1);
  assert.equal(count(guest, "grain"), 0);
  const signedIn = await page({ productGroup: "fruits", page: "2" }, true);
  assert.equal(
    count(signedIn, "vegetables"),
    3,
    "own listings excluded before counts",
  );
  assert.equal(
    count(signedIn, "fruits"),
    2,
    "counts are independent of page/category selection",
  );
  assert.equal(signedIn.listings.length, 1);
  const search = await page({ search: "Apple", productGroup: "vegetables" });
  assert.equal(search.total, 0);
  assert.equal(count(search, "fruits"), 2);
  assert.equal(count(search, "vegetables"), 0);
  const changed = await page({}, false, String(other._id));
  assert.equal(count(changed, "vegetables"), 7);
  assert.equal(count(changed, "fruits"), 0);
  const legacy = await GET(
    new Request(
      `http://localhost/api/v1/listings?sourceVillageId=${village._id}`,
    ),
  );
  assert.equal(legacy.status, 200);
  const legacyData = (await legacy.json()).data;
  assert.equal(
    "productGroupCounts" in legacyData,
    false,
    "existing clients keep their strict response contract",
  );
  mobileListingPageSchema.omit({ productGroupCounts: true }).parse(legacyData);
  console.log(
    "PASS: exact-village category totals, cross-category counts, pagination, search, zero counts, expiry/stock, own-offer exclusion and legacy response compatibility.",
  );
} finally {
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === databaseName &&
    /^gaavli_counts_test_[a-f0-9]{16}$/.test(databaseName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
