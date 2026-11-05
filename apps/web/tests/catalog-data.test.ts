import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { productMasterImportSchema } from "@gaavli/validation";
import { normalizeCatalogTerm } from "../src/server/catalog/search-text";

const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const catalog = read("../data/catalog/catalog.v1.json") as {
  categories: {
    categoryId: string;
    subcategories: { subcategoryId: string }[];
  }[];
  products: {
    productCode: string;
    categoryId: string;
    subcategoryId: string;
    names: { en: string; hi: string; mr: string };
    searchTermsNormalized: string[];
    allowedUnits: string[];
    defaultUnit: string;
    variantOf: string | null;
  }[];
};
const legacy = read("../data/gaavli_product_master.json") as { code: string }[];
const byCode = new Map(catalog.products.map((p) => [p.productCode, p]));

test("generated catalog has at least 5,000 uniquely coded products", () => {
  assert.ok(catalog.products.length >= 5000);
  assert.equal(byCode.size, catalog.products.length);
  const names = new Set(
    catalog.products.map((p) => normalizeCatalogTerm(p.names.en)),
  );
  assert.equal(names.size, catalog.products.length);
});

test("every existing Product Master code keeps its identity", () => {
  for (const { code } of legacy) assert.ok(byCode.has(code), code);
});

test("products reference real categories, units and variety parents", () => {
  const subs = new Map(
    catalog.categories.flatMap((c) =>
      c.subcategories.map((s) => [s.subcategoryId, c.categoryId] as const),
    ),
  );
  for (const p of catalog.products) {
    assert.equal(subs.get(p.subcategoryId), p.categoryId, p.productCode);
    assert.ok(p.allowedUnits.includes(p.defaultUnit), p.productCode);
    if (p.variantOf) assert.ok(byCode.has(p.variantOf), p.productCode);
    for (const name of [p.names.hi, p.names.mr])
      assert.match(name, /[ऀ-ॿ]/u, p.productCode);
  }
});

test("multilingual and romanized examples resolve to one canonical product", () => {
  const owners = (term: string) =>
    catalog.products
      .filter((p) =>
        p.searchTermsNormalized.includes(normalizeCatalogTerm(term)),
      )
      .map((p) => p.productCode);
  for (const [term, code] of [
    ["tomato", "TOMATO"],
    ["tamatar", "TOMATO"],
    ["टमाटर", "TOMATO"],
    ["टोमॅटो", "TOMATO"],
    ["kothimbir", "CORIANDER_LEAVES"],
    ["कोथिंबीर", "CORIANDER_LEAVES"],
    ["dhaniya", "CORIANDER_LEAVES"],
    ["batata", "POTATO"],
    ["बटाटा", "POTATO"],
    ["aloo", "POTATO"],
  ])
    assert.ok(owners(term).includes(code), `${term} -> ${code}`);
});

test("Product Master import file stays valid for the existing importer", () => {
  const rows = productMasterImportSchema.parse(
    read("../data/catalog/product-master.v2.json"),
  );
  for (const { code } of legacy)
    assert.ok(
      rows.some((row) => row.code === code),
      code,
    );
});
