import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import {
  coordinatorUsersSchema,
  coordinatorDashboardSchema,
  coordinatorConnectionsSchema,
  coordinatorActivityPageSchema,
  mobileUserSchema,
} from "@gaavli/validation";
nextEnv.loadEnvConfig(process.cwd());
const databaseName = `gaavli_coordinator_test_${randomBytes(8).toString("hex")}`;
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
const { User, Village, VillageCoordinator, Listing, Category, AuditLog } =
  await import("../src/server/models");
const { VillageConnection, VillageReport } =
  await import("../src/server/models/coordinator");
const { MobileSession } = await import("../src/server/models/mobile-auth");
const { hashToken } = await import("../src/server/auth/mobile-policy");
const handlers = await import("../src/app/api/v1/coordinator/[...path]/route");
const listings = await import("../src/app/api/v1/listings/route");
const details = await import("../src/app/api/v1/listings/[id]/route");
const interested =
  await import("../src/app/api/v1/listings/[id]/interested/route");
const reportRoute =
  await import("../src/app/api/v1/listings/[id]/reports/route");
const { mobileUserDto } = await import("../src/server/repositories/mobile");
const userRoute = await import("../src/app/api/v1/users/me/route");
const { sendOtp, verifyOtp } =
  await import("../src/server/services/mobile-auth");
const token = randomBytes(32).toString("hex"),
  buyerToken = randomBytes(32).toString("hex"),
  otherToken = randomBytes(32).toString("hex");
const context = (id: string) => ({ params: Promise.resolve({ id }) });
function req(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
  bearer: string | null = token,
  origin?: string,
) {
  return new Request(`http://localhost/api/v1${path}`, {
    method,
    headers: {
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(key ? { "Idempotency-Key": key } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function call(
  path: string,
  method: keyof Pick<
    typeof handlers,
    "GET" | "POST" | "PATCH" | "DELETE"
  > = "GET",
  body?: unknown,
  key?: string,
  bearer: string | null = token,
  origin?: string,
) {
  return handlers[method](
    req(`/coordinator/${path}`, method, body, key, bearer, origin),
    { params: Promise.resolve({ path: path.split("?")[0].split("/") }) },
  );
}
async function check(response: Response, status = 200, code?: string) {
  const value = await response.json();
  assert.equal(response.status, status, JSON.stringify(value));
  assert.equal(response.headers.get("cache-control"), "no-store");
  if (code) assert.equal(value.error.code, code);
  return value.data;
}
try {
  await connectMobileDb();
  await Promise.all([
    VillageCoordinator.init(),
    VillageConnection.init(),
    VillageReport.init(),
  ]);
  const [a, b, c] = await Village.create([
    {
      nameEn: "Palaspe",
      nameMr: "पळस्पे",
      taluka: "Panvel",
      district: "Raigad",
      isActive: true,
      location: { type: "Point", coordinates: [73.1, 18.9] },
    },
    {
      nameEn: "Morbe",
      nameMr: "मोरबे",
      taluka: "Panvel",
      district: "Raigad",
      isActive: true,
      location: { type: "Point", coordinates: [73.11, 18.91] },
    },
    {
      nameEn: "Far village",
      nameMr: "दूरचे गाव",
      taluka: "Karjat",
      district: "Other district",
      isActive: true,
    },
  ]);
  const [coordinator, buyer, seller] = await User.create([
    {
      name: "Coordinator",
      mobile: "9876543210",
      roles: ["buyer", "coordinator", "seller"],
      village: a._id,
      status: "active",
      mobileVerified: true,
    },
    {
      name: "Buyer",
      mobile: "9876543211",
      roles: ["buyer"],
      village: a._id,
      status: "active",
      mobileVerified: true,
    },
    {
      name: "Far seller",
      mobile: "9876543212",
      roles: ["buyer", "seller"],
      village: b._id,
      status: "active",
      mobileVerified: true,
    },
  ]);
  await MobileSession.create(
    [
      [coordinator, token],
      [buyer, buyerToken],
      [seller, otherToken],
    ].map(([user, bearer]) => ({
      user: (user as typeof buyer)._id,
      provider: "test",
      accessHash: hashToken(bearer as string),
      refreshHash: hashToken(`${bearer}-refresh`),
      accessExpiresAt: new Date(Date.now() + 3600000),
      expiresAt: new Date(Date.now() + 86400000),
    })),
  );
  const pendingRole = mobileUserSchema.parse(
    await check(await userRoute.GET(req("/users/me"))),
  );
  assert.equal(pendingRole.isCoordinator, true);
  assert.equal(pendingRole.isSeller, true);
  assert.deepEqual(pendingRole.coordinatorVillages, []);
  assert.equal((await mobileUserDto(buyer)).isCoordinator, false);
  // Role identity is visible but alone cannot authorize any village work.
  await check(await call("dashboard"), 403, "COORDINATOR_REQUIRED");
  await VillageCoordinator.create({
    userId: coordinator._id,
    villageId: a._id,
  });
  const assignedRole = mobileUserSchema.parse(
    await check(await userRoute.GET(req("/users/me"))),
  );
  assert.equal(assignedRole.isCoordinator, true);
  assert.equal(assignedRole.coordinatorVillages.length, 1);
  const aid = String(a._id),
    bid = String(b._id);
  const scoped = (path: string) =>
    `${path}${path.includes("?") ? "&" : "?"}villageId=${aid}`;
  await check(await call("dashboard", "GET", undefined, undefined, null), 401);
  await check(
    await call("dashboard", "GET", undefined, undefined, buyerToken),
    403,
  );
  await check(await call(`dashboard?villageId=${bid}`), 403);
  await check(await call("dashboard?extra=bad"), 422);
  await check(
    await call(
      "dashboard",
      "GET",
      undefined,
      undefined,
      token,
      "https://other.example",
    ),
    403,
  );
  assert.equal(
    (await mobileUserDto(coordinator)).coordinatorVillages.length,
    1,
  );
  const buyerInput = {
    firstName: "Rahul",
    lastName: "More",
    mobile: "+91 9876543213",
  };
  const created = await check(
    await call(scoped("buyers"), "POST", buyerInput, "buyer-registration-01"),
  );
  assert.deepEqual(
    await check(
      await call(scoped("buyers"), "POST", buyerInput, "buyer-registration-01"),
    ),
    created,
  );
  await check(
    await call(scoped("buyers"), "POST", buyerInput, "buyer-duplicate-02"),
    409,
    "MOBILE_ALREADY_EXISTS",
  );
  await check(
    await call(
      scoped("buyers"),
      "POST",
      { ...buyerInput, roles: ["coordinator"] },
      "inject-roles-01",
    ),
    422,
  );
  await check(
    await call(
      scoped("buyers"),
      "POST",
      { ...buyerInput, mobile: seller.mobile },
      "foreign-duplicate",
    ),
    409,
  );
  const preregistered = await User.findById(created.id);
  assert.ok(preregistered);
  assert.deepEqual(preregistered.roles, ["buyer"]);
  assert.equal(preregistered.mobileVerified, false);
  assert.equal(
    String(preregistered.createdByCoordinator),
    String(coordinator._id),
  );
  const page = coordinatorUsersSchema.parse(
    await check(await call(scoped("users?filter=preregistered&search=RAH"))),
  );
  assert.equal(page.total, 1);
  assert.equal(page.users[0].mobile, "9876543213");
  assert.equal(page.users[0].canEdit, true);
  assert.equal(
    (await check(await call(scoped("users?search=9876543213")))).total,
    1,
  );
  await check(await call(scoped(`users/${seller._id}`)), 404);
  await check(
    await call(
      scoped(`users/${buyer._id}`),
      "PATCH",
      { firstName: "A", lastName: "B", version: 0 },
      "edit-verified",
    ),
    403,
  );
  await check(
    await call(
      scoped(`users/${created.id}`),
      "PATCH",
      {
        firstName: "Rahul",
        lastName: "Patil",
        mobile: "9999999999",
        version: 0,
      },
      "edit-phone",
    ),
    422,
  );
  await check(
    await call(
      scoped(`users/${created.id}`),
      "PATCH",
      { firstName: "Rahul", lastName: "Patil", version: 0 },
      "edit-pre-buyer",
    ),
  );
  await check(
    await call(
      scoped(`users/${created.id}`),
      "PATCH",
      { firstName: "Other", lastName: "Name", version: 0 },
      "stale-pre-buyer",
    ),
    409,
    "STALE_VERSION",
  );
  const otp = await sendOtp(
    { mobile: "9876543213", language: "en" },
    "coordinator-test",
  );
  const verified = await verifyOtp(
    { challengeId: otp.challengeId, code: "123456" },
    "coordinator-test",
  );
  assert.equal(verified.user.id, created.id);
  assert.equal(verified.user.name, "Rahul Patil");
  assert.equal(verified.user.village?.id, aid);
  assert.equal(await User.countDocuments({ mobile: "9876543213" }), 1);
  assert.equal((await User.findById(created.id))?.mobileVerified, true);
  await check(
    await call(
      scoped(`users/${created.id}`),
      "PATCH",
      { firstName: "No", lastName: "Change", version: 2 },
      "edit-after-verify",
    ),
    403,
  );
  console.log(
    "PASS: pre-registration, normalized duplicate handling, scoped directory, permitted corrections, stale versions and same-account OTP linking.",
  );
  await Category.create({
    code: "PERISHABLE",
    name: "Vegetables",
    nameMr: "भाजीपाला",
    defaultShelfLife: "2 days",
    status: "ACTIVE",
    notifyMode: "daily_digest",
  });
  const product = await Listing.create({
    productName: "Tomato",
    village: b._id,
    seller: seller._id,
    category: "PERISHABLE",
    quantity: 50,
    unit: "kg",
    price: 30,
    status: "active",
    expiresAt: new Date(Date.now() + 86400000),
  });
  const ownProduct = await Listing.create({
    productName: "Onion",
    village: a._id,
    seller: coordinator._id,
    category: "PERISHABLE",
    quantity: 10,
    unit: "kg",
    price: 20,
    status: "active",
    expiresAt: new Date(Date.now() + 86400000),
  });
  assert.equal(
    (
      await check(
        await listings.GET(
          req("/listings", "GET", undefined, undefined, buyerToken),
        ),
      )
    ).listings.some((row: { id: string }) => row.id === String(product._id)),
    false,
  );
  await check(
    await call(
      scoped(`villages/${aid}/connections`),
      "POST",
      { targetVillageId: aid },
      "self-connection",
    ),
    422,
  );
  await Village.updateOne({ _id: c._id }, { $set: { district: "Raigad" } });
  const allCandidates = await check(
    await call(scoped(`villages/${aid}/candidates?area=all`)),
  );
  assert.equal(allCandidates.total, 2);
  const talukaCandidates = await check(
    await call(scoped(`villages/${aid}/candidates?area=taluka`)),
  );
  assert.equal(talukaCandidates.total, 1);
  assert.equal(talukaCandidates.villages[0].id, bid);
  const districtCandidates = await check(
    await call(scoped(`villages/${aid}/candidates?area=district`)),
  );
  assert.equal(districtCandidates.total, 2);
  const otherTalukas = await check(
    await call(scoped(`villages/${aid}/candidates?area=other_talukas`)),
  );
  assert.equal(otherTalukas.total, 1);
  assert.equal(otherTalukas.villages[0].id, String(c._id));
  assert.equal(
    (
      await check(
        await call(
          scoped(`villages/${aid}/candidates?area=other_talukas&search=Morbe`),
        ),
      )
    ).total,
    0,
  );
  const otherPage = await check(
    await call(
      scoped(`villages/${aid}/candidates?area=other_talukas&page=2&limit=1`),
    ),
  );
  assert.equal(otherPage.total, 1);
  assert.equal(otherPage.villages.length, 0);
  assert.equal(
    (
      await check(
        await call(scoped(`villages/${aid}/candidates?area=taluka&search=Far`)),
      )
    ).total,
    0,
  );
  const nextAreaPage = await check(
    await call(scoped(`villages/${aid}/candidates?area=taluka&page=2&limit=1`)),
  );
  assert.equal(nextAreaPage.total, 1);
  assert.equal(nextAreaPage.villages.length, 0);
  await check(
    await call(scoped(`villages/${aid}/candidates?area=invalid`)),
    422,
  );
  await Village.updateOne(
    { _id: c._id },
    { $set: { district: "Other district" } },
  );
  assert.equal(
    (
      await check(
        await call(scoped(`villages/${aid}/candidates?area=other_talukas`)),
      )
    ).total,
    0,
  );
  const connection = await check(
    await call(
      scoped(`villages/${aid}/connections`),
      "POST",
      { targetVillageId: bid },
      "add-connection",
    ),
  );
  assert.deepEqual(
    await check(
      await call(
        scoped(`villages/${aid}/connections`),
        "POST",
        { targetVillageId: bid },
        "add-connection-2",
      ),
    ),
    connection,
  );
  assert.equal(await VillageConnection.countDocuments({ active: true }), 1);
  await check(await call(`villages/${bid}/connections`), 403);
  const connections = coordinatorConnectionsSchema.parse(
    await check(await call(scoped(`villages/${aid}/connections`))),
  );
  assert.equal(connections.total, 1);
  const marketplacePage = await check(
    await listings.GET(
      req("/listings", "GET", undefined, undefined, buyerToken),
    ),
  );
  assert.equal(marketplacePage.total, 2);
  assert.deepEqual(
    marketplacePage.villageCounts.map((row: { id: string; count: number }) => [
      row.id,
      row.count,
    ]),
    [
      [aid, 1],
      [bid, 1],
    ],
  );
  const selectedVillagePage = await check(
    await listings.GET(
      req(
        `/listings?villageId=${bid}`,
        "GET",
        undefined,
        undefined,
        buyerToken,
      ),
    ),
  );
  assert.equal(selectedVillagePage.total, 1);
  assert.equal(selectedVillagePage.listings[0].id, String(product._id));
  assert.deepEqual(
    selectedVillagePage.villageCounts,
    marketplacePage.villageCounts,
  );
  const selectedPageTwo = await check(
    await listings.GET(
      req(
        `/listings?villageId=${bid}&page=2&limit=1`,
        "GET",
        undefined,
        undefined,
        buyerToken,
      ),
    ),
  );
  assert.equal(selectedPageTwo.total, 1);
  assert.equal(selectedPageTwo.listings.length, 0);
  const searchedVillage = await check(
    await listings.GET(
      req(
        `/listings?villageId=${aid}&search=Tomato`,
        "GET",
        undefined,
        undefined,
        buyerToken,
      ),
    ),
  );
  assert.equal(searchedVillage.total, 0);
  assert.equal(
    searchedVillage.villageCounts.find((row: { id: string }) => row.id === bid)
      .count,
    1,
  );
  assert.equal(
    searchedVillage.villageCounts.find((row: { id: string }) => row.id === aid)
      .count,
    0,
  );
  await check(
    await listings.GET(
      req(
        `/listings?villageId=${c._id}`,
        "GET",
        undefined,
        undefined,
        buyerToken,
      ),
    ),
    403,
    "VILLAGE_FILTER_UNAVAILABLE",
  );
  const candidates = await check(
    await call(scoped(`villages/${aid}/candidates?search=other%20district`)),
  );
  assert.equal(candidates.total, 1);
  assert.equal(candidates.villages[0].id, String(c._id));
  assert.equal(
    (
      await check(
        await call(
          scoped(`villages/${aid}/candidates?latitude=18.9&longitude=73.1`),
        ),
      )
    ).villages.some((v: { id: string }) => v.id === bid),
    false,
    "existing connection is not suggested again",
  );
  assert.equal(
    (
      await check(
        await listings.GET(
          req("/listings", "GET", undefined, undefined, buyerToken),
        ),
      )
    ).listings.some((row: { id: string }) => row.id === String(product._id)),
    true,
  );
  assert.equal(
    (
      await check(
        await listings.GET(
          req("/listings", "GET", undefined, undefined, otherToken),
        ),
      )
    ).listings.some((row: { id: string }) => row.id === String(ownProduct._id)),
    true,
  );
  await check(
    await interested.POST(
      req(
        `/listings/${product._id}/interested`,
        "POST",
        {},
        undefined,
        buyerToken,
      ),
      context(String(product._id)),
    ),
  );
  await VillageCoordinator.create({
    villageId: b._id,
    userId: coordinator._id,
  });
  assert.equal(
    (await mobileUserDto(coordinator)).coordinatorVillages.length,
    2,
  );
  await check(await call(`dashboard?villageId=${bid}`));
  console.log(
    "PASS: active assignment scope, multi-village selection, bidirectional marketplace/contact discovery, GPS/name/taluka/district candidates and duplicate prevention.",
  );
  const report = await check(
    await reportRoute.POST(
      req(
        `/listings/${product._id}/reports`,
        "POST",
        { reason: "Product information is misleading." },
        "buyer-report-01",
        buyerToken,
      ),
      context(String(product._id)),
    ),
  );
  const reportQuery = `reports/${report.id}?villageId=${bid}`;
  await check(await call(scoped(`reports/${report.id}`)), 404);
  await check(await call(reportQuery));
  await check(
    await call(
      reportQuery,
      "PATCH",
      { action: "hide", quantity: 0, version: 0 },
      "moderation-inject",
    ),
    422,
  );
  await check(
    await call(
      reportQuery,
      "PATCH",
      { action: "flag", version: 0 },
      "flag-report",
    ),
  );
  assert.ok((await Listing.findById(product._id))?.moderationFlaggedAt);
  await check(
    await call(
      reportQuery,
      "PATCH",
      { action: "escalate", version: 1 },
      "escalate-report",
    ),
  );
  await check(
    await call(
      reportQuery,
      "PATCH",
      { action: "hide", version: 2 },
      "hide-report",
    ),
  );
  const hidden = await Listing.findById(product._id);
  assert.equal(hidden?.quantity, 50);
  assert.equal(hidden?.price, 30);
  assert.equal(hidden?.status, "reported");
  await check(
    await details.GET(
      req(`/listings/${product._id}`, "GET", undefined, undefined, buyerToken),
      context(String(product._id)),
    ),
    404,
  );
  assert.equal(
    await AuditLog.countDocuments({
      targetId: report.id,
      action: "report.hide",
    }),
    1,
  );
  await check(
    await call(
      reportQuery,
      "PATCH",
      { action: "hide", version: 2 },
      "hide-report",
    ),
  );
  await check(
    await call(
      reportQuery,
      "PATCH",
      { action: "dismiss", version: 3 },
      "dismiss-report",
    ),
  );
  await check(
    await call(
      reportQuery,
      "PATCH",
      { action: "flag", version: 0 },
      "stale-moderation",
    ),
    409,
    "STALE_VERSION",
  );
  const activity = coordinatorActivityPageSchema.parse(
    await check(await call(`activity?villageId=${bid}&type=reports&limit=1`)),
  );
  assert.ok(activity.total >= 4);
  assert.equal(activity.activities.length, 1);
  await check(
    await call(`activity/${activity.activities[0].id}?villageId=${bid}`),
  );
  assert.equal(
    (
      await check(
        await call(`activity?villageId=${bid}&from=2000-01-01&to=2000-01-02`),
      )
    ).total,
    0,
  );
  await check(await call(`activity?villageId=${bid}&from=2026-02-30`), 422);
  const overview = coordinatorDashboardSchema.parse(
    await check(await call(scoped("dashboard"))),
  );
  assert.equal(overview.counts.buyers, 1);
  assert.equal(overview.counts.mapping, 1);
  await check(
    await call(
      scoped(`villages/${aid}/connections/${connection.id}`),
      "DELETE",
      {},
      "disconnect-village",
    ),
  );
  assert.equal(await Village.countDocuments(), 3);
  assert.equal(await Listing.countDocuments(), 2);
  await check(
    await listings.GET(
      req(
        `/listings?villageId=${bid}`,
        "GET",
        undefined,
        undefined,
        buyerToken,
      ),
    ),
    403,
    "VILLAGE_FILTER_UNAVAILABLE",
  );
  const disconnectedMarketplace = await check(
    await listings.GET(
      req("/listings", "GET", undefined, undefined, buyerToken),
    ),
  );
  assert.deepEqual(
    disconnectedMarketplace.villageCounts.map((row: { id: string }) => row.id),
    [aid],
  );
  assert.equal(
    (
      await check(
        await listings.GET(
          req("/listings", "GET", undefined, undefined, otherToken),
        ),
      )
    ).listings.some((row: { id: string }) => row.id === String(ownProduct._id)),
    false,
  );
  // Retrying the earlier add operation must never undo a later removal.
  await check(
    await call(
      scoped(`villages/${aid}/connections`),
      "POST",
      { targetVillageId: bid },
      "add-connection",
    ),
  );
  assert.equal(await VillageConnection.countDocuments({ active: true }), 0);
  // Add Buyer may select a public active village without gaining directory access.
  const selectedBuyerInput = {
    firstName: "Village",
    lastName: "Buyer",
    mobile: "9876543222",
    targetVillageId: String(c._id),
  };
  const selectedBuyer = await check(
    await call(
      scoped("buyers"),
      "POST",
      selectedBuyerInput,
      "selected-village-buyer",
    ),
  );
  assert.equal(
    String((await User.findById(selectedBuyer.id))?.village),
    String(c._id),
  );
  assert.equal((await User.findById(selectedBuyer.id))?.mobileVerified, false);
  assert.deepEqual(
    await check(
      await call(
        scoped("buyers"),
        "POST",
        selectedBuyerInput,
        "selected-village-buyer",
      ),
    ),
    selectedBuyer,
  );
  assert.equal(await User.countDocuments({ mobile: "9876543222" }), 1);
  await check(await call(scoped(`users/${selectedBuyer.id}`)), 404);
  await check(await call(`users/${selectedBuyer.id}?villageId=${c._id}`), 403);
  await check(
    await call(
      scoped("buyers"),
      "POST",
      {
        ...selectedBuyerInput,
        mobile: "9876543223",
        targetVillageId: "f".repeat(24),
      },
      "missing-buyer-village",
    ),
    404,
  );
  await Village.updateOne({ _id: c._id }, { $set: { isActive: false } });
  await check(
    await call(
      scoped("buyers"),
      "POST",
      { ...selectedBuyerInput, mobile: "9876543224" },
      "inactive-buyer-village",
    ),
    404,
  );
  await check(
    await call(
      scoped("buyers"),
      "POST",
      selectedBuyerInput,
      "selected-village-buyer",
    ),
    404,
  );
  await Village.updateOne({ _id: c._id }, { $set: { isActive: true } });
  await check(
    await call(
      scoped("buyers"),
      "POST",
      selectedBuyerInput,
      "unauthorized-buyer-village",
      buyerToken,
    ),
    403,
  );
  assert.ok(
    await AuditLog.exists({
      actorUserId: coordinator._id,
      villageId: c._id,
      targetId: selectedBuyer.id,
      action: "buyer.added",
    }),
  );
  await User.updateOne(
    { _id: coordinator._id },
    { $pull: { roles: "coordinator" } },
  );
  await VillageCoordinator.deleteMany({ userId: coordinator._id });
  await check(await call(scoped("dashboard")), 403);
  await check(
    await call(scoped("buyers"), "POST", buyerInput, "buyer-registration-01"),
    403,
  );
  const afterRemoval = await User.findById(coordinator._id);
  assert.ok(afterRemoval);
  assert.deepEqual(afterRemoval.roles, ["buyer", "seller"]);
  assert.deepEqual((await mobileUserDto(afterRemoval)).coordinatorVillages, []);
  const revokedRole = mobileUserSchema.parse(
    await check(await userRoute.GET(req("/users/me"))),
  );
  assert.equal(revokedRole.isCoordinator, false);
  assert.equal(revokedRole.isSeller, true);
  assert.deepEqual(revokedRole.coordinatorVillages, []);
  assert.equal(await Listing.countDocuments({ seller: coordinator._id }), 1);
  console.log(
    "PASS: report creation, scoped moderation/history, flag/hide/escalate/dismiss, unchanged stock/rates, filtered dated pagination, retained villages/listings and immediate role revocation including replay.",
  );
} finally {
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === databaseName &&
    /^gaavli_coordinator_test_[a-f0-9]{16}$/.test(databaseName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
