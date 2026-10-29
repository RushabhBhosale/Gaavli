// Real routes and MongoDB; all writes stay in this isolated randomly named DB.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import {
  dashboardDirectorySchema,
  directoryPageSchema,
  directoryEntrySchema,
  directoryQuerySchema,
} from "@gaavli/validation";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
const databaseName = `gaavli_dashboard_test_${randomBytes(8).toString("hex")}`;
const uri = new URL(process.env.MONGODB_URI);
uri.pathname = `/${databaseName}`;
uri.searchParams.set("socketTimeoutMS", "30000");
process.env.MONGODB_URI = uri.toString();
process.env.NODE_ENV = "development";
mongoose.set("maxTimeMS", 15000);
const { connectMobileDb } = await import("../src/server/db/mobile");
const { Village, VillageCoordinator, User, AuditLog, Notification } =
  await import("../src/server/models");
const { Service } = await import("../src/server/models/service");
const { MobileSession } = await import("../src/server/models/mobile-auth");
const { hashToken } = await import("../src/server/auth/mobile-policy");
const { saveVillage } = await import("../src/server/services/villages");
const { GET: dashboard } = await import("../src/app/api/v1/dashboard/route");
const { GET: directory } = await import("../src/app/api/v1/directory/route");
const { GET: detail } = await import("../src/app/api/v1/directory/[id]/route");
try {
  await connectMobileDb();
  // Transactions must not race automatic collection/index creation.
  await Promise.all([
    Service.init(),
    VillageCoordinator.init(),
    AuditLog.init(),
    Notification.init(),
  ]);
  const [village, other, inactive] = await Village.create([
    {
      nameEn: "Selected",
      nameMr: "निवडलेले",
      taluka: "Test",
      district: "Test",
    },
    { nameEn: "Other", nameMr: "दुसरे" },
    { nameEn: "Inactive", nameMr: "बंद", isActive: false },
  ]);
  const [viewer, provider, blocked, coordinator] = await User.create([
    { name: "Viewer", village: village._id },
    {
      name: "Provider private name",
      village: village._id,
      mobile: "+919876543211",
    },
    { name: "Blocked", village: village._id, status: "blocked" },
    {
      name: "Coordinator",
      roles: ["buyer", "coordinator"],
      village: village._id,
      mobile: "9876543212",
    },
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
  const request = (
    path: string,
    params: Record<string, string> = {},
    authenticated = false,
  ) =>
    new Request(
      `http://localhost/api/v1/${path}?${new URLSearchParams({ sourceVillageId: String(village._id), ...params })}`,
      { headers: authenticated ? { Authorization: `Bearer ${token}` } : {} },
    );
  const home = async (authenticated = false) => {
    const response = await dashboard(request("dashboard", {}, authenticated));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    return dashboardDirectorySchema.parse((await response.json()).data);
  };
  assert.deepEqual(await home(), {
    coordinator: null,
    services: { entries: [], total: 0, page: 1, limit: 3 },
    transport: { entries: [], total: 0, page: 1, limit: 3 },
  });
  await VillageCoordinator.create({
    villageId: village._id,
    userId: coordinator._id,
  });
  assert.equal(
    (await home()).coordinator?.publicContactPhone,
    null,
    "private registered mobile must never be a fallback",
  );
  const config = {
    name: village.nameEn,
    nameMr: village.nameMr,
    taluka: "Test",
    district: "Test",
    coordinatorIds: [String(coordinator._id)],
  };
  await assert.rejects(
    saveVillage(
      String(new mongoose.Types.ObjectId()),
      { ...config, version: 0, publicCoordinatorPhone: "+919876543213" },
      String(village._id),
    ),
    /registered mobile number/,
  );
  await saveVillage(
    String(new mongoose.Types.ObjectId()),
    { ...config, version: 0, publicCoordinatorPhone: "+919876543212" },
    String(village._id),
  );
  assert.equal((await home()).coordinator?.publicContactPhone, "+919876543212");
  await User.updateOne(
    { _id: coordinator._id },
    { $set: { mobile: "9876543214" } },
  );
  assert.equal(
    (await home()).coordinator?.publicContactPhone,
    null,
    "registered mobile changes must not inherit public permission",
  );
  await User.updateOne(
    { _id: coordinator._id },
    { $set: { mobile: "9876543212" } },
  );
  assert.equal(
    (await home(true)).coordinator?.publicContactPhone,
    "+919876543212",
  );
  await saveVillage(
    String(new mongoose.Types.ObjectId()),
    { ...config, version: 1, publicCoordinatorPhone: "" },
    String(village._id),
  );
  assert.equal(
    (await home(true)).coordinator?.publicContactPhone,
    null,
    "clearing public configuration revokes contact",
  );
  const base = {
    userId: provider._id,
    villageId: village._id,
    profession: "Electrician",
    professionMr: "इलेक्ट्रिशियन",
    serviceCategory: "Utility",
    keywords: ["wiring"],
    price: 100,
    unit: "hour",
  };
  const rows = await Service.create([
    ...Array.from({ length: 7 }, () => ({ ...base })),
    { ...base, profession: "Pickup", module: "transport" },
    { ...base, profession: "Passenger vehicle", module: "transport" },
    { ...base, villageId: other._id },
    { ...base, userId: blocked._id },
    { ...base, status: "INACTIVE" },
    { ...base, available: false },
    { ...base, userId: viewer._id },
  ]);
  await Service.updateOne({ _id: rows[0]._id }, { $unset: { module: 1 } });
  const guest = await home();
  const signed = await home(true);
  assert.equal(guest.services.total, 8);
  assert.equal(signed.services.total, 7);
  assert.equal(signed.transport.total, 2);
  assert.equal(signed.services.entries.length, 3);
  for (const row of [...signed.services.entries, ...signed.transport.entries]) {
    assert.equal(row.village.id, String(village._id));
    assert.equal(
      "userId" in row || "mobile" in row || "provider" in row,
      false,
    );
    assert.equal(
      row.module,
      signed.services.entries.includes(row) ? "services" : "transport",
    );
  }
  const page = async (params: Record<string, string> = {}) => {
    const response = await directory(
      request("directory", { module: "services", limit: "5", ...params }, true),
    );
    assert.equal(response.status, 200);
    return directoryPageSchema.parse((await response.json()).data);
  };
  const first = await page();
  const second = await page({ page: "2" });
  assert.deepEqual([first.entries.length, second.entries.length], [5, 2]);
  assert.equal(
    new Set([...first.entries, ...second.entries].map((row) => row.id)).size,
    7,
  );
  assert.equal((await page({ search: "wiring" })).total, 7);
  assert.equal((await page({ search: "इलेक्ट्रिशियन" })).total, 7);
  assert.equal(
    (await page({ search: ".*" })).total,
    0,
    "search metacharacters are literal",
  );
  assert.equal((await page({ search: "Utility" })).total, 7);
  assert.equal((await page({ sourceVillageId: String(other._id) })).total, 1);
  const itemResponse = await detail(request(`directory/${rows[0]._id}`), {
    params: Promise.resolve({ id: String(rows[0]._id) }),
  });
  assert.equal(itemResponse.status, 200);
  directoryEntrySchema.parse((await itemResponse.json()).data);
  const foreign = await detail(request(`directory/${rows[9]._id}`), {
    params: Promise.resolve({ id: String(rows[9]._id) }),
  });
  assert.equal(foreign.status, 404);
  assert.equal(
    (
      await dashboard(
        request("dashboard", { sourceVillageId: String(inactive._id) }),
      )
    ).status,
    422,
  );
  assert.equal(
    (await dashboard(request("dashboard", { unexpected: "true" }))).status,
    422,
  );
  assert.equal(
    directoryQuerySchema.safeParse({
      sourceVillageId: String(village._id),
      limit: "51",
    }).success,
    false,
  );
  const badToken = new Request(request("dashboard"), {
    headers: { Authorization: `Bearer ${"0".repeat(64)}` },
  });
  assert.equal((await dashboard(badToken)).status, 401);
  assert.equal(
    (
      await dashboard(
        new Request(request("dashboard"), {
          headers: { Origin: "https://foreign.example" },
        }),
      )
    ).status,
    403,
  );
  await User.updateOne(
    { _id: coordinator._id },
    { $set: { status: "blocked" } },
  );
  assert.equal((await home()).coordinator, null);
  await User.updateOne(
    { _id: coordinator._id },
    { $set: { status: "active", roles: ["buyer"] } },
  );
  assert.equal((await home()).coordinator, null);
  console.log(
    "PASS: dashboard and directory routes, real counts, bounded previews, pagination/search, exact-village scope, owner/inactive exclusion, public contact opt-in/revocation, privacy, validation and auth.",
  );
} finally {
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === databaseName &&
    /^gaavli_dashboard_test_[a-f0-9]{16}$/.test(databaseName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
