import assert from "node:assert/strict";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import { ownedListingSchema } from "@gaavli/validation";
import { dashboardStats } from "../src/server/services/dashboard";
nextEnv.loadEnvConfig(process.cwd());
const photoDirectory = await mkdtemp(path.join(tmpdir(), "gaavli-photo-test-"));
process.env.LISTING_PHOTO_UPLOAD_DIR = photoDirectory;
const uri = new URL(process.env.MONGODB_URI || "");
const databaseName = `gaavli_crud_test_${randomBytes(8).toString("hex")}`;
uri.pathname = `/${databaseName}`;
process.env.MONGODB_URI = uri.toString();
Object.assign(process.env, { NODE_ENV: "development" });
const { connectMobileDb } = await import("../src/server/db/mobile");
const { User, Village, Category, Listing, Admin, AuditLog } =
  await import("../src/server/models");
const { MobileSession } = await import("../src/server/models/mobile-auth");
const { ListingOperation, ListingEvent } =
  await import("../src/server/models/listing-operations");
const { hashToken } = await import("../src/server/auth/mobile-policy");
const collection = await import("../src/app/api/v1/listings/route");
const detail = await import("../src/app/api/v1/listings/[id]/route");
const mine = await import("../src/app/api/v1/listings/mine/route");
const myDetail = await import("../src/app/api/v1/listings/mine/[id]/route");
const sold = await import("../src/app/api/v1/listings/[id]/sold-out/route");
const relist = await import("../src/app/api/v1/listings/[id]/relist/route");
const categories = await import("../src/app/api/v1/categories/route");
const { getListingSettings, setListingSettings } =
  await import("../src/server/services/listing-settings");
const token = randomBytes(32).toString("hex"),
  otherToken = randomBytes(32).toString("hex");
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
  bearer: string | null = token,
  origin?: string,
) =>
  new Request(`http://localhost/api/v1${path}`, {
    method,
    headers: {
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(key ? { "Idempotency-Key": key } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
async function check(response: Response, status: number, code?: string) {
  const payload = await response.json();
  assert.equal(response.status, status, JSON.stringify(payload));
  assert.equal(response.headers.get("cache-control"), "no-store");
  if (code) assert.equal(payload.error.code, code);
  return payload.data;
}
try {
  await connectMobileDb();
  const [village, otherVillage, inactiveVillage] = await Village.create([
    { nameEn: "Home", nameMr: "आपले गाव" },
    { nameEn: "Other", nameMr: "दुसरे गाव" },
    { nameEn: "Inactive", nameMr: "बंद", isActive: false },
  ]);
  const [buyer, other] = await User.create([
    { name: "Buyer", village: village._id, roles: ["buyer", "coordinator"] },
    {
      name: "Other",
      firstName: "Other",
      lastName: "Seller",
      village: village._id,
    },
  ]);
  const [perishable, recurring, inactive] = await Category.create([
    {
      code: "PERISHABLE",
      name: "Perishable",
      nameMr: "नाशवंत",
      defaultShelfLife: "2 days",
      notifyMode: "daily_digest",
    },
    {
      code: "RECURRING_SUPPLY",
      name: "Recurring",
      nameMr: "नियमित",
      defaultShelfLife: "Standing",
      notifyMode: "change_only",
    },
    {
      code: "INACTIVE",
      name: "Inactive",
      nameMr: "बंद",
      defaultShelfLife: "2 days",
      notifyMode: "daily_digest",
      status: "INACTIVE",
    },
  ]);
  await MobileSession.create([
    {
      user: buyer._id,
      provider: "test",
      accessHash: hashToken(token),
      refreshHash: hashToken(randomBytes(32).toString("hex")),
      accessExpiresAt: new Date(Date.now() + 900000),
      expiresAt: new Date(Date.now() + 86400000),
    },
    {
      user: other._id,
      provider: "test",
      accessHash: hashToken(otherToken),
      refreshHash: hashToken(randomBytes(32).toString("hex")),
      accessExpiresAt: new Date(Date.now() + 900000),
      expiresAt: new Date(Date.now() + 86400000),
    },
  ]);
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  const body = {
    productName: "Cabbage",
    description: "Fresh cabbage.\nGrown on our farm.",
    productNameMr: "कोबी",
    categoryId: String(perishable._id),
    villageId: String(village._id),
    productGroup: "vegetables",
    quantity: 20,
    unit: "kg",
    price: 35,
    expiresAt,
    minimumPurchaseQuantity: 2,
    fulfillmentOptions: ["farm_pickup"],
  };
  await check(
    await collection.POST(
      request("/listings", "POST", body, "anonymous-key", null),
    ),
    401,
  );
  await check(await collection.POST(request("/listings", "POST", body)), 422);
  await check(
    await collection.POST(
      request(
        "/listings",
        "POST",
        { ...body, seller: String(other._id) },
        "inject-seller",
      ),
    ),
    422,
  );
  await check(
    await collection.POST(
      request(
        "/listings",
        "POST",
        body,
        "origin-reject",
        token,
        "https://other.example",
      ),
    ),
    403,
  );
  for (const [fields, code] of [
    [{ categoryId: String(inactive._id) }, "CATEGORY_UNAVAILABLE"],
    [{ villageId: String(otherVillage._id) }, "VILLAGE_UNAVAILABLE"],
    [{ villageId: String(inactiveVillage._id) }, "VILLAGE_UNAVAILABLE"],
    [{ expiresAt: new Date(0).toISOString() }, "EXPIRY_INVALID"],
    [{ expiresAt: null }, "EXPIRY_REQUIRED"],
    [
      { photoObjectKey: `listings/${other._id}/example.webp` },
      "PHOTO_FORBIDDEN",
    ],
    [{ photoObjectKey: "listings/assets/unknown.webp" }, "PHOTO_FORBIDDEN"],
    [
      {
        photoObjectKey: `listings/${buyer._id}/uploads/${"0".repeat(64)}.webp`,
      },
      "PHOTO_UNAVAILABLE",
    ],
  ] as const)
    await check(
      await collection.POST(
        request("/listings", "POST", { ...body, ...fields }, `invalid-${code}`),
      ),
      422,
      code,
    );
  assert.equal(await Listing.countDocuments(), 0);
  assert.deepEqual((await User.findById(buyer._id))?.roles, [
    "buyer",
    "coordinator",
  ]);
  const concurrent = await Promise.all([
    collection.POST(request("/listings", "POST", body, "create-cabbage")),
    collection.POST(request("/listings", "POST", body, "create-cabbage")),
  ]);
  const created = ownedListingSchema.parse(await check(concurrent[0], 201));
  assert.deepEqual(await check(concurrent[1], 201), created);
  assert.equal(created.version, 1);
  assert.equal(created.description, body.description);
  assert.equal(created.status, "active");
  assert.equal(await Listing.countDocuments(), 1);
  assert.equal(await ListingEvent.countDocuments(), 1);
  assert.deepEqual((await User.findById(buyer._id))?.roles, [
    "buyer",
    "coordinator",
    "seller",
  ]);
  await check(
    await collection.POST(
      request("/listings", "POST", { ...body, price: 36 }, "create-cabbage"),
    ),
    409,
    "IDEMPOTENCY_CONFLICT",
  );
  await check(
    await collection.POST(
      request(
        "/listings",
        "POST",
        { ...body, productName: "Cabbagee" },
        "duplicate-name",
      ),
    ),
    409,
    "DUPLICATE_LISTING",
  );
  const reordered = Object.fromEntries(Object.entries(body).reverse());
  assert.deepEqual(
    await check(
      await collection.POST(
        request("/listings", "POST", reordered, "create-cabbage"),
      ),
      201,
    ),
    created,
  );
  const publicData = await check(
    await detail.GET(request(`/listings/${created.id}`), ctx(created.id)),
    200,
  );
  assert.equal(publicData.minimumPurchaseQuantity, 2);
  assert.equal(publicData.description, body.description);
  assert.deepEqual(publicData.fulfillmentOptions, ["farm_pickup"]);
  for (const field of ["seller", "mobile", "photoObjectKey", "categoryId"])
    assert.equal(field in publicData, false);
  assert.equal(
    (await check(await categories.GET(request("/categories")), 200)).categories
      .length,
    2,
  );
  assert.equal(
    (await check(await mine.GET(request("/listings/mine")), 200)).total,
    1,
  );
  await check(
    await myDetail.GET(
      request(
        `/listings/mine/${created.id}`,
        "GET",
        undefined,
        undefined,
        otherToken,
      ),
      ctx(created.id),
    ),
    404,
  );
  await check(
    await detail.PATCH(
      request(
        `/listings/${created.id}`,
        "PATCH",
        { version: 1, price: 40 },
        "other-update",
        otherToken,
      ),
      ctx(created.id),
    ),
    404,
  );
  await check(
    await detail.DELETE(
      request(
        `/listings/${created.id}`,
        "DELETE",
        { version: 1 },
        "other-delete",
        otherToken,
      ),
      ctx(created.id),
    ),
    404,
  );
  await check(
    await detail.PATCH(
      request(
        `/listings/${created.id}`,
        "PATCH",
        { version: 1, status: "deactivated" },
        "inject-status",
      ),
      ctx(created.id),
    ),
    422,
  );
  const edits = await Promise.all([
    detail.PATCH(
      request(
        `/listings/${created.id}`,
        "PATCH",
        { version: 1, price: 40 },
        "edit-one-key",
      ),
      ctx(created.id),
    ),
    detail.PATCH(
      request(
        `/listings/${created.id}`,
        "PATCH",
        { version: 1, price: 45 },
        "edit-two-key",
      ),
      ctx(created.id),
    ),
  ]);
  assert.deepEqual(edits.map((response) => response.status).sort(), [200, 409]);
  const winner = edits.findIndex((response) => response.status === 200);
  const edited = await check(edits[winner], 200);
  assert.equal(edited.version, 2);
  assert.equal(
    edited.description,
    body.description,
    "partial edits preserve description",
  );
  await check(edits[1 - winner], 409, "STALE_VERSION");
  assert.deepEqual(
    await check(
      await detail.PATCH(
        request(
          `/listings/${created.id}`,
          "PATCH",
          { version: 1, price: winner === 0 ? 40 : 45 },
          winner === 0 ? "edit-one-key" : "edit-two-key",
        ),
        ctx(created.id),
      ),
      200,
    ),
    edited,
  );
  await check(
    await detail.PATCH(
      request(
        `/listings/${created.id}`,
        "PATCH",
        { version: 2, quantity: 1 },
        "bad-minimum",
      ),
      ctx(created.id),
    ),
    422,
  );
  const out = await check(
    await sold.POST(
      request(
        `/listings/${created.id}/sold-out`,
        "POST",
        { version: 2 },
        "sold-out-key",
      ),
      ctx(created.id),
    ),
    200,
  );
  assert.equal(out.status, "sold_out");
  assert.equal(out.quantity, 0);
  assert.equal(out.version, 3);
  assert.deepEqual(
    await check(
      await sold.POST(
        request(
          `/listings/${created.id}/sold-out`,
          "POST",
          { version: 2 },
          "sold-out-key",
        ),
        ctx(created.id),
      ),
      200,
    ),
    out,
  );
  await check(
    await detail.GET(request(`/listings/${created.id}`), ctx(created.id)),
    404,
  );
  await check(
    await detail.PATCH(
      request(
        `/listings/${created.id}`,
        "PATCH",
        { version: 3, price: null },
        "edit-soldout",
      ),
      ctx(created.id),
    ),
    409,
    "INVALID_LISTING_STATE",
  );
  const relisted = await check(
    await relist.POST(
      request(
        `/listings/${created.id}/relist`,
        "POST",
        { version: 3, quantity: 30, expiresAt },
        "relist-key",
      ),
      ctx(created.id),
    ),
    200,
  );
  assert.equal(relisted.status, "active");
  assert.equal(relisted.version, 4);
  const [admin] = await Admin.create([
    { name: "Test admin", passwordHash: "unused-test-hash" },
  ]);
  assert.deepEqual(await getListingSettings(), {
    activeListingLimit: 10,
    version: 0,
  });
  assert.deepEqual(
    await setListingSettings(String(admin._id), {
      activeListingLimit: 2,
      version: 0,
    }),
    { activeListingLimit: 2, version: 1 },
  );
  await assert.rejects(
    setListingSettings(String(admin._id), {
      activeListingLimit: 3,
      version: 0,
    }),
  );
  assert.equal(
    await AuditLog.countDocuments({ action: "LISTING_LIMIT_UPDATED" }),
    1,
  );
  const milkInput = {
    ...body,
    productName: "Milk",
    productNameMr: "दूध",
    productGroup: "dairy",
    categoryId: String(recurring._id),
    expiresAt: null,
    unit: "litre",
    photoObjectKey: `listings/${buyer._id}/milk.webp`,
  };
  const milk = await check(
    await collection.POST(
      request("/listings", "POST", milkInput, "create-milk-key"),
    ),
    201,
  );
  const milkPublic = await check(
    await detail.GET(request(`/listings/${milk.id}`), ctx(milk.id)),
    200,
  );
  assert.equal(milkPublic.expiresAt, null);
  const stats = await dashboardStats();
  assert.equal(
    stats.cards.find((card) => card.label === "Active Listings")?.count,
    2,
    "standing supplies count as active in admin stats",
  );
  await check(
    await collection.POST(
      request(
        "/listings",
        "POST",
        { ...body, productName: "Rice", productNameMr: "तांदूळ" },
        "too-many-key",
      ),
    ),
    409,
    "LISTING_LIMIT",
  );
  const deleted = await check(
    await detail.DELETE(
      request(
        `/listings/${created.id}`,
        "DELETE",
        { version: 4 },
        "delete-cabbage",
      ),
      ctx(created.id),
    ),
    200,
  );
  assert.equal(deleted.version, 5);
  assert.equal(deleted.deleted, true);
  assert.deepEqual(
    await check(
      await detail.DELETE(
        request(
          `/listings/${created.id}`,
          "DELETE",
          { version: 4 },
          "delete-cabbage",
        ),
        ctx(created.id),
      ),
      200,
    ),
    deleted,
  );
  assert.deepEqual(
    await check(
      await detail.DELETE(
        request(
          `/listings/${created.id}`,
          "DELETE",
          { version: 4 },
          "repeat-delete",
        ),
        ctx(created.id),
      ),
      200,
    ),
    deleted,
  );
  assert.equal((await Listing.findById(created.id))?.status, "deactivated");
  await check(
    await detail.GET(request(`/listings/${created.id}`), ctx(created.id)),
    404,
  );
  await check(
    await relist.POST(
      request(
        `/listings/${created.id}/relist`,
        "POST",
        { version: 5, quantity: 20, expiresAt },
        "resurrect-key",
      ),
      ctx(created.id),
    ),
    409,
    "INVALID_LISTING_STATE",
  );
  assert.deepEqual(
    await check(
      await collection.POST(
        request("/listings", "POST", body, "create-cabbage"),
      ),
      201,
    ),
    created,
  );
  assert.equal(
    (await Listing.findById(created.id))?.status,
    "deactivated",
    "old create replay cannot resurrect deleted record",
  );
  assert.equal(
    (
      await check(
        await mine.GET(request("/listings/mine?status=deactivated")),
        200,
      )
    ).total,
    1,
  );
  await Listing.updateOne(
    { _id: milk.id },
    { $set: { expiresAt: new Date(0) } },
  );
  assert.equal(
    (
      await check(
        await myDetail.GET(request(`/listings/mine/${milk.id}`), ctx(milk.id)),
        200,
      )
    ).status,
    "expired",
  );
  assert.equal(
    (await check(await mine.GET(request("/listings/mine?status=expired")), 200))
      .total,
    1,
  );
  await User.updateOne(
    { _id: buyer._id },
    { $set: { village: otherVillage._id } },
  );
  await check(
    await relist.POST(
      request(
        `/listings/${milk.id}/relist`,
        "POST",
        { version: 1, quantity: 20, expiresAt: null },
        "old-village-key",
      ),
      ctx(milk.id),
    ),
    422,
    "VILLAGE_UNAVAILABLE",
  );
  await User.updateOne({ _id: buyer._id }, { $set: { status: "blocked" } });
  await check(
    await collection.POST(
      request("/listings", "POST", body, "blocked-new-key"),
    ),
    401,
  );
  assert.ok(await ListingOperation.countDocuments());
  const seller = await import("../src/app/api/v1/users/me/seller/route");
  const profile = await import("../src/app/api/v1/users/me/route");
  await User.updateOne(
    { _id: other._id },
    { $set: { roles: ["buyer", "coordinator"] } },
  );
  await check(
    await seller.POST(request("/users/me/seller", "POST", {}, undefined, null)),
    401,
  );
  await check(
    await seller.POST(
      request(
        "/users/me/seller",
        "POST",
        {},
        undefined,
        otherToken,
        "https://untrusted.example",
      ),
    ),
    403,
  );
  await check(
    await seller.POST(
      request(
        "/users/me/seller",
        "POST",
        { roles: ["coordinator"] },
        undefined,
        otherToken,
      ),
    ),
    422,
  );
  assert.equal(
    (
      await check(
        await profile.GET(
          request("/users/me", "GET", undefined, undefined, otherToken),
        ),
        200,
      )
    ).isSeller,
    false,
  );
  const activated = await check(
    await seller.POST(
      request("/users/me/seller", "POST", {}, undefined, otherToken),
    ),
    200,
  );
  assert.equal(activated.isSeller, true);
  assert.equal(activated.id, String(other._id));
  assert.equal(activated.name, other.name);
  assert.equal(activated.village.id, String(village._id));
  assert.equal("mobile" in activated, false);
  const afterActivation = await User.findById(other._id).lean();
  assert.deepEqual([...afterActivation!.roles].sort(), [
    "buyer",
    "coordinator",
    "seller",
  ]);
  assert.deepEqual(
    await check(
      await seller.POST(
        request("/users/me/seller", "POST", {}, undefined, otherToken),
      ),
      200,
    ),
    activated,
  );
  assert.equal(
    (await User.findById(other._id).lean())!.__v,
    afterActivation!.__v,
  );
  assert.equal(
    (
      await check(
        await profile.GET(
          request("/users/me", "GET", undefined, undefined, otherToken),
        ),
        200,
      )
    ).isSeller,
    true,
  );
  assert.equal(
    (
      await check(
        await profile.PATCH(
          request(
            "/users/me",
            "PATCH",
            { villageId: String(otherVillage._id) },
            undefined,
            otherToken,
          ),
        ),
        200,
      )
    ).isSeller,
    true,
  );
  assert.equal(await Listing.countDocuments({ seller: other._id }), 0);
  await check(await seller.POST(request("/users/me/seller", "POST", {})), 401);
  const refreshToken = randomBytes(32).toString("hex");
  await MobileSession.updateOne(
    { user: other._id },
    { $set: { refreshHash: hashToken(refreshToken) } },
  );
  const refreshRoute = await import("../src/app/api/v1/auth/refresh/route");
  const refreshed = await check(
    await refreshRoute.POST(
      request("/auth/refresh", "POST", { refreshToken }, undefined, null),
    ),
    200,
  );
  assert.equal(refreshed.user.isSeller, true);
  console.log(
    "PASS: explicit seller activation, protected DTO, preserved capabilities, idempotent retry, restored profile, refresh and village-change persistence.",
  );
  // Mobile form -> durable snapshot -> actual create route -> buyer detail DTO.
  const {
    emptyListingDraft,
    prepareListing,
    newListingOperation,
    listingDraftSchema,
  } = await import("../../mobile/src/data/listingForm");
  const form = {
    ...emptyListingDraft.form,
    description: "Organic tomatoes.\nHarvested today.",
    name: "टोमॅटो",
    categoryId: String(perishable._id),
    photo: "tomato",
    quantity: "४०",
    price: "२५",
    minimum: "२",
  };
  const pending = newListingOperation(
    prepareListing(form, String(otherVillage._id), "mr", "PERISHABLE"),
  );
  const restoredDraft = listingDraftSchema.parse(
    JSON.parse(JSON.stringify({ form, pending })),
  );
  const restored = restoredDraft.pending!;
  const mobileRequest = () =>
    request(
      "/listings",
      "POST",
      restored.body,
      restored.key,
      refreshed.accessToken,
    );
  const mobileCreated = await check(
    await collection.POST(mobileRequest()),
    201,
  );
  assert.deepEqual(
    await check(await collection.POST(mobileRequest()), 201),
    mobileCreated,
  );
  assert.equal(await Listing.countDocuments({ seller: other._id }), 1);
  const publicMobile = await check(
    await detail.GET(
      request(
        `/listings/${mobileCreated.id}`,
        "GET",
        undefined,
        undefined,
        refreshed.accessToken,
      ),
      ctx(mobileCreated.id),
    ),
    200,
  );
  assert.equal(publicMobile.description, form.description);
  assert.equal(
    (await Listing.findById(mobileCreated.id))?.description,
    form.description,
  );
  assert.equal(
    publicMobile.photoUrl,
    "/listing-photos/listings/assets/tomato.webp",
  );
  assert.equal(publicMobile.productNameMr, "टोमॅटो");
  assert.equal(publicMobile.price, 25);
  assert.equal(publicMobile.quantity, 40);
  assert.equal(publicMobile.minimumPurchaseQuantity, 2);
  assert.equal(publicMobile.village.id, String(otherVillage._id));
  const { mobileListingSchema } = await import("@gaavli/validation");
  mobileListingSchema.parse(publicMobile);
  console.log(
    "PASS: mobile form, persisted retry snapshot, local asset photo, database create and safe buyer detail round trip.",
  );
  const photos = await import("../src/app/api/v1/listings/photos/route");
  const photoRead =
    await import("../src/app/listing-photos/listings/[owner]/uploads/[file]/route");
  const source = await sharp({
    create: { width: 1800, height: 1000, channels: 3, background: "red" },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Copyright: "private metadata" } } })
    .toBuffer();
  function photoRequest(
    bytes: Buffer = source,
    options: {
      bearer?: string | null;
      mime?: string;
      origin?: string;
      key?: string;
      extra?: boolean;
      length?: string;
    } = {},
  ) {
    const data = new FormData();
    data.set(
      "photo",
      new Blob([new Uint8Array(bytes)], { type: options.mime ?? "image/jpeg" }),
      "phone.jpg",
    );
    if (options.extra) data.set("userId", String(buyer._id));
    return new Request("http://localhost/api/v1/listings/photos", {
      method: "POST",
      body: data,
      headers: {
        ...(options.bearer === null
          ? {}
          : {
              Authorization: `Bearer ${options.bearer ?? refreshed.accessToken}`,
            }),
        "Idempotency-Key": options.key ?? "phone-photo-operation",
        ...(options.origin ? { Origin: options.origin } : {}),
        ...(options.length ? { "Content-Length": options.length } : {}),
      },
    });
  }
  await check(await photos.POST(photoRequest(source, { bearer: null })), 401);
  await check(
    await photos.POST(
      photoRequest(source, { origin: "https://untrusted.example" }),
    ),
    403,
  );
  await check(await photos.POST(photoRequest(source, { extra: true })), 422);
  await check(
    await photos.POST(
      photoRequest(source, { length: String(6 * 1024 * 1024) }),
    ),
    413,
  );
  await check(
    await photos.POST(photoRequest(Buffer.from("not an image"))),
    422,
    "PHOTO_INVALID",
  );
  await check(
    await photos.POST(
      photoRequest(Buffer.from("<svg/>"), { mime: "image/svg+xml" }),
    ),
    422,
    "PHOTO_INVALID",
  );
  // The same upload/read works in a deployed production Node runtime.
  process.env.NODE_ENV = "production";
  const simultaneousUploads = await Promise.all([
    photos.POST(photoRequest()),
    photos.POST(photoRequest()),
  ]);
  const uploaded = await check(simultaneousUploads[0], 201);
  assert.deepEqual(await check(simultaneousUploads[1], 201), uploaded);
  assert.deepEqual(
    await check(await photos.POST(photoRequest()), 201),
    uploaded,
  );
  const different = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "blue" },
  })
    .jpeg()
    .toBuffer();
  await check(
    await photos.POST(photoRequest(different)),
    409,
    "PHOTO_OPERATION_CONFLICT",
  );
  assert.ok(
    uploaded.photoObjectKey.startsWith(`listings/${other._id}/uploads/`),
  );
  const fileName = uploaded.photoObjectKey.split("/").at(-1)!;
  const served = await photoRead.GET(
    new Request(`http://localhost${uploaded.photoUrl}`),
    { params: Promise.resolve({ owner: String(other._id), file: fileName }) },
  );
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "image/webp");
  assert.equal(served.headers.get("x-content-type-options"), "nosniff");
  const output = await sharp(
    Buffer.from(await served.arrayBuffer()),
  ).metadata();
  assert.equal(output.format, "webp");
  assert.ok(Math.max(output.width!, output.height!) <= 1600);
  assert.equal(output.exif, undefined);
  const { ListingPhoto } = await import("../src/server/models/listing-photo");
  const manifest = await ListingPhoto.findById(uploaded.photoObjectKey).lean();
  assert.ok(manifest?.fileId);
  assert.equal(
    await mongoose.connection
      .db!.collection("listingPhotos.files")
      .countDocuments(),
    1,
  );
  assert.deepEqual(
    await readdir(photoDirectory),
    [],
    "uploads must never write server files",
  );
  process.env.NODE_ENV = "development";
  await check(
    await photoRead.GET(new Request("http://localhost/invalid"), {
      params: Promise.resolve({ owner: "..", file: "bad" }),
    }),
    404,
  );
  const withPhonePhoto = await check(
    await detail.PATCH(
      request(
        `/listings/${mobileCreated.id}`,
        "PATCH",
        { version: 1, photoObjectKey: uploaded.photoObjectKey },
        "attach-phone-photo",
        refreshed.accessToken,
      ),
      ctx(mobileCreated.id),
    ),
    200,
  );
  assert.equal(withPhonePhoto.photoObjectKey, uploaded.photoObjectKey);
  assert.equal(
    String((await Listing.findById(mobileCreated.id))?.photoImageId),
    String(manifest!.fileId),
  );
  const photoDeletion =
    await import("../src/app/api/v1/listings/photos/[imageId]/route");
  const imageContext = {
    params: Promise.resolve({ imageId: String(manifest!.fileId) }),
  };
  await check(
    await photoDeletion.DELETE(
      request(
        "/listings/photos/image",
        "DELETE",
        undefined,
        undefined,
        refreshed.accessToken,
      ),
      imageContext,
    ),
    409,
    "PHOTO_IN_USE",
  );
  await User.updateOne({ _id: buyer._id }, { $set: { status: "active" } });
  await check(
    await photoDeletion.DELETE(
      request("/listings/photos/image", "DELETE"),
      imageContext,
    ),
    404,
  );
  await User.updateOne({ _id: buyer._id }, { $set: { status: "blocked" } });
  const buyerPhoto = await check(
    await detail.GET(
      request(
        `/listings/${mobileCreated.id}`,
        "GET",
        undefined,
        undefined,
        refreshed.accessToken,
      ),
      ctx(mobileCreated.id),
    ),
    200,
  );
  assert.equal(buyerPhoto.photoUrl, uploaded.photoUrl);
  // The shared mobile add/edit form prepares a minimal versioned patch, retaining
  // the other name and photo; the existing owner APIs remain authoritative.
  const { formFromListing, prepareListingEdit } =
    await import("../../mobile/src/data/listingForm");
  const beforeEdit = ownedListingSchema.parse(withPhonePhoto);
  const initialEditForm = formFromListing(beforeEdit, "mr");
  const mobilePatch = prepareListingEdit(
    { ...initialEditForm, price: "29", description: "Fresh organic produce." },
    beforeEdit,
    initialEditForm,
    "mr",
    "PERISHABLE",
  );
  assert.deepEqual(mobilePatch, {
    version: 2,
    price: 29,
    description: "Fresh organic produce.",
  });
  const editRequest = () =>
    request(
      `/listings/${mobileCreated.id}`,
      "PATCH",
      mobilePatch,
      "mobile-shared-form-edit",
      refreshed.accessToken,
    );
  const editedProduct = await check(
    await detail.PATCH(editRequest(), ctx(mobileCreated.id)),
    200,
  );
  assert.equal(editedProduct.photoObjectKey, uploaded.photoObjectKey);
  assert.equal(editedProduct.productNameMr, beforeEdit.productNameMr);
  assert.equal(editedProduct.expiresAt, beforeEdit.expiresAt);
  assert.equal(editedProduct.description, "Fresh organic produce.");
  assert.deepEqual(
    await check(await detail.PATCH(editRequest(), ctx(mobileCreated.id)), 200),
    editedProduct,
  );
  await check(
    await detail.PATCH(
      request(
        `/listings/${mobileCreated.id}`,
        "PATCH",
        { version: 2, price: 31 },
        "mobile-stale-edit",
        refreshed.accessToken,
      ),
      ctx(mobileCreated.id),
    ),
    409,
    "STALE_VERSION",
  );
  const newPhoto = await check(
    await photos.POST(
      photoRequest(different, { key: "replace-phone-photo-operation" }),
    ),
    201,
  );
  const replacementProduct = await check(
    await detail.PATCH(
      request(
        `/listings/${mobileCreated.id}`,
        "PATCH",
        {
          version: editedProduct.version,
          photoObjectKey: newPhoto.photoObjectKey,
        },
        "replace-product-photo",
        refreshed.accessToken,
      ),
      ctx(mobileCreated.id),
    ),
    200,
  );
  assert.equal(replacementProduct.photoObjectKey, newPhoto.photoObjectKey);
  const replacementManifest = await ListingPhoto.findById(
    newPhoto.photoObjectKey,
  ).lean();
  assert.equal(
    String((await Listing.findById(mobileCreated.id))?.photoImageId),
    String(replacementManifest!.fileId),
  );
  assert.ok(
    await ListingPhoto.exists({ _id: uploaded.photoObjectKey, state: "ready" }),
  );
  const { pendingListingDeleteSchema } =
    await import("../../mobile/src/data/ownedListings");
  const cleared = await check(
    await detail.PATCH(
      request(
        `/listings/${mobileCreated.id}`,
        "PATCH",
        {
          version: replacementProduct.version,
          description: null,
          photoObjectKey: null,
        },
        "clear-product-description",
        refreshed.accessToken,
      ),
      ctx(mobileCreated.id),
    ),
    200,
  );
  assert.equal(cleared.description, null);
  assert.equal(
    (
      await check(
        await detail.GET(
          request(
            `/listings/${mobileCreated.id}`,
            "GET",
            undefined,
            undefined,
            refreshed.accessToken,
          ),
          ctx(mobileCreated.id),
        ),
        200,
      )
    ).description,
    null,
  );
  const deleteSnapshot = pendingListingDeleteSchema.parse(
    JSON.parse(
      JSON.stringify({
        id: mobileCreated.id,
        version: cleared.version,
        key: "mobile-confirmed-delete",
      }),
    ),
  );
  const deleteRequest = () =>
    request(
      `/listings/${deleteSnapshot.id}`,
      "DELETE",
      { version: deleteSnapshot.version },
      deleteSnapshot.key,
      refreshed.accessToken,
    );
  const removedProduct = await check(
    await detail.DELETE(deleteRequest(), ctx(deleteSnapshot.id)),
    200,
  );
  assert.equal(removedProduct.deleted, true);
  assert.deepEqual(
    await check(
      await detail.DELETE(deleteRequest(), ctx(deleteSnapshot.id)),
      200,
    ),
    removedProduct,
  );
  await check(
    await detail.GET(
      request(
        `/listings/${deleteSnapshot.id}`,
        "GET",
        undefined,
        undefined,
        refreshed.accessToken,
      ),
      ctx(deleteSnapshot.id),
    ),
    404,
  );
  console.log(
    "PASS: mobile shared edit form preserves names/photos/expiry; version conflict, edit/delete replay and buyer removal.",
  );
  const homemadeBody = prepareListing(
    { ...form, group: "homemade", name: "लोणचे", photo: "" },
    String(otherVillage._id),
    "mr",
    "PERISHABLE",
  );
  const createHomemade = () =>
    collection.POST(
      request(
        "/listings",
        "POST",
        homemadeBody,
        "homemade-group-create",
        refreshed.accessToken,
      ),
    );
  const homemadeCreated = await check(await createHomemade(), 201);
  assert.equal(
    (await Listing.findById(homemadeCreated.id))?.productGroup,
    "homemade",
  );
  assert.deepEqual(await check(await createHomemade(), 201), homemadeCreated);
  const homemadeOwned = await check(
    await myDetail.GET(
      request(
        `/listings/mine/${homemadeCreated.id}`,
        "GET",
        undefined,
        undefined,
        refreshed.accessToken,
      ),
      ctx(homemadeCreated.id),
    ),
    200,
  );
  assert.equal(homemadeOwned.productGroup, "homemade");
  assert.equal(formFromListing(homemadeOwned, "en").group, "homemade");
  const homemadeEdited = await check(
    await detail.PATCH(
      request(
        `/listings/${homemadeCreated.id}`,
        "PATCH",
        { productGroup: "fruits", version: homemadeOwned.version },
        "homemade-group-edit",
        refreshed.accessToken,
      ),
      ctx(homemadeCreated.id),
    ),
    200,
  );
  assert.equal(homemadeEdited.productGroup, "fruits");
  assert.equal(homemadeOwned.photoObjectKey, null);
  assert.equal(homemadeEdited.photoObjectKey, null);
  const afterRemoval = await Listing.findById(mobileCreated.id);
  assert.equal(afterRemoval?.photoImageId, null);
  // Removing a reference does not erase the old upload; deletion is explicit.
  assert.ok(
    await ListingPhoto.exists({ _id: uploaded.photoObjectKey, state: "ready" }),
  );
  await check(
    await photoDeletion.DELETE(
      request(
        "/listings/photos/image",
        "DELETE",
        undefined,
        undefined,
        refreshed.accessToken,
      ),
      imageContext,
    ),
    200,
  );
  await check(
    await photoDeletion.DELETE(
      request(
        "/listings/photos/image",
        "DELETE",
        undefined,
        undefined,
        refreshed.accessToken,
      ),
      imageContext,
    ),
    200,
  );
  await check(
    await photoRead.GET(new Request("http://localhost/removed"), {
      params: Promise.resolve({ owner: String(other._id), file: fileName }),
    }),
    404,
  );
  await check(
    await photoDeletion.DELETE(
      request(
        "/listings/photos/image",
        "DELETE",
        undefined,
        undefined,
        refreshed.accessToken,
      ),
      {
        params: Promise.resolve({
          imageId: String(replacementManifest!.fileId),
        }),
      },
    ),
    200,
  );
  assert.equal(
    await mongoose.connection
      .db!.collection("listingPhotos.files")
      .countDocuments(),
    0,
  );
  const { storeLocalListingPhoto, readLocalListingPhoto } =
    await import("../src/server/providers/local-listing-photos");
  const legacyKey = `listings/${other._id}/uploads/${"e".repeat(64)}.webp`;
  const legacyBytes = await sharp(source).webp().toBuffer();
  await storeLocalListingPhoto(legacyKey, legacyBytes); // Legacy fixture, not an application upload.
  await Listing.updateOne(
    { _id: homemadeCreated.id },
    { $set: { photoObjectKey: legacyKey } },
  );
  const migrated = await promisify(execFile)(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "scripts/migrate-listing-photos.mts",
      "--apply",
    ],
    { env: process.env, timeout: 60000 },
  );
  assert.ok(migrated.stdout.includes('"copied":1'));
  assert.deepEqual(
    await readLocalListingPhoto(legacyKey),
    legacyBytes,
    "migration must retain originals",
  );
  const legacyProduct = await Listing.findById(homemadeCreated.id);
  assert.equal(legacyProduct?.photoObjectKey, legacyKey);
  assert.ok(legacyProduct?.photoImageId);
  process.env.NODE_ENV = "production";
  const migratedImage = await photoRead.GET(
    new Request("https://example.test/legacy"),
    {
      params: Promise.resolve({
        owner: String(other._id),
        file: legacyKey.split("/").at(-1)!,
      }),
    },
  );
  assert.equal(migratedImage.status, 200);
  assert.deepEqual(Buffer.from(await migratedImage.arrayBuffer()), legacyBytes);
  process.env.NODE_ENV = "development";
  console.log(
    "PASS: GridFS production upload/read, image IDs, optional photos, removal, owner-only unused deletion, no filesystem writes, and non-destructive legacy migration.",
  );

  console.log(
    "PASS: authenticated bounded phone upload, malformed/oversized/injected rejection, immutable replay/conflict, WebP resize/metadata stripping, file serving and buyer photo attachment.",
  );
  console.log(
    "PASS: isolated MongoDB listing CRUD, ownership, privilege rejection, first-listing seller conversion, concurrency/version conflicts, idempotent replay, duplicate/limit guards, standing supply, details, lifecycle, soft deletion and audit.",
  );
} finally {
  if (
    path.dirname(photoDirectory) === path.resolve(tmpdir()) &&
    /^gaavli-photo-test-[a-zA-Z0-9]+$/.test(path.basename(photoDirectory))
  )
    await rm(photoDirectory, { recursive: true, force: true });
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === databaseName &&
    /^gaavli_crud_test_[a-f0-9]{16}$/.test(databaseName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
