// Real MongoDB and real route handlers; writes only an isolated random test DB.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import {
  mobileListingPageSchema,
  mobileListingSchema,
  sellerContactSchema,
  sellerContactStateSchema,
  notifySellerResultSchema,
  notificationPageSchema,
  requestPageSchema,
  requestStateSchema,
  requestContactSchema,
} from "@gaavli/validation";
nextEnv.loadEnvConfig(process.cwd());
const originalUri = process.env.MONGODB_URI;
if (!originalUri)
  throw new Error("MONGODB_URI is required for listing integration.");
const databaseName = `gaavli_listing_test_${randomBytes(8).toString("hex")}`;
const uri = new URL(originalUri);
uri.pathname = `/${databaseName}`;
process.env.MONGODB_URI = uri.toString();
Object.assign(process.env, { NODE_ENV: "development" });
const { connectMobileDb } = await import("../src/server/db/mobile");
const { Listing, Village, User, Category, Notification } =
  await import("../src/server/models");
const { MobileSession, MobileRateLimit } =
  await import("../src/server/models/mobile-auth");
const { ListingInterest } =
  await import("../src/server/models/listing-interest");
const { POST: interested, GET: savedInterest } =
  await import("../src/app/api/v1/listings/[id]/interested/route");
const { POST: notifyFarmer } =
  await import("../src/app/api/v1/listings/[id]/notify-farmer/route");
const { GET: notifications } =
  await import("../src/app/api/v1/notifications/route");
const { GET: requests } = await import("../src/app/api/v1/requests/route");
const { PATCH: requestAction } =
  await import("../src/app/api/v1/requests/[id]/route");
const { GET: requestContact } =
  await import("../src/app/api/v1/requests/[id]/contact/route");
const { hashToken } = await import("../src/server/auth/mobile-policy");
const { GET: list } = await import("../src/app/api/v1/listings/route");
const { GET: detail } = await import("../src/app/api/v1/listings/[id]/route");
const { GET: ownListings } =
  await import("../src/app/api/v1/listings/mine/route");
const { listingPhotoUrl } =
  await import("../src/server/providers/listing-photos");
const { findMobileListings } =
  await import("../src/server/repositories/listings");
const { mobileListingsQuerySchema } = await import("@gaavli/validation");
const token = randomBytes(32).toString("hex");
const request = (query = "", bearer: string | null = token) =>
  new Request(`http://localhost/api/v1/listings${query}`, {
    headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
  });
const getDetail = (id: string, bearer: string | null = token) =>
  detail(request(`/${id}`, bearer), { params: Promise.resolve({ id }) });
const readInterest = (id: string, bearer: string | null = token) =>
  savedInterest(request(`/${id}/interested`, bearer), {
    params: Promise.resolve({ id }),
  });
const notify = (
  id: string,
  key = "notify-roundtrip-01",
  bearer: string | null = token,
  body: unknown = {},
  origin?: string,
) =>
  notifyFarmer(
    new Request(`http://localhost/api/v1/listings/${id}/notify-farmer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
const inbox = (bearer: string | null, query = "?language=en") =>
  notifications(
    new Request(`http://localhost/api/v1/notifications${query}`, {
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    }),
  );
const activity = (
  bearer: string | null,
  direction: "sent" | "received",
  extra = "",
) =>
  requests(
    new Request(
      `http://localhost/api/v1/requests?direction=${direction}${extra}`,
      { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} },
    ),
  );
const statusAction = (id: string, bearer: string, action: string) =>
  requestAction(
    new Request(`http://localhost/api/v1/requests/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    }),
    { params: Promise.resolve({ id }) },
  );
const callback = (id: string, bearer: string | null) =>
  requestContact(
    new Request(`http://localhost/api/v1/requests/${id}/contact`, {
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    }),
    { params: Promise.resolve({ id }) },
  );
const revealContact = (
  id: string,
  bearer: string | null = token,
  body: unknown = {},
  origin?: string,
) =>
  interested(
    new Request(`http://localhost/api/v1/listings/${id}/interested`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
try {
  await connectMobileDb();
  await Promise.all([Listing.init(), Category.init()]);
  const [village, other, inactive] = await Village.create([
    { nameEn: "Home", nameMr: "आपले गाव" },
    { nameEn: "Other", nameMr: "दुसरे गाव" },
    { nameEn: "Inactive", nameMr: "बंद", isActive: false },
  ]);
  const [buyer, seller, blocked] = await User.create([
    { name: "Buyer", mobile: "9000000001", village: village._id },
    {
      name: "Private Seller",
      mobile: "9000000002",
      village: village._id,
      roles: ["buyer", "seller"],
    },
    {
      name: "Blocked Seller",
      mobile: "9000000003",
      village: village._id,
      status: "blocked",
    },
  ]);
  await MobileSession.create({
    user: buyer._id,
    provider: "test",
    accessHash: hashToken(token),
    refreshHash: hashToken(randomBytes(32).toString("hex")),
    accessExpiresAt: new Date(Date.now() + 900000),
    expiresAt: new Date(Date.now() + 86400000),
  });
  await Category.create([
    {
      code: "PERISHABLE",
      name: "Perishable",
      nameMr: "नाशवंत",
      defaultShelfLife: "2 days",
      notifyMode: "daily_digest",
    },
    {
      code: "HIDDEN",
      name: "Hidden",
      nameMr: "बंद",
      defaultShelfLife: "2 days",
      notifyMode: "daily_digest",
      status: "INACTIVE",
    },
  ]);
  const base = {
    productGroup: "vegetables",
    productName: "Tomato",
    productNameMr: "टोमॅटो",
    category: "PERISHABLE",
    quantity: 40,
    unit: "kg",
    price: 28,
    village: village._id,
    seller: seller._id,
    status: "active",
    expiresAt: new Date(Date.now() + 86400000),
  };
  const rows = await Listing.create([
    {
      ...base,
      isDemo: true,
      photoObjectKey: "listings/narayangaon-demo-v1/tomato.webp",
    },
    {
      ...base,
      productName: "Milk",
      productGroup: "dairy",
      productNameMr: undefined,
      category: "Legacy Dairy",
      unit: "litre",
      price: undefined,
    },
    { ...base, status: "expired" },
    { ...base, expiresAt: new Date(0) },
    { ...base, status: "reported" },
    { ...base, status: "pending" },
    { ...base, quantity: 0 },
    { ...base, seller: blocked._id },
    { ...base, seller: new mongoose.Types.ObjectId() },
    { ...base, village: other._id },
    { ...base, village: inactive._id },
    { ...base, category: "HIDDEN" },
    { ...base, expiresAt: undefined },
  ]);
  assert.equal((await list(request("", null))).status, 401);
  assert.equal((await getDetail(String(rows[0]._id), null)).status, 401);
  assert.equal(
    (
      await list(
        new Request("http://localhost/api/v1/listings", {
          headers: { Cookie: "admin-session=anything" },
        }),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await list(
        new Request("http://localhost/api/v1/listings", {
          headers: {
            Authorization: `Bearer ${token}`,
            Origin: "https://other.example",
          },
        }),
      )
    ).status,
    403,
  );
  for (const query of [
    "?page=0",
    "?limit=51",
    "?search[$ne]=x",
    "?villageId=anything",
    "?status=pending",
  ])
    assert.equal((await list(request(query))).status, 422);
  const response = await list(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const page = mobileListingPageSchema.parse((await response.json()).data);
  assert.equal(page.total, 2);
  for (const [group, expected] of [
    ["vegetables", 1],
    ["fruits", 0],
    ["grain", 0],
    ["dairy", 1],
  ] as const) {
    const filtered = (
      await (await list(request(`?productGroup=${group}`))).json()
    ).data;
    assert.equal(filtered.total, expected);
    assert.equal(filtered.listings.length, expected);
  }
  assert.equal(
    (await (await list(request("?productGroup=dairy&search=Tomato"))).json())
      .data.total,
    0,
  );
  assert.equal((await list(request("?productGroup=unknown"))).status, 422);
  assert.equal(page.isSeller, false);
  const tomato = page.listings.find(
    (listing) => listing.id === String(rows[0]._id),
  );
  assert.equal(tomato?.isDemo, true);
  assert.equal(
    tomato?.photoUrl,
    "/listing-photos/listings/narayangaon-demo-v1/tomato.webp",
  );
  assert.equal("photoObjectKey" in tomato!, false);
  assert.equal(listingPhotoUrl("listings/../secret.webp"), null);
  assert.equal(listingPhotoUrl("https://other.example/picture.webp"), null);
  process.env.NODE_ENV = "production";
  assert.equal(listingPhotoUrl("listings/example.webp"), null);
  assert.equal(
    (
      await findMobileListings(
        String(village._id),
        mobileListingsQuerySchema.parse({}),
        String(buyer._id),
      )
    ).total,
    1,
    "demo listings excluded in production",
  );
  process.env.LISTING_PHOTO_BASE_URL = "https://cdn.example/photos/";
  assert.equal(
    listingPhotoUrl("listings/example.webp"),
    "https://cdn.example/photos/listings/example.webp",
  );
  process.env.LISTING_PHOTO_BASE_URL = "https://secret@cdn.example/";
  assert.equal(listingPhotoUrl("listings/example.webp"), null);
  delete process.env.LISTING_PHOTO_BASE_URL;
  process.env.NODE_ENV = "development";
  assert.equal(page.categories.length, 2);
  const payload = JSON.stringify(page);
  for (const privateValue of [
    "Private Seller",
    "9000000002",
    String(seller._id),
    "sampleDistanceKm",
    "sellerRecord",
    "accessHash",
  ])
    assert.equal(
      payload.includes(privateValue),
      false,
      `must exclude ${privateValue}`,
    );
  assert.equal(
    (
      await list(
        request(
          "?search=%E0%A4%9F%E0%A5%8B%E0%A4%AE%E0%A5%85%E0%A4%9F%E0%A5%8B",
        ),
      )
    ).status,
    200,
  );
  const search = await (
    await list(request(`?search=${encodeURIComponent("टोमॅटो")}`))
  ).json();
  assert.equal(search.data.total, 1);
  assert.equal(
    (await (await list(request("?search=.*"))).json()).data.total,
    0,
    "regex is literal",
  );
  assert.equal(
    (await (await list(request("?category=PERISHABLE"))).json()).data.total,
    1,
  );
  const first = (await (await list(request("?page=1&limit=1"))).json()).data;
  const second = (await (await list(request("?page=2&limit=1"))).json()).data;
  assert.equal(first.total, 2);
  assert.notEqual(first.listings[0].id, second.listings[0].id);
  assert.equal(
    (await (await list(request("?page=3&limit=1"))).json()).data.listings
      .length,
    0,
  );
  const milk = mobileListingSchema.parse(
    (await (await getDetail(String(rows[1]._id))).json()).data,
  );
  assert.equal(milk.price, null);
  assert.equal(milk.photoUrl, null);
  assert.equal(milk.isDemo, false);
  assert.equal(milk.unit, "litre");
  assert.equal(milk.productNameMr, null);
  assert.equal(milk.village.distanceKm, undefined);
  const contactId = String(rows[1]._id);
  assert.equal(
    (await notify(contactId, "notify-no-auth-01", null)).status,
    401,
  );
  assert.equal((await notify(contactId, "notify-before-interest")).status, 403);
  assert.equal(
    (
      await notify(
        contactId,
        "notify-origin-01",
        token,
        {},
        "https://other.example",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await notify(contactId, "notify-body-01", token, {
        sellerId: String(seller._id),
      })
    ).status,
    422,
  );
  assert.equal((await notify(contactId, "bad")).status, 422);
  assert.equal(await Notification.countDocuments(), 0);
  assert.equal((await inbox(null)).status, 401);
  assert.equal((await inbox(token, `?userId=${seller._id}`)).status, 422);
  const beforeInterest = await readInterest(contactId);
  assert.equal(beforeInterest.status, 200);
  assert.deepEqual(
    sellerContactStateSchema.parse((await beforeInterest.json()).data),
    { listingId: contactId, interested: false },
  );
  assert.equal((await readInterest(contactId, null)).status, 401);
  assert.equal(
    await ListingInterest.countDocuments(),
    0,
    "browsing must not register interest",
  );
  assert.equal((await revealContact(contactId, null)).status, 401);
  assert.equal(
    (await revealContact(contactId, token, {}, "https://other.example")).status,
    403,
  );
  assert.equal(
    (await revealContact(contactId, token, { userId: String(seller._id) }))
      .status,
    422,
  );
  assert.equal((await revealContact("bad")).status, 422);
  assert.equal(
    (await revealContact(String(rows[0]._id))).status,
    404,
    "demo rows never reveal contacts",
  );
  for (const row of rows.slice(2))
    assert.equal((await revealContact(String(row._id))).status, 404);
  const responses = await Promise.all([
    revealContact(contactId),
    revealContact(contactId),
  ]);
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const data = sellerContactSchema.parse((await response.json()).data);
    assert.deepEqual(data, {
      listingId: contactId,
      interested: true,
      seller: { name: "Private Seller", mobile: "+919000000002" },
    });
  }
  assert.equal(
    await ListingInterest.countDocuments(),
    1,
    "concurrent retries must not duplicate interest",
  );
  const interestBeforeRead = await ListingInterest.findOne({
    listingId: contactId,
    userId: buyer._id,
  }).lean();
  const returningToken = randomBytes(32).toString("hex");
  await MobileSession.create({
    user: buyer._id,
    provider: "test",
    accessHash: hashToken(returningToken),
    refreshHash: hashToken(randomBytes(32).toString("hex")),
    accessExpiresAt: new Date(Date.now() + 900000),
    expiresAt: new Date(Date.now() + 86400000),
  });
  const reopened = await readInterest(contactId, returningToken);
  assert.equal(reopened.status, 200);
  assert.equal(reopened.headers.get("cache-control"), "no-store");
  assert.equal(
    sellerContactSchema.parse((await reopened.json()).data).seller.mobile,
    "+919000000002",
  );
  assert.deepEqual(
    await ListingInterest.findById(interestBeforeRead!._id).lean(),
    interestBeforeRead,
    "restoring must not write or recreate interest",
  );
  const anotherBuyer = await User.create({
    name: "Another buyer",
    mobile: "9000000004",
    village: village._id,
  });
  const anotherToken = randomBytes(32).toString("hex");
  await MobileSession.create({
    user: anotherBuyer._id,
    provider: "test",
    accessHash: hashToken(anotherToken),
    refreshHash: hashToken(randomBytes(32).toString("hex")),
    accessExpiresAt: new Date(Date.now() + 900000),
    expiresAt: new Date(Date.now() + 86400000),
  });
  assert.deepEqual(
    (await (await readInterest(contactId, anotherToken)).json()).data,
    { listingId: contactId, interested: false },
    "another account must not inherit contact access",
  );
  assert.equal(await ListingInterest.countDocuments(), 1);
  console.log(
    "PASS: saved interest restores contact for the same account/new session without a write; other buyers remain protected.",
  );
  const sellerToken = randomBytes(32).toString("hex");
  await MobileSession.create({
    user: seller._id,
    provider: "test",
    accessHash: hashToken(sellerToken),
    refreshHash: hashToken(randomBytes(32).toString("hex")),
    accessExpiresAt: new Date(Date.now() + 900000),
    expiresAt: new Date(Date.now() + 86400000),
  });
  assert.equal(
    (await revealContact(contactId, sellerToken)).status,
    403,
    "seller cannot create self-interest",
  );
  const ownHidden = mobileListingPageSchema.parse(
    (await (await list(request("?limit=5", sellerToken))).json()).data,
  );
  assert.equal(
    ownHidden.total,
    0,
    "Home/Marketplace excludes the viewer's own products before counting",
  );
  assert.deepEqual(ownHidden.listings, []);
  assert.deepEqual(
    ownHidden.categories,
    [],
    "own-only categories are excluded too",
  );
  const ownedResponse = await ownListings(
    new Request("http://localhost/api/v1/listings/mine?status=active", {
      headers: { Authorization: `Bearer ${sellerToken}` },
    }),
  );
  assert.equal(ownedResponse.status, 200);
  assert.ok(
    (await ownedResponse.json()).data.listings.some(
      (item: { id: string }) => item.id === contactId,
    ),
    "My Listings still includes the owner's products",
  );
  await User.updateOne(
    { _id: anotherBuyer._id },
    { $set: { roles: ["buyer", "seller"] } },
  );
  const otherOffer = await Listing.create({
    ...base,
    seller: anotherBuyer._id,
    productName: "Other seller mango",
    productGroup: "fruits",
  });
  const browseOther = mobileListingPageSchema.parse(
    (await (await list(request("?page=1&limit=1", sellerToken))).json()).data,
  );
  assert.equal(browseOther.total, 1);
  assert.equal(browseOther.listings[0].id, String(otherOffer._id));
  assert.equal(
    (await (await list(request("?productGroup=dairy", sellerToken))).json())
      .data.total,
    0,
  );
  assert.equal(
    (
      await (
        await list(
          request("?search=Other%20seller&productGroup=fruits", sellerToken),
        )
      ).json()
    ).data.total,
    1,
  );
  assert.equal(
    (await (await list(request("?page=2&limit=1", sellerToken))).json()).data
      .listings.length,
    0,
  );
  assert.equal(
    (await (await list(request("", anotherToken))).json()).data.total,
    2,
    "each seller can browse other sellers without their own offer",
  );
  await Listing.deleteOne({ _id: otherOffer._id });
  await User.updateOne(
    { _id: anotherBuyer._id },
    { $set: { roles: ["buyer"] } },
  );
  console.log(
    "PASS: Marketplace/Home excludes own offers before pagination, totals and categories, while My Listings retains them and other sellers remain browsable.",
  );
  const noticeResponses = await Promise.all([
    notify(contactId),
    notify(contactId),
  ]);
  const notificationResults = [];
  for (const response of noticeResponses) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    notificationResults.push(
      notifySellerResultSchema.parse((await response.json()).data),
    );
  }
  assert.deepEqual(
    notificationResults[0],
    notificationResults[1],
    "unknown-outcome retry must replay the same notification",
  );
  assert.equal(await Notification.countDocuments(), 1);
  const repeat = await notify(contactId, "notify-new-key-same-day");
  assert.equal(
    notifySellerResultSchema.parse((await repeat.json()).data).notificationId,
    notificationResults[0].notificationId,
  );
  assert.equal(
    await Notification.countDocuments(),
    1,
    "new keys within 24 hours must not spam the seller",
  );
  assert.equal(
    (await notify(String(rows[0]._id))).status,
    409,
    "a key cannot target a different product",
  );
  assert.equal(
    (await notify(contactId, "notify-own-01", sellerToken)).status,
    403,
  );
  const sellerInboxResponse = await inbox(sellerToken);
  assert.equal(sellerInboxResponse.headers.get("cache-control"), "no-store");
  const sellerInbox = notificationPageSchema.parse(
    (await sellerInboxResponse.json()).data,
  );
  assert.equal(sellerInbox.total, 1);
  assert.match(sellerInbox.notifications[0].body, /Buyer.*Milk/);
  const mrInbox = notificationPageSchema.parse(
    (await (await inbox(sellerToken, "?language=mr")).json()).data,
  );
  assert.match(mrInbox.notifications[0].title, /खरेदीदार/);
  assert.equal((await (await inbox(token)).json()).data.total, 0);
  assert.equal((await (await inbox(anotherToken)).json()).data.total, 0);
  const rawNotice = JSON.stringify(await Notification.findOne().lean());
  for (const secret of [
    "9000000001",
    "9000000002",
    token,
    "accessHash",
    "refreshHash",
  ])
    assert.equal(rawNotice.includes(secret), false);
  assert.equal(JSON.stringify(sellerInbox).includes(String(buyer._id)), false);
  const notifyRateKey = hashToken(
    `notify-seller:${buyer._id}:${Math.floor(Date.now() / 3600_000)}`,
  );
  await MobileRateLimit.updateOne(
    { key: notifyRateKey },
    { $set: { count: 20 } },
  );
  assert.equal((await notify(contactId, "notify-throttled-01")).status, 429);
  await MobileRateLimit.deleteOne({ key: notifyRateKey });
  console.log(
    "PASS: Notify seller commits one real in-app notice, supports durable-key replay/24-hour deduplication, enforces interest/auth/ownership/rate limits, and exposes only recipient-localized inbox data.",
  );
  await User.updateOne({ _id: seller._id }, { $unset: { mobile: 1 } });
  assert.equal((await revealContact(contactId)).status, 422);
  assert.equal((await readInterest(contactId)).status, 422);
  await User.updateOne(
    { _id: seller._id },
    { $set: { mobile: "9000000002", status: "blocked" } },
  );
  assert.equal((await revealContact(contactId)).status, 404);
  assert.equal((await readInterest(contactId)).status, 404);
  assert.equal((await notify(contactId, "notify-blocked-seller")).status, 404);
  await User.updateOne({ _id: seller._id }, { $set: { status: "active" } });
  const rateKey = hashToken(
    `listing-contact:${buyer._id}:${Math.floor(Date.now() / 3600_000)}`,
  );
  await MobileRateLimit.updateOne({ key: rateKey }, { $set: { count: 60 } });
  assert.equal((await revealContact(contactId)).status, 429);
  await MobileRateLimit.deleteOne({ key: rateKey });
  assert.equal(await ListingInterest.countDocuments(), 1);
  console.log(
    "PASS: protected seller contact: explicit action only, real name/number, concurrent idempotency, no-store, scope/auth/status/demo/self checks and throttling.",
  );
  const legacyRequestId = notificationResults[0].notificationId;
  assert.equal(
    (await callback(legacyRequestId, sellerToken)).status,
    403,
    "legacy notices do not grant buyer callback permission",
  );
  assert.equal((await activity(null, "sent")).status, 401);
  assert.equal(
    (await activity(token, "sent", `&userId=${anotherBuyer._id}`)).status,
    422,
  );
  const legacySent = requestPageSchema.parse(
    (await (await activity(token, "sent")).json()).data,
  );
  assert.equal(legacySent.requests[0].quantity, null);
  assert.equal(
    legacySent.requests[0].status,
    "new",
    "listing requests does not mark them seen",
  );
  const requestProduct = await Listing.create({
    ...base,
    productName: "Request Tomato",
    minimumPurchaseQuantity: 5,
    photoObjectKey: "listings/narayangaon-demo-v1/tomato.webp",
  });
  const requestListingId = String(requestProduct._id);
  await revealContact(requestListingId);
  const newBody = { quantity: 10, callbackConsent: true };
  for (const quantity of [0, -1, 41, 4])
    assert.equal(
      (
        await notify(requestListingId, `request-invalid-${quantity}`, token, {
          ...newBody,
          quantity,
        })
      ).status,
      422,
    );
  assert.equal(
    (
      await notify(requestListingId, "request-no-consent", token, {
        quantity: 10,
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await notify(requestListingId, "request-no-quantity", token, {
        callbackConsent: true,
      })
    ).status,
    422,
  );
  const createdRequestResponse = await notify(
    requestListingId,
    "request-with-quantity",
    token,
    newBody,
  );
  assert.equal(createdRequestResponse.status, 200);
  const createdRequest = notifySellerResultSchema.parse(
    (await createdRequestResponse.json()).data,
  );
  const replayRequest = await notify(
    requestListingId,
    "request-with-quantity",
    token,
    newBody,
  );
  assert.deepEqual((await replayRequest.json()).data, createdRequest);
  assert.equal(
    (
      await notify(requestListingId, "request-with-quantity", token, {
        ...newBody,
        quantity: 11,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await notify(requestListingId, "request-different-quantity", token, {
        ...newBody,
        quantity: 11,
      })
    ).status,
    409,
    "deduplication must not silently accept a different quantity",
  );
  const sentResponse = await activity(token, "sent");
  assert.equal(sentResponse.headers.get("cache-control"), "no-store");
  const sent = requestPageSchema.parse((await sentResponse.json()).data);
  const received = requestPageSchema.parse(
    (await (await activity(sellerToken, "received")).json()).data,
  );
  assert.equal(sent.total, 2);
  assert.equal(received.total, 2);
  const sentItem = sent.requests.find(
    (item) => item.id === createdRequest.notificationId,
  )!;
  const receivedItem = received.requests.find(
    (item) => item.id === createdRequest.notificationId,
  )!;
  assert.equal(sentItem.quantity, 10);
  assert.equal(sentItem.product.unit, "kg");
  assert.equal(sentItem.person.name, "Private Seller");
  assert.equal(receivedItem.person.name, "Buyer");
  assert.equal(receivedItem.person.village?.name, "Home");
  assert.equal(receivedItem.status, "new");
  assert.equal(receivedItem.canCall, true);
  assert.equal(sentItem.canCall, true);
  assert.equal(
    (await (await activity(anotherToken, "sent")).json()).data.total,
    0,
  );
  assert.equal(
    (await (await activity(anotherToken, "received")).json()).data.total,
    0,
  );
  for (const privateValue of [
    "9000000001",
    "9000000002",
    "mobile",
    "accessHash",
    "refreshHash",
  ])
    assert.equal(JSON.stringify(received).includes(privateValue), false);
  assert.equal(
    (await statusAction(createdRequest.notificationId, token, "seen")).status,
    404,
    "buyer cannot mark their sent request as seen",
  );
  assert.equal(
    (
      await statusAction(
        createdRequest.notificationId,
        anotherToken,
        "responded",
      )
    ).status,
    404,
  );
  assert.equal(
    (await statusAction(createdRequest.notificationId, sellerToken, "answered"))
      .status,
    422,
  );
  assert.equal(
    (await callback(createdRequest.notificationId, null)).status,
    401,
  );
  assert.equal(
    (await callback(createdRequest.notificationId, anotherToken)).status,
    404,
  );
  const buyerContact = await callback(
    createdRequest.notificationId,
    sellerToken,
  );
  assert.equal(buyerContact.headers.get("cache-control"), "no-store");
  assert.equal(
    requestContactSchema.parse((await buyerContact.json()).data).mobile,
    "+919000000001",
  );
  assert.equal(
    requestContactSchema.parse(
      (await (await callback(createdRequest.notificationId, token)).json())
        .data,
    ).mobile,
    "+919000000002",
  );
  assert.equal(
    (await Notification.findById(createdRequest.notificationId))?.respondedAt,
    null,
    "contact access never means an answered call",
  );
  const seen = requestStateSchema.parse(
    (
      await (
        await statusAction(createdRequest.notificationId, sellerToken, "seen")
      ).json()
    ).data,
  );
  const seenAgain = requestStateSchema.parse(
    (
      await (
        await statusAction(createdRequest.notificationId, sellerToken, "seen")
      ).json()
    ).data,
  );
  assert.equal(seen.status, "seen");
  assert.deepEqual(
    seenAgain,
    seen,
    "seen retries must preserve the first timestamp",
  );
  assert.equal(
    (await (await activity(token, "sent")).json()).data.requests.find(
      (item: { id: string }) => item.id === createdRequest.notificationId,
    ).status,
    "seen",
  );
  const responded = requestStateSchema.parse(
    (
      await (
        await statusAction(
          createdRequest.notificationId,
          sellerToken,
          "responded",
        )
      ).json()
    ).data,
  );
  assert.equal(responded.status, "responded");
  assert.equal(responded.seenAt, seen.seenAt);
  assert.deepEqual(
    (
      await (
        await statusAction(
          createdRequest.notificationId,
          sellerToken,
          "responded",
        )
      ).json()
    ).data,
    responded,
  );
  assert.deepEqual(
    (
      await (
        await statusAction(createdRequest.notificationId, sellerToken, "seen")
      ).json()
    ).data,
    responded,
    "late seen cannot downgrade responded",
  );
  const concurrentStates = await Promise.all([
    statusAction(legacyRequestId, sellerToken, "seen"),
    statusAction(legacyRequestId, sellerToken, "responded"),
  ]);
  for (const response of concurrentStates) assert.equal(response.status, 200);
  const concurrentFinal = requestPageSchema
    .parse((await (await activity(token, "sent")).json()).data)
    .requests.find((item) => item.id === legacyRequestId)!;
  assert.equal(concurrentFinal.status, "responded");
  assert.ok(concurrentFinal.seenAt && concurrentFinal.respondedAt);
  assert.equal(
    (await callback(legacyRequestId, sellerToken)).status,
    403,
    "status changes cannot grant legacy callback permission",
  );
  await User.updateOne({ _id: buyer._id }, { $set: { village: other._id } });
  assert.equal(
    (await callback(createdRequest.notificationId, sellerToken)).status,
    422,
    "callback rechecks the buyer's current village",
  );
  await User.updateOne({ _id: buyer._id }, { $set: { village: village._id } });
  await Listing.updateOne(
    { _id: requestProduct._id },
    {
      $set: {
        unit: "litre",
        productName: "Changed crop",
        status: "deactivated",
      },
    },
  );
  const history = requestPageSchema
    .parse((await (await activity(token, "sent")).json()).data)
    .requests.find((item) => item.id === createdRequest.notificationId)!;
  assert.equal(history.product.unit, "kg");
  assert.equal(history.product.name, "Request Tomato");
  assert.equal(history.canCall, false);
  assert.equal(
    (await callback(createdRequest.notificationId, sellerToken)).status,
    422,
  );
  console.log(
    "PASS: buyer/seller request flow: quantity/consent validation, participant-only histories, protected callbacks, legacy privacy, monotonic idempotent seen/responded and preserved product snapshots.",
  );
  for (const row of rows.slice(2))
    assert.equal((await getDetail(String(row._id))).status, 404);
  assert.equal((await getDetail("1")).status, 422);
  assert.equal(
    (await getDetail(String(new mongoose.Types.ObjectId()))).status,
    404,
  );
  await User.updateOne(
    { _id: buyer._id },
    { $set: { roles: ["buyer", "seller"] } },
  );
  assert.equal((await (await list(request())).json()).data.isSeller, true);
  await Listing.updateMany(
    { _id: { $in: rows.slice(0, 2).map((row) => row._id) } },
    { $set: { expiresAt: new Date(0) } },
  );
  const empty = (await (await list(request())).json()).data;
  assert.equal((await notify(contactId, "notify-expired-01")).status, 404);
  assert.equal(
    (await notify(contactId)).status,
    200,
    "retry confirms only the earlier committed notice after expiry",
  );
  assert.equal(await Notification.countDocuments(), 2);
  assert.equal(
    (await readInterest(contactId)).status,
    404,
    "saved interest cannot restore expired contact",
  );
  assert.equal(
    (await revealContact(contactId)).status,
    404,
    "a prior interest cannot reveal an expired listing",
  );
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.listings, []);
  await Village.updateOne({ _id: village._id }, { $set: { isActive: false } });
  assert.equal((await list(request())).status, 422);
  await User.updateOne({ _id: buyer._id }, { $set: { status: "blocked" } });
  assert.equal((await list(request())).status, 401);
  console.log(
    "PASS: database listing routes: auth, village scope, expiry/status/seller/category visibility, pagination, literal bilingual search, safe DTOs, null fields and no-store.",
  );
} finally {
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === databaseName &&
    /^gaavli_listing_test_[a-f0-9]{16}$/.test(databaseName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
