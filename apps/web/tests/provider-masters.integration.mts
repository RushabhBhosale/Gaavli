// All writes use a randomly named test database; the configured application DB
// is never seeded. Next request stores exercise the real cookie-auth route handlers.
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import { ProviderType, PROVIDER_MASTER_GROUPS } from "@gaavli/constants";
import {
  providerMasterSeedSchema,
  providerMasterCreateSchema,
  providerMasterGroupSchema,
} from "@gaavli/validation";

nextEnv.loadEnvConfig(process.cwd());
const databaseName = `gaavli_pm_test_${randomBytes(6).toString("hex")}`;
const uri = new URL(process.env.MONGODB_URI || "");
uri.pathname = `/${databaseName}`;
Object.assign(process.env, {
  MONGODB_URI: uri.toString(),
  JWT_SECRET: randomBytes(32).toString("hex"),
  NODE_ENV: "production",
});
Object.assign(globalThis, { AsyncLocalStorage });
const { NextRequest } = await import("next/server");
const { workAsyncStorage } =
  await import("next/dist/server/app-render/work-async-storage.external.js");
const { workUnitAsyncStorage } =
  await import("next/dist/server/app-render/work-unit-async-storage.external.js");
const { createRequestStoreForAPI } =
  await import("next/dist/server/async-storage/request-store.js");
const { connectDb } = await import("../src/server/db/connect");
const { ProviderMaster } = await import("../src/server/models/provider-master");
const { Admin, AdminSession, AuditLog } = await import("../src/server/models");
const { seedProviderMasters } =
  await import("../src/server/repositories/provider-masters");
const { createProviderMaster } =
  await import("../src/server/services/provider-masters");
const { signToken, COOKIE } = await import("../src/server/auth/token");
const collectionRoute =
  await import("../src/app/api/v1/admin/provider-masters/route");
const updateRoute =
  await import("../src/app/api/v1/admin/provider-masters/[id]/route");
const statusRoute =
  await import("../src/app/api/v1/admin/provider-masters/[id]/status/route");
const publicRoute = await import("../src/app/api/v1/provider-masters/route");
const rows = providerMasterSeedSchema.parse(
  JSON.parse(
    await readFile(
      new URL(
        "../data/gaavli_provider_master_seed_simple_en_mr_hi.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ),
);
let token = "";
async function call(
  path: string,
  method = "GET",
  body?: unknown,
  auth = true,
  origin = "http://localhost",
) {
  const request = new NextRequest(`http://localhost/api/v1${path}`, {
    method,
    headers: {
      ...(auth ? { Cookie: `${COOKIE}=${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      Origin: origin,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const url = new URL(request.url);
  const store = createRequestStoreForAPI(
    request,
    { pathname: url.pathname, search: url.search },
    { tags: [], expirationsByCacheKind: new Map() },
    undefined,
    undefined,
    undefined,
  );
  // Only the request-mode fields consumed by cookies() are needed here.
  const work = {
    route: url.pathname,
    page: url.pathname,
    isStaticGeneration: false,
  } as Parameters<typeof workAsyncStorage.run>[0];
  return workAsyncStorage.run(work, () =>
    workUnitAsyncStorage.run(store, async () => {
      if (path.startsWith("/provider-masters")) return publicRoute.GET(request);
      const parts = url.pathname.split("/").filter(Boolean);
      const id = parts[4];
      if (method === "GET") return collectionRoute.GET(request);
      if (method === "POST") return collectionRoute.POST(request);
      return (parts[5] === "status" ? statusRoute : updateRoute).PATCH(
        request,
        { params: Promise.resolve({ id }) },
      );
    }),
  );
}
async function check(response: Response, status = 200) {
  const result = await response.json();
  assert.equal(response.status, status, JSON.stringify(result));
  assert.equal(response.headers.get("cache-control"), "no-store");
  return result.data;
}
const groupQuery = (providerType: string, masterType: string) =>
  `providerType=${providerType}&masterType=${masterType}`;
const shop = groupQuery("SHOP_BUSINESS", "SHOP_TYPE");
try {
  await connectDb();
  const admin = await Admin.create({
    name: "Test Admin",
    passwordHash: "test-only-unused",
  });
  const session = await AdminSession.create({
    admin: admin._id,
    expiresAt: new Date(Date.now() + 3600000),
  });
  token = await signToken(String(admin._id), String(session._id), 3600);
  assert.equal(Object.values(ProviderType).length, 11);
  assert.equal(new Set(rows.map((row) => row.masterType)).size, 13);
  const first = await seedProviderMasters(rows);
  assert.equal(first.inserted, rows.length);
  for (const row of rows) {
    const saved = await ProviderMaster.findOne({
      providerType: row.providerType,
      masterType: row.masterType,
      code: row.code,
    }).lean();
    assert.ok(saved);
    assert.deepEqual(saved.name, row.name);
    assert.equal(saved.sortOrder, row.sortOrder);
    assert.equal(saved.isActive, row.isActive);
    assert.ok(saved.createdAt && saved.updatedAt);
  }
  for (const [providerType, groups] of Object.entries(PROVIDER_MASTER_GROUPS))
    for (const masterType of groups) {
      const expected = rows.filter(
        (row) =>
          row.providerType === providerType && row.masterType === masterType,
      );
      const page = await check(
        await call(
          `/admin/provider-masters?${groupQuery(providerType, masterType)}&limit=100`,
        ),
      );
      assert.equal(page.total, expected.length);
      assert.ok(
        page.records.every(
          (row: { masterType: string }) => row.masterType === masterType,
        ),
      );
    }
  await check(
    await call(`/admin/provider-masters?${shop}`, "GET", undefined, false),
    401,
  );
  await check(await call("/admin/provider-masters", "POST", {}, false), 401);
  await check(
    await call(
      "/admin/provider-masters",
      "POST",
      {},
      true,
      "https://foreign.example",
    ),
    403,
  );
  await check(
    await call(
      "/provider-masters?providerType=SHOP_BUSINESS&masterType=VEHICLE_TYPE",
      "GET",
      undefined,
      false,
    ),
    422,
  );
  assert.equal(
    providerMasterGroupSchema.safeParse({
      providerType: "UNKNOWN",
      masterType: "SHOP_TYPE",
    }).success,
    false,
  );
  const input = {
    providerType: "SHOP_BUSINESS",
    masterType: "SHOP_TYPE",
    name: {
      en: "  Test Store  ",
      mr: "  चाचणी दुकान  ",
      hi: "  परीक्षण दुकान  ",
    },
    sortOrder: 0,
    isActive: true,
  };
  const created = await check(
    await call("/admin/provider-masters", "POST", input),
    201,
  );
  assert.equal(created.name.en, "Test Store");
  assert.match(created.code, /^TEST_STORE_[A-F0-9]{12}$/);
  await check(await call("/admin/provider-masters", "POST", input), 409);
  await check(
    await call("/admin/provider-masters", "POST", {
      ...input,
      name: { ...input.name, en: "TEST   STORE" },
    }),
    409,
  );
  await check(
    await call("/admin/provider-masters", "POST", {
      ...input,
      code: "OVERRIDE",
    }),
    422,
  );
  await check(
    await call("/admin/provider-masters", "POST", {
      ...input,
      name: { ...input.name, mr: " " },
    }),
    422,
  );
  await check(
    await call("/admin/provider-masters/not-an-id", "PATCH", {
      name: input.name,
      sortOrder: 0,
      version: 0,
    }),
    422,
  );
  const edit = {
    name: { en: "Edited Store", mr: "बदललेले दुकान", hi: "बदली दुकान" },
    sortOrder: 987,
    version: created.version,
  };
  const edited = await check(
    await call(`/admin/provider-masters/${created.id}`, "PATCH", edit),
  );
  assert.equal(edited.code, created.code);
  assert.equal(edited.sortOrder, 987);
  await check(
    await call(`/admin/provider-masters/${created.id}`, "PATCH", edit),
    409,
  );
  await check(
    await call(`/admin/provider-masters/${created.id}`, "PATCH", {
      ...edit,
      version: edited.version,
      code: "CHANGED",
    }),
    422,
  );
  const inactive = await check(
    await call(`/admin/provider-masters/${created.id}/status`, "PATCH", {
      isActive: false,
      version: edited.version,
    }),
  );
  const adminInactive = await check(
    await call(`/admin/provider-masters?${shop}&status=inactive&search=Edited`),
  );
  assert.equal(adminInactive.total, 1);
  assert.equal(adminInactive.counts.inactive, 1);
  const publicPage = await check(
    await call(`/provider-masters?${shop}`, "GET", undefined, false),
  );
  assert.ok(
    !publicPage.records.some((row: { id: string }) => row.id === created.id),
  );
  assert.deepEqual(Object.keys(publicPage.records[0]).sort(), [
    "code",
    "id",
    "name",
  ]);
  const active = await check(
    await call(`/admin/provider-masters/${created.id}/status`, "PATCH", {
      isActive: true,
      version: inactive.version,
    }),
  );
  assert.equal(active.isActive, true);
  const seeded = await ProviderMaster.findOne({
    providerType: rows[0].providerType,
    masterType: rows[0].masterType,
    code: rows[0].code,
  });
  assert.ok(seeded);
  await check(
    await call(`/admin/provider-masters/${seeded._id}`, "PATCH", {
      name: { en: "Admin preserved", mr: "प्रशासक बदल", hi: "प्रशासक बदलाव" },
      sortOrder: 999,
      version: seeded.__v,
    }),
  );
  const savedEdit = await ProviderMaster.findById(seeded._id);
  assert.ok(savedEdit);
  await check(
    await call(`/admin/provider-masters/${seeded._id}/status`, "PATCH", {
      isActive: false,
      version: savedEdit.__v,
    }),
  );
  const beforeRerun = await ProviderMaster.findById(seeded._id).lean();
  const rerun = await seedProviderMasters(rows);
  assert.equal(rerun.inserted, 0);
  assert.deepEqual(
    await ProviderMaster.findById(seeded._id).lean(),
    beforeRerun,
  );
  await assert.rejects(
    ProviderMaster.create({
      ...rows[1],
      normalizedName: { en: "different", mr: "वेगळे", hi: "अलग" },
    }),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000,
  );
  const raceInput = providerMasterCreateSchema.parse({
    ...input,
    name: { en: "Race Store", mr: "एकत्र दुकान", hi: "एकसाथ दुकान" },
  });
  const race = await Promise.allSettled([
    createProviderMaster(String(admin._id), raceInput),
    createProviderMaster(String(admin._id), raceInput),
  ]);
  assert.equal(
    race.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const ascending = await check(
    await call(
      `/admin/provider-masters?${shop}&sort=name.en&direction=asc&limit=1`,
    ),
  );
  const second = await check(
    await call(
      `/admin/provider-masters?${shop}&sort=name.en&direction=asc&limit=1&page=2`,
    ),
  );
  assert.equal(ascending.total, second.total);
  assert.notEqual(ascending.records[0].id, second.records[0].id);
  assert.ok(
    (
      await check(await call(`/admin/provider-masters?${shop}&search=प्रशासक`))
    ).records.some((row: { id: string }) => row.id === String(seeded._id)),
  );
  await Admin.updateOne({ _id: admin._id }, { $set: { status: "blocked" } });
  await check(await call(`/admin/provider-masters?${shop}`), 401);
  assert.ok(
    await AuditLog.countDocuments({ action: "PROVIDER_MASTER_CREATED" }),
  );
  console.log(
    `PASS: ${rows.length} seed records / 13 groups, exact translations, insert-only reruns, admin authentication/origin/status checks, CRUD/status, stable codes, duplicates/concurrency, public active-only reads, filters/search/pagination and auditing.`,
  );
} finally {
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === databaseName &&
    /^gaavli_pm_test_[a-f0-9]{12}$/.test(databaseName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
