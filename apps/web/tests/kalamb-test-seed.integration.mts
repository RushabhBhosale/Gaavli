import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const dbName = `gv_kalamb_test_${randomBytes(8).toString("hex")}`;
const uri = new URL(process.env.MONGODB_URI || "");
uri.pathname = `/${dbName}`;
process.env.MONGODB_URI = uri.toString();
process.env.NODE_ENV = "development";
const { connectMobileDb } = await import("../src/server/db/mobile");
const { User, Village, Listing, Category, Notification } =
  await import("../src/server/models");
const { ProductMaster } = await import("../src/server/models/product-master");
const { Service } = await import("../src/server/models/service");
const { MobileSession } = await import("../src/server/models/mobile-auth");
const { hashToken } = await import("../src/server/auth/mobile-policy");
const listings = await import("../src/app/api/v1/listings/route");
const dashboard = await import("../src/app/api/v1/dashboard/route");
const contact = await import("../src/app/api/v1/listings/[id]/contact/route");
try {
  await connectMobileDb();
  await Promise.all([
    User.init(),
    Village.init(),
    Listing.init(),
    Category.init(),
    Notification.init(),
    ProductMaster.init(),
    Service.init(),
  ]);
  const [kalamb, registered] = await Village.create([
    { nameEn: "Kalamb", nameMr: "कळंब" },
    { nameEn: "Bhuibavda", nameMr: "भुईबावडा" },
  ]);
  const owner = await User.create({
    name: "Test User",
    firstName: "Test",
    lastName: "User",
    village: registered._id,
    roles: ["buyer", "seller"],
    status: "active",
  });
  await Category.create([
    {
      code: "PERISHABLE",
      name: "Perishable",
      nameMr: "नाशवंत",
      defaultShelfLife: "1–2 days",
      notifyMode: "daily_digest",
    },
    {
      code: "LONG_SHELF_LIFE",
      name: "Long shelf-life",
      nameMr: "दीर्घ टिकाऊ",
      defaultShelfLife: "30 days",
      notifyMode: "weekly_digest",
    },
  ]);
  const source = JSON.parse(
    await readFile(
      new URL("../data/catalog/product-master.v2.json", import.meta.url),
      "utf8",
    ),
  );
  const codes = [
    "TOMATO",
    "ONION",
    "POTATO",
    "CAULIFLOWER",
    "SPINACH",
    "CORIANDER_LEAVES",
    "MANGO",
    "BANANA",
    "LEMON",
    "RICE",
    "WHEAT",
    "JAGGERY",
    "BRINJAL",
    "OKRA",
    "CUCUMBER",
    "CLUSTER_BEANS",
    "GUAVA",
    "PAPAYA",
    "POMEGRANATE",
    "COW_MILK",
    "CURD",
    "GHEE",
    "TOOR_DAL",
    "MOONG_DAL",
    "MANGO_PICKLE",
    "LEMON_PICKLE",
    "UDID_PAPAD",
    "RAGI_LADOO",
  ];
  await ProductMaster.insertMany(
    source.filter((p: { code: string }) => codes.includes(p.code)),
  );
  const preexisting = await Listing.create({
    productName: "Existing",
    seller: owner._id,
    village: registered._id,
    quantity: 3,
    status: "active",
  });
  const seed = (...args: string[]) =>
    execFileSync(
      process.execPath,
      [
        "--conditions=react-server",
        "--import",
        "tsx",
        "scripts/seed-kalamb-test.mts",
        `--village-id=${kalamb._id}`,
        `--owner-id=${owner._id}`,
        ...args,
      ],
      { cwd: process.cwd(), env: process.env, encoding: "utf8" },
    );
  assert.match(seed(), /"mode":"dry-run"/);
  assert.equal(await Listing.countDocuments(), 1);
  assert.match(seed("--apply"), /Inserted or retained/);
  const counts = {
    users: await User.countDocuments(),
    listings: await Listing.countDocuments(),
    services: await Service.countDocuments(),
    notifications: await Notification.countDocuments(),
  };
  assert.deepEqual(counts, {
    users: 6,
    listings: 32,
    services: 5,
    notifications: 2,
  });
  await Listing.updateOne({ _id: preexisting._id }, { $set: { price: 99 } });
  seed("--apply");
  assert.equal((await Listing.findById(preexisting._id))?.price, 99);
  assert.equal(await Listing.countDocuments(), 32);
  assert.equal(
    await Listing.countDocuments({
      seller: owner._id,
      village: registered._id,
    }),
    4,
  );
  assert.equal(await Notification.countDocuments({ userId: owner._id }), 1);
  assert.equal(
    await Notification.countDocuments({ "data.buyerId": owner._id }),
    1,
  );
  const req = (path: string) => new Request(`http://localhost/api/v1/${path}`);
  const feedResponse = await listings.GET(
    req(`listings?sourceVillageId=${kalamb._id}`),
  );
  assert.equal(feedResponse.status, 200);
  const feed = (await feedResponse.json()).data;
  assert.equal(feed.total, 26);
  assert.ok(feed.listings.every((p: { isDemo: boolean }) => !p.isDemo));
  const dashboardResponse = await dashboard.GET(
    req(`dashboard?sourceVillageId=${kalamb._id}`),
  );
  assert.equal(dashboardResponse.status, 200);
  const page = (await dashboardResponse.json()).data;
  assert.equal(page.services.total, 3);
  assert.equal(page.transport.total, 2);
  const sampleNames = ["Anand Shinde", "Vasudha More", "Suresh Pawar"];
  await User.updateMany(
    { name: { $in: sampleNames } },
    { $unset: { mobile: 1 } },
  );
  const updateContacts = (...args: string[]) =>
    execFileSync(
      process.execPath,
      [
        "--conditions=react-server",
        "--import",
        "tsx",
        "scripts/update-kalamb-test-contacts.mts",
        `--village-id=${kalamb._id}`,
        ...args,
      ],
      { cwd: process.cwd(), env: process.env, encoding: "utf8", stdio: "pipe" },
    );
  assert.match(updateContacts(), /"mode":"dry-run"/);
  assert.equal(
    await User.countDocuments({
      name: { $in: sampleNames },
      mobile: { $exists: true },
    }),
    0,
  );
  await User.updateOne({ _id: owner._id }, { $set: { mobile: "9000000666" } });
  assert.throws(() => updateContacts("--apply"));
  assert.equal(
    await User.countDocuments({
      name: { $in: sampleNames },
      mobile: { $exists: true },
    }),
    0,
  );
  await User.updateOne({ _id: owner._id }, { $unset: { mobile: 1 } });
  assert.match(updateContacts("--apply"), /contacts updated/);
  updateContacts("--apply");
  const token = randomBytes(32).toString("hex");
  await MobileSession.create({
    user: owner._id,
    provider: "test",
    accessHash: hashToken(token),
    refreshHash: hashToken(randomBytes(32).toString("hex")),
    accessExpiresAt: new Date(Date.now() + 3600000),
    expiresAt: new Date(Date.now() + 86400000),
  });
  for (const name of ["Meera Jadhav", ...sampleNames]) {
    const seller = await User.findOne({ name }).lean();
    assert.ok(seller?.mobile);
    const product = await Listing.findOne({
      seller: seller._id,
      status: "active",
    }).lean();
    assert.ok(product);
    const response = await contact.GET(
      new Request(`http://localhost/api/v1/listings/${product._id}/contact`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      { params: Promise.resolve({ id: String(product._id) }) },
    );
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    assert.equal(data.data.seller.mobile, `+91${seller.mobile}`);
  }
  console.log(
    "PASS: seed replay, marketplace, inquiries, contact updates, collision safety, and all four seller contact endpoints",
  );
} finally {
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === dbName &&
    /^gv_kalamb_test_[a-f0-9]{16}$/.test(dbName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
