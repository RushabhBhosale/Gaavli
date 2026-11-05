import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import mongoose from "mongoose";
import nextEnv from "@next/env";
import {
  deletionKeys,
  normalizeCatalogTerm,
} from "../src/server/catalog/search-text";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
const databaseName = `gaavli_catalog_test_${randomBytes(8).toString("hex")}`;
const uri = new URL(process.env.MONGODB_URI);
uri.pathname = `/${databaseName}`;
process.env.MONGODB_URI = uri.toString();
const { connectDb } = await import("../src/server/db/connect");
const { ProductMaster } = await import("../src/server/models/product-master");
const { CatalogSearchTerm } =
  await import("../src/server/models/catalog-search-term");
const { searchCatalog } =
  await import("../src/server/repositories/catalog-search");
const { User } = await import("../src/server/models");
const { MobileSession, MobileRateLimit } =
  await import("../src/server/models/mobile-auth");
const { hashToken } = await import("../src/server/auth/mobile-policy");
const route = await import("../src/app/api/v1/catalog/search/route");
try {
  await connectDb();
  await Promise.all([
    ProductMaster.init(),
    CatalogSearchTerm.init(),
    MobileRateLimit.init(),
  ]);
  const [tomato, potato, coriander, inactive] = await ProductMaster.create([
    {
      code: "TOMATO",
      nameEn: "Tomato",
      nameMr: "टोमॅटो",
      productGroup: "vegetables",
      defaultUnit: "kg",
      status: "ACTIVE",
      sortOrder: 1,
    },
    {
      code: "POTATO",
      nameEn: "Potato",
      nameMr: "बटाटा",
      productGroup: "vegetables",
      defaultUnit: "kg",
      status: "ACTIVE",
      sortOrder: 2,
    },
    {
      code: "CORIANDER_LEAVES",
      nameEn: "Coriander Leaves",
      nameMr: "कोथिंबीर",
      productGroup: "leafy_vegetables",
      defaultUnit: "bunch",
      status: "ACTIVE",
      sortOrder: 3,
    },
    {
      code: "OLD_TOMATO",
      nameEn: "Old tomato",
      nameMr: "जुना टोमॅटो",
      productGroup: "vegetables",
      defaultUnit: "kg",
      status: "INACTIVE",
      sortOrder: 4,
    },
  ]);
  const terms = [
    [tomato, "Tomato", "name"],
    [tomato, "टोमॅटो", "name"],
    [tomato, "टमाटर", "alias"],
    [tomato, "tamatar", "alias"],
    [potato, "Potato", "name"],
    [potato, "बटाटा", "name"],
    [potato, "batata", "alias"],
    [potato, "aloo", "alias"],
    [potato, "tomato", "alias"],
    [coriander, "Coriander Leaves", "name"],
    [coriander, "कोथिंबीर", "name"],
    [coriander, "kothimbir", "alias"],
    [coriander, "dhaniya", "alias"],
    [inactive, "tomato", "alias"],
  ] as const;
  await CatalogSearchTerm.insertMany(
    terms.map(([product, value, kind]) => {
      const term = normalizeCatalogTerm(value);
      return {
        product: product._id,
        term,
        kind,
        deletions: deletionKeys(term),
      };
    }),
  );
  for (const [query, code] of [
    ["tomato", "TOMATO"],
    ["tamatar", "TOMATO"],
    ["टमाटर", "TOMATO"],
    ["टोमॅटो", "TOMATO"],
    ["tomoto", "TOMATO"],
    ["toma", "TOMATO"],
    ["batata", "POTATO"],
    ["बटाटा", "POTATO"],
    ["aloo", "POTATO"],
    ["kothimbir", "CORIANDER_LEAVES"],
    ["कोथिंबीर", "CORIANDER_LEAVES"],
    ["dhaniya", "CORIANDER_LEAVES"],
  ]) {
    assert.equal(
      (await searchCatalog(query, 10)).products[0]?.code,
      code,
      query,
    );
  }
  assert.ok(
    !(await searchCatalog("tomato", 10)).products.some(
      (row) => row.code === "OLD_TOMATO",
    ),
  );
  assert.deepEqual(
    (await searchCatalog("tomato", 10)).products.map((row) => row.code),
    ["TOMATO", "POTATO"],
  );
  const user = await User.create({
    name: "Catalog Seller",
    mobile: "9876543210",
    status: "active",
    roles: ["buyer"],
  });
  const token = randomBytes(32).toString("hex");
  await MobileSession.create({
    user: user._id,
    provider: "test",
    accessHash: hashToken(token),
    refreshHash: hashToken("refresh"),
    accessExpiresAt: new Date(Date.now() + 3600000),
    expiresAt: new Date(Date.now() + 3600000),
  });
  const request = (path: string, auth = true) =>
    new Request(`http://localhost/api/v1/catalog/search${path}`, {
      headers: auth ? { Authorization: `Bearer ${token}` } : {},
    });
  assert.equal((await route.GET(request("?q=tomato", false))).status, 401);
  assert.equal((await route.GET(request("?q=tomato&limit=21"))).status, 422);
  const response = await route.GET(request("?q=tomato&limit=1"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(
    (await response.json()).data.products.map(
      (row: { code: string }) => row.code,
    ),
    ["TOMATO"],
  );
  const prefixPlan = await CatalogSearchTerm.find({
    term: { $gte: "tom", $lt: "tom\uffff" },
  }).explain("executionStats");
  const fuzzyPlan = await CatalogSearchTerm.find({
    deletions: { $in: deletionKeys("tomoto") },
  }).explain("executionStats");
  for (const plan of [prefixPlan, fuzzyPlan]) {
    const winning = JSON.stringify(plan.queryPlanner.winningPlan);
    assert.ok(winning.includes("IXSCAN"), winning);
    assert.ok(!winning.includes("COLLSCAN"), winning);
  }
  const runIndex = (...args: string[]) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          "--conditions=react-server",
          "--import",
          "tsx",
          "scripts/index-catalog-search.mts",
          ...args,
        ],
        { cwd: process.cwd(), env: process.env, encoding: "utf8" },
      ),
    );
  const beforeDryRun = await CatalogSearchTerm.countDocuments();
  assert.equal(runIndex().mode, "dry-run");
  assert.equal(await CatalogSearchTerm.countDocuments(), beforeDryRun);
  assert.equal(runIndex("--apply").products, 4);
  const afterFirstApply = await CatalogSearchTerm.countDocuments();
  // Indexed word starts find a product by a later word in its name.
  assert.equal(
    (await searchCatalog("leaves", 10)).products[0]?.code,
    "CORIANDER_LEAVES",
  );
  runIndex("--apply");
  assert.equal(await CatalogSearchTerm.countDocuments(), afterFirstApply);
  assert.equal(
    await CatalogSearchTerm.countDocuments({
      product: potato._id,
      term: "tomato",
    }),
    0,
  );
  assert.equal(
    (await searchCatalog("tamatar", 10)).products[0]?.code,
    "TOMATO",
  );
  // Misspellings, swapped letters, other word orders and close matches, using
  // the terms the indexer just wrote (including sounds-alike keys).
  const top = async (query: string) =>
    (await searchCatalog(query, 10)).products[0]?.code;
  for (const [query, code] of [
    ["tomtao", "TOMATO"],
    ["tomatto", "TOMATO"],
    ["potatto", "POTATO"],
    ["kothmbir", "CORIANDER_LEAVES"],
    ["kothambir", "CORIANDER_LEAVES"],
    ["कोथींबीर", "CORIANDER_LEAVES"],
    ["टोमाटो", "TOMATO"],
    ["leaves coriander", "CORIANDER_LEAVES"],
    ["coriander lea", "CORIANDER_LEAVES"],
  ] as const)
    assert.equal(await top(query), code, query);
  assert.equal((await searchCatalog("tomtao", 10)).didYouMean, "tomato");
  assert.equal((await searchCatalog("tomato", 10)).didYouMean, null);
  assert.equal((await searchCatalog("leaves coriander", 10)).didYouMean, null);
  // Short words are never typo targets, and unrelated words match nothing.
  assert.deepEqual((await searchCatalog("xyzzy", 10)).products, []);
  assert.ok(
    !(await searchCatalog("tmt", 10)).products.some(
      (row) => row.code === "TOMATO",
    ),
  );
  // Every new lookup is backed by an index, never a collection scan.
  const probes = [
    { term: { $in: ["tomato", "tomtao"] } },
    {
      $or: [
        { deletions: { $in: deletionKeys("tomoto") } },
        { key: "tomato" },
        { skel: "tmt" },
      ],
    },
    { product: { $in: [tomato._id, potato._id] }, term: "tomato" },
    {
      product: { $in: [tomato._id] },
      $or: [{ key: "tomato" }, { skel: "tmt" }],
    },
  ];
  for (const probe of probes) {
    const winning = JSON.stringify(
      (await CatalogSearchTerm.find(probe).explain("queryPlanner")).queryPlanner
        .winningPlan,
    );
    assert.ok(winning.includes("IXSCAN"), winning);
    assert.ok(!winning.includes("COLLSCAN"), winning);
  }
  console.log(
    "PASS: multilingual search, typos, word order, did-you-mean, auth, ranking, indexed plans and repeatable index import",
  );
} finally {
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name === databaseName &&
    /^gaavli_catalog_test_[a-f0-9]{16}$/.test(databaseName)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
