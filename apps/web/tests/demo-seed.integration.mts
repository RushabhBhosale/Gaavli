import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import mongoose from "mongoose";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
const dbName = `gaavli_demo_test_${randomBytes(8).toString("hex")}`;
const url = new URL(process.env.MONGODB_URI);
url.pathname = `/${dbName}`;
Object.assign(process.env, {
  MONGODB_URI: url.toString(),
  NODE_ENV: "development",
  OTP_PROVIDER: "test",
  OTP_TEST_CODE: "123456",
  MOBILE_AUTH_SECRET: randomBytes(32).toString("hex"),
});
const seed = (...args: string[]) =>
  execFileSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "scripts/seed-demo.mts",
      ...args,
    ],
    { cwd: process.cwd(), env: process.env, encoding: "utf8" },
  );
const { connectMobileDb } = await import("../src/server/db/mobile");
const { User, Village, Listing, Notification } =
  await import("../src/server/models");
const { Service } = await import("../src/server/models/service");
const { sendOtp, verifyOtp } =
  await import("../src/server/services/mobile-auth");
const listings = await import("../src/app/api/v1/listings/route");
const dashboard = await import("../src/app/api/v1/dashboard/route");
const mine = await import("../src/app/api/v1/listings/mine/route");
const requests = await import("../src/app/api/v1/requests/route");
const contact = await import("../src/app/api/v1/listings/[id]/contact/route");
const interested =
  await import("../src/app/api/v1/listings/[id]/interested/route");
const notify =
  await import("../src/app/api/v1/listings/[id]/notify-farmer/route");
try {
  assert.match(seed(), /"mode":"dry-run"/);
  await connectMobileDb();
  assert.equal(await User.countDocuments(), 0);
  assert.match(seed("--apply"), /Demo data is ready/);
  seed("--apply");
  assert.equal(await User.countDocuments(), 9);
  assert.equal(await Listing.countDocuments(), 41);
  assert.equal(await Service.countDocuments(), 5);
  assert.equal(await Notification.countDocuments(), 1);
  const village = await Village.findOne({ nameEn: "Kalamb" }).lean();
  assert.ok(village);
  const request = (path: string, token?: string) =>
    new Request(`http://localhost/api/v1/${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  const body = async (r: Response) => {
    const data = await r.json();
    assert.equal(r.status, 200, JSON.stringify(data));
    return data.data;
  };
  const feed = await body(
    await listings.GET(
      request(`listings?sourceVillageId=${village._id}&limit=50`),
    ),
  );
  assert.equal(feed.total, 26, "26 products, however many sellers offer them");
  const tomato = feed.listings.find(
    (row: { productName: string }) => row.productName === "Tomato",
  );
  assert.ok(tomato);
  assert.deepEqual(
    [tomato.offerCount, tomato.minPrice, tomato.maxPrice, tomato.price],
    [4, 25, 36, 25],
    "four sellers of tomato show as one card with a price range",
  );
  assert.ok(feed.listings.every((row: { isDemo: boolean }) => !row.isDemo));
  const directory = await body(
    await dashboard.GET(request(`dashboard?sourceVillageId=${village._id}`)),
  );
  assert.equal(directory.services.total, 3);
  assert.equal(directory.transport.total, 2);
  const challenge = await sendOtp(
    { mobile: "9000000222", language: "mr" },
    "demo-test",
  );
  const login = await verifyOtp(
    { challengeId: challenge.challengeId, code: "123456" },
    "demo-test",
  );
  const own = await body(
    await mine.GET(request("listings/mine?status=all", login.accessToken)),
  );
  assert.equal(own.total, 6);
  const inbox = await body(
    await requests.GET(
      request("requests?direction=received", login.accessToken),
    ),
  );
  assert.equal(inbox.total, 1);
  const onion = await Listing.findOne({ productName: "Onion" }).lean();
  assert.ok(onion);
  const buyerChallenge = await sendOtp(
    { mobile: "9000000111", language: "mr" },
    "demo-test",
  );
  const buyer = await verifyOtp(
    { challengeId: buyerChallenge.challengeId, code: "123456" },
    "demo-test",
  );
  const context = { params: Promise.resolve({ id: String(onion._id) }) };
  const seller = await body(
    await contact.GET(
      request(`listings/${onion._id}/contact`, buyer.accessToken),
      context,
    ),
  );
  assert.equal(seller.seller.mobile, "+919000000222");
  const post = (path: string, token: string, data: unknown, key?: string) =>
    new Request(`http://localhost/api/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      body: JSON.stringify(data),
    });
  await body(
    await interested.POST(
      post(`listings/${onion._id}/interested`, buyer.accessToken, {}),
      context,
    ),
  );
  const sent = await body(
    await notify.POST(
      post(
        `listings/${onion._id}/notify-farmer`,
        buyer.accessToken,
        {},
        "demo-notify-1",
      ),
      context,
    ),
  );
  assert.equal(sent.notified, true);
  const inboxAfter = await body(
    await requests.GET(
      request("requests?direction=received", login.accessToken),
    ),
  );
  assert.equal(inboxAfter.total, 2);
  console.log(
    "PASS: safe dry-run/replay, marketplace, services, transport, test login, seller listings, contact and notifications",
  );
} finally {
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === dbName &&
    /^gaavli_demo_test_[a-f0-9]{16}$/.test(dbName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
