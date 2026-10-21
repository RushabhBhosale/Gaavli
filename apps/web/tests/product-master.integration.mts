import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import {
  productMasterImportSchema,
  productMasterPageSchema,
} from "@gaavli/validation";

nextEnv.loadEnvConfig(process.cwd());
const databaseName = `gaavli_product_master_test_${randomBytes(8).toString("hex")}`;
const uri = new URL(process.env.MONGODB_URI || "");
uri.pathname = `/${databaseName}`;
process.env.MONGODB_URI = uri.toString();
Object.assign(process.env, {
  NODE_ENV: "development",
  OTP_PROVIDER: "test",
  OTP_TEST_CODE: "123456",
  MOBILE_AUTH_SECRET: randomBytes(32).toString("hex"),
});
const { connectMobileDb } = await import("../src/server/db/mobile");
const { User, Village, Category, Listing } =
  await import("../src/server/models");
const { ProductMaster } = await import("../src/server/models/product-master");
const { MobileSession } = await import("../src/server/models/mobile-auth");
const { hashToken } = await import("../src/server/auth/mobile-policy");
const { importMasterProducts } =
  await import("../src/server/repositories/product-master");
const masterRoute = await import("../src/app/api/v1/product-master/route");
const listings = await import("../src/app/api/v1/listings/route");
const detail = await import("../src/app/api/v1/listings/[id]/route");
const owner = await import("../src/app/api/v1/listings/mine/[id]/route");
const mine = await import("../src/app/api/v1/listings/mine/route");
const token = randomBytes(32).toString("hex");
const otherToken = randomBytes(32).toString("hex");
const request = (
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
  bearer: string | null = token,
) =>
  new Request(`http://localhost/api/v1${path}`, {
    method,
    headers: {
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const context = (id: string) => ({ params: Promise.resolve({ id }) });
async function check(response: Response, status = 200, code?: string) {
  const json = await response.json();
  assert.equal(response.status, status, JSON.stringify(json));
  assert.equal(response.headers.get("cache-control"), "no-store");
  if (code) assert.equal(json.error.code, code);
  return json.data;
}
try {
  await connectMobileDb();
  const village = await Village.create({
    nameEn: "Product village",
    nameMr: "उत्पादन गाव",
    isActive: true,
  });
  const [actor, other] = await User.create([
    {
      name: "Product Seller",
      mobile: "9876543210",
      village: village._id,
      status: "active",
      roles: ["buyer"],
    },
    {
      name: "Other Seller",
      mobile: "9876543211",
      village: village._id,
      status: "active",
      roles: ["buyer"],
    },
  ]);
  await MobileSession.create(
    [
      [actor, token],
      [other, otherToken],
    ].map(([user, bearer]) => ({
      user: (user as typeof actor)._id,
      provider: "test",
      accessHash: hashToken(bearer as string),
      refreshHash: hashToken(`${bearer}-refresh`),
      accessExpiresAt: new Date(Date.now() + 3600000),
      expiresAt: new Date(Date.now() + 86400000),
    })),
  );
  const [perishable] = await Category.create([
    {
      code: "PERISHABLE",
      name: "Perishable",
      nameMr: "नाशवंत",
      status: "ACTIVE",
      defaultShelfLife: "2 days",
      notifyMode: "daily_digest",
    },
    {
      code: "RECURRING_SUPPLY",
      name: "Recurring supply",
      nameMr: "नियमित पुरवठा",
      status: "ACTIVE",
      defaultShelfLife: "Standing",
      notifyMode: "change_only",
    },
  ]);
  const source = productMasterImportSchema.parse(
    JSON.parse(
      await readFile(
        new URL("../data/gaavli_product_master.json", import.meta.url),
        "utf8",
      ),
    ),
  );
  assert.equal(source.length, 151);
  assert.deepEqual(await importMasterProducts(source), {
    source: 151,
    inserted: 151,
    existing: 0,
  });
  const tomatoBefore = await ProductMaster.findOne({ code: "TOMATO" }).lean();
  assert.ok(tomatoBefore);
  assert.deepEqual(await importMasterProducts(source), {
    source: 151,
    inserted: 0,
    existing: 151,
  });
  assert.equal(
    String((await ProductMaster.findOne({ code: "TOMATO" }))?._id),
    String(tomatoBefore._id),
  );
  await assert.rejects(
    ProductMaster.create(source[0]),
    (error: unknown) =>
      !!error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000,
  );
  assert.equal(await ProductMaster.countDocuments(), 151);
  assert.equal(
    productMasterImportSchema.safeParse([
      { ...source[0], category: "PERISHABLE" },
    ]).success,
    false,
  );
  await assert.rejects(importMasterProducts([source[0], source[0]]));
  assert.equal(await Category.countDocuments(), 2);
  assert.equal(
    await ProductMaster.countDocuments({ category: { $exists: true } }),
    0,
  );
  await check(
    await masterRoute.GET(
      request("/product-master", "GET", undefined, undefined, null),
    ),
    401,
  );
  const all = productMasterPageSchema.parse(
    await check(await masterRoute.GET(request("/product-master"))),
  );
  assert.equal(all.products.length, 151);
  assert.ok(all.products.every((product) => product.status === "ACTIVE"));
  const english = await check(
    await masterRoute.GET(request("/product-master?search=tOmAtO")),
  );
  const marathi = await check(
    await masterRoute.GET(
      request(`/product-master?search=${encodeURIComponent("टोमॅटो")}`),
    ),
  );
  assert.equal(english.products[0].productId, marathi.products[0].productId);
  assert.equal(
    (await check(await masterRoute.GET(request("/product-master?search=%5B"))))
      .products.length,
    0,
  );
  await check(
    await masterRoute.GET(request("/product-master?status=INACTIVE")),
    422,
  );
  const tomato = all.products.find((product) => product.code === "TOMATO")!;
  const cauliflower = all.products.find(
    (product) => product.code === "CAULIFLOWER",
  )!;
  const input = {
    productId: tomato.productId,
    productName: "Forged name",
    productNameMr: "चुकीचे नाव",
    productGroup: "dairy",
    villageId: String(village._id),
    categoryId: String(perishable._id),
    unit: tomato.defaultUnit,
    quantity: 10,
    price: 20,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  const created = await check(
    await listings.POST(
      request("/listings", "POST", input, "product-master-create"),
    ),
    201,
  );
  assert.equal(created.productId, tomato.productId);
  assert.equal(created.productName, tomato.nameEn);
  assert.equal(created.productNameMr, tomato.nameMr);
  assert.equal(created.productGroup, tomato.productGroup);
  assert.equal(created.category, "PERISHABLE");
  assert.equal(
    String((await Listing.findById(created.id))?.productId),
    tomato.productId,
  );
  assert.deepEqual(
    await check(
      await listings.POST(
        request("/listings", "POST", input, "product-master-create"),
      ),
      201,
    ),
    created,
  );
  const edited = await check(
    await detail.PATCH(
      request(
        `/listings/${created.id}`,
        "PATCH",
        { productId: cauliflower.productId, version: created.version },
        "product-master-change",
      ),
      context(created.id),
    ),
  );
  assert.equal(edited.productId, cauliflower.productId);
  assert.equal(edited.productName, cauliflower.nameEn);
  assert.equal(edited.productNameMr, cauliflower.nameMr);
  assert.equal(edited.unit, cauliflower.defaultUnit);
  const loaded = await check(
    await owner.GET(
      request(`/listings/mine/${created.id}`),
      context(created.id),
    ),
  );
  assert.equal(loaded.productId, cauliflower.productId);
  await check(
    await detail.PATCH(
      request(
        `/listings/${created.id}`,
        "PATCH",
        { price: 30, version: edited.version },
        "other-user-edit",
        otherToken,
      ),
      context(created.id),
    ),
    404,
  );
  await ProductMaster.updateOne(
    { _id: cauliflower.productId },
    { $set: { status: "INACTIVE" } },
  );
  assert.equal(
    (
      await check(
        await masterRoute.GET(
          request(
            `/product-master?search=${encodeURIComponent(cauliflower.nameEn)}`,
          ),
        ),
      )
    ).products.some(
      (product: { productId: string }) =>
        product.productId === cauliflower.productId,
    ),
    false,
  );
  const priceOnly = await check(
    await detail.PATCH(
      request(
        `/listings/${created.id}`,
        "PATCH",
        { price: 25, version: edited.version },
        "inactive-product-price",
      ),
      context(created.id),
    ),
  );
  assert.equal(priceOnly.productId, cauliflower.productId);
  assert.equal(priceOnly.productName, cauliflower.nameEn);
  await check(
    await listings.POST(
      request(
        "/listings",
        "POST",
        { ...input, productId: cauliflower.productId },
        "inactive-product-new",
      ),
    ),
    422,
    "PRODUCT_UNAVAILABLE",
  );
  await check(
    await listings.POST(
      request(
        "/listings",
        "POST",
        { ...input, productId: new mongoose.Types.ObjectId().toString() },
        "missing-product-new",
      ),
    ),
    422,
    "PRODUCT_UNAVAILABLE",
  );
  await importMasterProducts(source);
  assert.equal(
    (await ProductMaster.findById(cauliflower.productId))?.status,
    "INACTIVE",
  );
  // Existing manually named listings remain valid and editable without catalogue linkage.
  const legacy = await check(
    await listings.POST(
      request(
        "/listings",
        "POST",
        {
          ...input,
          productId: undefined,
          productName: "Legacy produce",
          productNameMr: "जुने उत्पादन",
        },
        "legacy-product-create",
      ),
    ),
    201,
  );
  assert.equal(legacy.productId, null);
  const legacyEdited = await check(
    await detail.PATCH(
      request(
        `/listings/${legacy.id}`,
        "PATCH",
        { price: 28, version: legacy.version },
        "legacy-product-edit",
      ),
      context(legacy.id),
    ),
  );
  assert.equal(legacyEdited.productId, null);
  assert.equal(legacyEdited.productName, "Legacy produce");
  const linked = await check(
    await detail.PATCH(
      request(
        `/listings/${legacy.id}`,
        "PATCH",
        { productId: tomato.productId, version: legacyEdited.version },
        "link-legacy-product",
      ),
      context(legacy.id),
    ),
  );
  assert.equal(linked.productId, tomato.productId);
  assert.equal(linked.productNameMr, tomato.nameMr);
  assert.equal(await Category.countDocuments(), 2);
  console.log(
    "PASS: 151-product import/reimport/unique codes, active bilingual API/search, authoritative listing selection, unit defaults, ownership, inactive/unknown rejection, legacy edits and explicit linking; Admin categories unchanged.",
  );
  const fixture = {
    seller: actor._id,
    village: village._id,
    category: "PERISHABLE",
    categoryId: perishable._id,
    status: "active",
    quantity: 10,
    unit: "kg",
    price: 10,
    productNameMr: "शोध टोमॅटो",
    expiresAt: new Date(Date.now() + 86400000),
  };
  await Listing.create([
    ...Array.from({ length: 24 }, (_, index) => ({
      ...fixture,
      productName: `Search Tomato ${index}`,
      price: index + 1,
      quantity: index === 0 ? 1 : 10,
      minimumPurchaseQuantity: 2,
    })),
    {
      ...fixture,
      productName: "Expired Tomato",
      expiresAt: new Date(Date.now() - 1000),
    },
    { ...fixture, productName: "Sold Tomato", status: "sold_out", quantity: 0 },
    { ...fixture, productName: "Removed Tomato", status: "deactivated" },
    { ...fixture, productName: "Other Seller Tomato", seller: other._id },
  ]);
  const allMine = await check(
    await mine.GET(request("/listings/mine?status=all&limit=1")),
  );
  assert.equal(allMine.total, 28);
  assert.deepEqual(allMine.summary, {
    total: 28,
    active: 26,
    soldOut: 1,
    lowStock: 1,
  });
  const matching = await check(
    await mine.GET(
      request(
        "/listings/mine?status=active&search=sEaRcH%20ToMaTo&sort=price_asc&page=2&limit=20",
      ),
    ),
  );
  assert.equal(matching.total, 24);
  assert.equal(matching.listings.length, 4);
  assert.deepEqual(
    matching.listings.map((row: { price: number }) => row.price),
    [21, 22, 23, 24],
  );
  const mrMatches = await check(
    await mine.GET(
      request(
        `/listings/mine?status=active&search=${encodeURIComponent("शोध टोमॅटो")}`,
      ),
    ),
  );
  assert.equal(mrMatches.total, 24);
  const low = await check(
    await mine.GET(request("/listings/mine?status=low_stock")),
  );
  assert.equal(low.total, 1);
  assert.equal(low.listings[0].quantity, 1);
  const highest = await check(
    await mine.GET(
      request(
        "/listings/mine?status=all&search=Search&sort=price_desc&limit=1",
      ),
    ),
  );
  assert.equal(highest.listings[0].price, 24);
  assert.equal(
    (
      await check(
        await mine.GET(request("/listings/mine?status=all&search=%5B")),
      )
    ).total,
    0,
  );
  await check(await mine.GET(request("/listings/mine?sort=invalid")), 422);
  await check(
    await mine.GET(
      request("/listings/mine?status=all", "GET", undefined, undefined, null),
    ),
    401,
  );
  const otherMine = await check(
    await mine.GET(
      request(
        "/listings/mine?status=all",
        "GET",
        undefined,
        undefined,
        otherToken,
      ),
    ),
  );
  assert.equal(otherMine.total, 1);
  assert.equal(otherMine.summary.total, 1);
  console.log(
    "PASS: seller summary counts, all/active/low-stock filters, English/Marathi literal search before pagination, sort order, deleted/expired handling and owner-only isolation.",
  );
} finally {
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === databaseName &&
    /^gaavli_product_master_test_[a-f0-9]{16}$/.test(databaseName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
