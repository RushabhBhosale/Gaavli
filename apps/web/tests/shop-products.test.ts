import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LISTING_PRODUCT_GROUPS,
  MAX_SHOP_PRODUCTS,
  ProviderType,
  SHOP_POPULAR_ITEMS,
  SHOP_PRODUCT_GROUPS,
  SHOP_TYPE_PRODUCT_GROUPS,
} from "@gaavli/constants";
import {
  createProviderProfileSchema,
  productShopsSchema,
  providerDetailsSchema,
} from "@gaavli/validation";

const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const masters = new Map(
  (
    read("../data/catalog/product-master.v2.json") as {
      code: string;
      productGroup: string;
      status: string;
    }[]
  ).map((row) => [row.code, row]),
);
const shopTypes = (
  read("../data/gaavli_provider_master_seed_simple_en_mr_hi.json") as {
    masterType: string;
    code: string;
  }[]
)
  .filter((row) => row.masterType === "SHOP_TYPE")
  .map((row) => row.code);
const shopDetails = providerDetailsSchema(ProviderType.SHOP_BUSINESS);

test("every shop group is a listing group with three names", () => {
  const ids = SHOP_PRODUCT_GROUPS.map((group) => group.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const group of SHOP_PRODUCT_GROUPS) {
    assert.ok((LISTING_PRODUCT_GROUPS as readonly string[]).includes(group.id));
    assert.ok(group.en && group.mr && group.hi, group.id);
  }
  assert.ok(!ids.includes("grain" as never), "legacy grain stays hidden");
});

test("popular items are active catalogue products of their own group", () => {
  for (const [group, items] of Object.entries(SHOP_POPULAR_ITEMS)) {
    assert.ok(items.length > 0, group);
    for (const item of items) {
      const master = masters.get(item.code);
      assert.ok(master, `${item.code} is in the product master`);
      assert.equal(master.status, "ACTIVE", item.code);
      assert.equal(master.productGroup, group, item.code);
    }
  }
  for (const group of SHOP_PRODUCT_GROUPS)
    assert.ok(SHOP_POPULAR_ITEMS[group.id]?.length, `${group.id} has items`);
});

test("shop type suggestions use seeded shop types and shop groups", () => {
  const groups = new Set(SHOP_PRODUCT_GROUPS.map((group) => group.id));
  for (const [code, suggested] of Object.entries(SHOP_TYPE_PRODUCT_GROUPS)) {
    assert.ok(shopTypes.includes(code), `${code} is a seeded shop type`);
    for (const group of suggested) assert.ok(groups.has(group), group);
  }
});

test("shop details accept groups and items, and default them to empty", () => {
  const base = { shopType: "GROCERY" };
  assert.deepEqual(shopDetails.parse(base).sells, []);
  assert.deepEqual(shopDetails.parse(base).products, []);
  const parsed = shopDetails.parse({
    ...base,
    sells: ["vegetables", "fruits"],
    products: ["TOMATO", "ONION"],
  });
  assert.deepEqual(parsed.sells, ["vegetables", "fruits"]);
  assert.deepEqual(parsed.products, ["TOMATO", "ONION"]);
});

test("shop details reject unknown groups, duplicates and too many items", () => {
  const base = { shopType: "GROCERY" };
  for (const details of [
    { ...base, sells: ["sweets"] },
    { ...base, sells: ["grain"] },
    { ...base, sells: ["fruits", "fruits"] },
    { ...base, products: ["tomato"] },
    { ...base, products: ["TOMATO", "TOMATO"] },
    {
      ...base,
      products: Array.from(
        { length: MAX_SHOP_PRODUCTS + 1 },
        (_, i) => `P${i}`,
      ),
    },
  ])
    assert.equal(
      shopDetails.safeParse(details).success,
      false,
      JSON.stringify(details).slice(0, 80),
    );
});

test("other provider types cannot send shop products", () => {
  const result = createProviderProfileSchema.safeParse({
    providerType: ProviderType.PROFESSIONAL_SERVICE,
    name: "Ramesh Electric",
    villageId: "a".repeat(24),
    contacts: [{ label: "primary", mobile: "9876543210" }],
    details: { profession: "ELECTRICIAN", sells: ["vegetables"] },
  });
  assert.equal(result.success, false);
});

test("product shops response allows no matching product", () => {
  const empty = { entries: [], total: 0 };
  assert.ok(
    productShopsSchema.safeParse({
      product: null,
      haveIt: empty,
      sellsGroup: empty,
    }).success,
  );
});
