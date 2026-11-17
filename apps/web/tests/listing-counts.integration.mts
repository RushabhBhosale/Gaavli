// Counts use real routes and only a fresh isolated test database.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import {
  listingOffersSchema,
  mobileListingPageSchema,
} from "@gaavli/validation";

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
const { GET: offersRoute } =
  await import("../src/app/api/v1/listings/[id]/offers/route");
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
  // Sellers of one product and unit share a card, so every listing in the
  // count scenarios below gets its own product name; grouping has its own test.
  let serial = 0;
  const distinct = <T extends { productName: string }>(rows: T[]) =>
    rows.map((row) => ({
      ...row,
      productName: `${row.productName} ${++serial}`,
    }));
  await Listing.create(
    distinct([
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
    ]),
  );
  async function page(
    params: Record<string, string> = {},
    signedIn = false,
    source = String(village._id),
  ) {
    const query = new URLSearchParams({
      sourceVillageId: source,
      villageId: source,
      includeProductGroupCounts: "true",
      includeAllProductCount: "true",
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
  assert.equal(
    guest.allProductCount,
    7,
    "All ignores the selected group and page limit",
  );
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
  assert.equal(
    signedIn.allProductCount,
    6,
    "All excludes the viewer's own products",
  );
  const search = await page({ search: "Apple", productGroup: "vegetables" });
  assert.equal(search.total, 0);
  assert.equal(count(search, "fruits"), 2);
  assert.equal(count(search, "vegetables"), 0);
  assert.equal(
    search.allProductCount,
    2,
    "All respects the search even when the selected group is empty",
  );
  const changed = await page({}, false, String(other._id));
  assert.equal(count(changed, "vegetables"), 7);
  assert.equal(count(changed, "fruits"), 0);
  assert.equal(changed.allProductCount, 7, "All uses the selected village");
  await Listing.create({
    ...base,
    productName: "Legacy product",
    productGroup: null,
  });
  assert.equal(
    (await page({ productGroup: "fruits" })).allProductCount,
    8,
    "All includes unclassified legacy listings",
  );
  assert.equal((await page({ search: "no-match" })).allProductCount, 0);
  const groupOnly = await GET(
    new Request(
      `http://localhost/api/v1/listings?sourceVillageId=${village._id}&includeProductGroupCounts=true`,
    ),
  );
  assert.equal(groupOnly.status, 200);
  assert.equal(
    "allProductCount" in (await groupOnly.json()).data,
    false,
    "old category-count clients keep their response shape",
  );
  const legacy = await GET(
    new Request(
      `http://localhost/api/v1/listings?sourceVillageId=${village._id}`,
    ),
  );
  assert.equal(legacy.status, 200);
  const legacyData = (await legacy.json()).data;
  assert.equal("allProductCount" in legacyData, false);
  assert.equal(
    "productGroupCounts" in legacyData,
    false,
    "existing clients keep their strict response contract",
  );
  mobileListingPageSchema.omit({ productGroupCounts: true }).parse(legacyData);
  // Unavailable discovery is listing-based, paginated and uses the same privacy scope.
  const initialUnavailable = await page({
    availability: "unavailable",
    limit: "5",
  });
  assert.equal(initialUnavailable.total, 2);
  const added = await Listing.create(
    distinct([
      ...Array.from({ length: 6 }, (_, index) => ({
        ...base,
        productName: `Unavailable ${index}`,
        status: "sold_out",
        quantity: 0,
      })),
      { ...base, productName: "Zero stock", quantity: 0 },
      { ...base, productName: "Expired status", status: "expired" },
      { ...base, status: "deactivated" },
      { ...base, status: "reported" },
      { ...base, status: "pending" },
      { ...base, status: "sold_out", village: other._id },
      { ...base, status: "sold_out", seller: viewer._id },
    ]),
  );
  const unavailablePages = await Promise.all(
    [1, 2].map((index) =>
      page(
        {
          availability: "unavailable",
          page: String(index),
          limit: "5",
        },
        true,
      ),
    ),
  );
  assert.equal(unavailablePages[0].total, 10);
  assert.deepEqual(
    unavailablePages.map((data) => data.listings.length),
    [5, 5],
  );
  const unavailableRows = unavailablePages.flatMap((data) => data.listings);
  const unavailableIds = new Set(unavailableRows.map((row) => row.id));
  assert.equal(unavailableIds.size, 10, "pages have no duplicates");
  for (const row of added.slice(8))
    assert.equal(unavailableIds.has(String(row._id)), false);
  for (const row of unavailableRows) {
    assert.equal(row.village.id, String(village._id));
    assert.equal("seller" in row || "mobile" in row, false);
  }
  const available = await page({ limit: "50" }, true);
  assert.ok(available.listings.every((row) => !unavailableIds.has(row.id)));
  assert.equal(
    (
      await page(
        { availability: "unavailable", search: "Unavailable", limit: "5" },
        true,
      )
    ).total,
    6,
  );
  assert.equal(
    (await page({ availability: "unavailable", productGroup: "fruits" }, true))
      .total,
    0,
  );
  assert.equal(
    (await page({ availability: "unavailable", search: "never-listed" })).total,
    0,
  );
  // Several sellers of the same product and unit: one card, a price range, and
  // every offer (cheapest first) on the details page.
  const [second, third] = await User.create([
    {
      name: "Meera Jadhav",
      village: village._id,
      roles: ["buyer", "seller"],
      mobile: "9876500002",
    },
    {
      name: "Anand Shinde",
      village: village._id,
      roles: ["buyer", "seller"],
      mobile: "9876500003",
    },
  ]);
  const onion = { ...base, productName: "Onion", productGroup: "vegetables" };
  const onions = await Listing.create([
    { ...onion, seller: seller._id, price: 30 },
    { ...onion, seller: second._id, price: 20 },
    { ...onion, seller: third._id, price: 32, productName: " ONION " },
    { ...onion, seller: third._id, price: 400, unit: "quintal" },
  ]);
  const onionPage = await page({ search: "Onion", limit: "10" }, true);
  assert.equal(onionPage.total, 2, "kg and quintal stay separate cards");
  assert.equal(onionPage.listings.length, 2);
  const kg = onionPage.listings.find((row) => row.unit === "kg")!;
  assert.deepEqual(
    [kg.offerCount, kg.minPrice, kg.maxPrice, kg.price],
    [3, 20, 32, 20],
    "the card shows the cheapest offer and the full range",
  );
  const single = onionPage.listings.find((row) => row.unit === "quintal")!;
  assert.deepEqual(
    [single.offerCount, single.minPrice, single.maxPrice],
    [1, 400, 400],
  );
  assert.equal(
    count(
      await page({ search: "Onion", productGroup: "vegetables" }, true),
      "vegetables",
    ),
    2,
    "category chips count products, not sellers",
  );
  const offerFor = async (id: string, authenticated: boolean) => {
    const response = await offersRoute(
      new Request(
        `http://localhost/api/v1/listings/${id}/offers?sourceVillageId=${village._id}`,
        { headers: authenticated ? { Authorization: `Bearer ${token}` } : {} },
      ),
      { params: Promise.resolve({ id }) },
    );
    return response;
  };
  for (const authenticated of [true, false]) {
    const response = await offerFor(String(onions[0]._id), authenticated);
    assert.equal(response.status, 200);
    const { offers } = listingOffersSchema.parse((await response.json()).data);
    assert.deepEqual(
      offers.map((offer) => offer.price),
      [20, 30, 32],
      "every seller's offer, cheapest first, same unit only",
    );
    if (authenticated)
      assert.deepEqual(
        offers.map((offer) => offer.seller),
        [
          { name: "Meera Jadhav", mobile: "+919876500002" },
          { name: "Seller", mobile: null },
          { name: "Anand Shinde", mobile: "+919876500003" },
        ],
        "a signed-in buyer sees each seller's name and phone",
      );
    else
      assert.deepEqual(
        offers.map((offer) => offer.seller),
        [null, null, null],
        "guests get no names or phone numbers",
      );
  }
  assert.equal(
    (await offerFor(String(new mongoose.Types.ObjectId()), true)).status,
    404,
  );
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
