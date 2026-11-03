// Builds the master product directory from the curated text sources in
// data/catalog/source. Read-only unless --write is passed; never touches a
// database. Outputs are generated and must not be edited by hand.
//
// Source format (one record per line, "|" separated, "#" starts a comment):
//   @category|id|group|English|Hindi|Marathi
//   @sub|id|English|Hindi|Marathi|unit,unit,...      (first unit is default)
//   @category|id  /  @sub|id                         (reopen to append)
//   @pattern|{en} Seeds|{hi} बीज|{mr} बियाणे          (applies to "+CODE" lines)
//   English|Hindi|Marathi|alias,alias|units|flags
//   +CODE                                            (compose from pattern)
//   @alias|CODE|alias,alias                          (add search words to any product)
// Flags: =CODE pins a code, ^CODE marks a variety of CODE, ? needs review.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { LISTING_PRODUCT_GROUPS } from "@gaavli/constants";
import { productMasterImportSchema } from "@gaavli/validation";

const dataDir = fileURLToPath(new URL("../data/", import.meta.url));
const sourceDir = `${dataDir}catalog/source/`;
const write = process.argv.includes("--write");
const CATALOG_VERSION = 1;
const NEW_PRODUCT_SORT_BASE = 1000;
const UNITS = new Set([
  "kg",
  "g",
  "quintal",
  "ton",
  "litre",
  "ml",
  "piece",
  "dozen",
  "bunch",
  "bundle",
  "packet",
  "bottle",
  "jar",
  "box",
  "pair",
  "set",
  "metre",
  "plate",
  "pot",
  "bag",
  "roll",
  "sheet",
  "tray",
  "head",
]);

type Names = { en: string; hi: string; mr: string };
type Sub = { id: string; names: Names; units: string[] };
type Category = { id: string; group: string; names: Names; subs: Sub[] };
type Product = {
  productCode: string;
  slug: string;
  categoryId: string;
  subcategoryId: string;
  group: string;
  names: Names;
  aliases: string[];
  allowedUnits: string[];
  defaultUnit: string;
  variantOf: string | null;
  reviewStatus: "CURATED" | "NEEDS_REVIEW";
  source: string;
  line: string;
};

const errors: string[] = [];
const extraAliases: { code: string; where: string; aliases: string[] }[] = [];
const warnings: string[] = [];
const normalize = (value: string) =>
  value.normalize("NFKC").toLowerCase().trim().replace(/\s+/gu, " ");
const codeFor = (en: string) =>
  en
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
const slugFor = (code: string) => code.toLowerCase().replace(/_/g, "-");
// Devanagari plus ZWJ/ZWNJ, which Marathi uses for the "अ‍ॅ" ligature.
const devanagari = /^[0-9\u0900-\u097F\u200C\u200D\s()/.,:'&-]+$/u;

const categories: Category[] = [];
const products: Product[] = [];
const pending: {
  code: string;
  pattern: Names;
  product: Omit<
    Product,
    "names" | "productCode" | "slug" | "aliases" | "variantOf"
  > & { aliases: string[] };
}[] = [];

const files = (await readdir(sourceDir))
  .filter((f) => f.endsWith(".txt"))
  .sort();
for (const file of files) {
  const text = await readFile(sourceDir + file, "utf8");
  let category: Category | undefined;
  let sub: Sub | undefined;
  let pattern: Names | undefined;
  text.split("\n").forEach((raw, index) => {
    const where = `${file}:${index + 1}`;
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) return;
    const cols = line.split("|").map((col) => col.trim());
    if (cols[0] === "@category" && cols.length === 2) {
      category = categories.find((c) => c.id === cols[1]);
      if (!category)
        return errors.push(`${where}: unknown category ${cols[1]}`);
      sub = undefined;
      pattern = undefined;
      return;
    }
    if (cols[0] === "@sub" && cols.length === 2) {
      sub = category?.subs.find((s) => s.id === cols[1]);
      if (!sub) return errors.push(`${where}: unknown subcategory ${cols[1]}`);
      pattern = undefined;
      return;
    }
    if (cols[0] === "@category") {
      const [, id, group, en, hi, mr] = cols;
      if (!id || !group || !en || !hi || !mr)
        return errors.push(`${where}: incomplete category`);
      if (categories.some((c) => c.id === id))
        return errors.push(`${where}: duplicate category ${id}`);
      category = { id, group, names: { en, hi, mr }, subs: [] };
      categories.push(category);
      sub = undefined;
      pattern = undefined;
      return;
    }
    if (cols[0] === "@sub") {
      const [, id, en, hi, mr, units] = cols;
      if (!category) return errors.push(`${where}: @sub before @category`);
      if (!id || !en || !hi || !mr || !units)
        return errors.push(`${where}: incomplete subcategory`);
      if (categories.some((c) => c.subs.some((s) => s.id === id)))
        return errors.push(`${where}: duplicate subcategory ${id}`);
      sub = { id, names: { en, hi, mr }, units: units.split(",") };
      for (const unit of sub.units)
        if (!UNITS.has(unit)) errors.push(`${where}: unknown unit ${unit}`);
      category.subs.push(sub);
      pattern = undefined;
      return;
    }
    if (cols[0] === "@alias") {
      const [, code, list] = cols;
      if (!code || !list) return errors.push(`${where}: incomplete @alias`);
      extraAliases.push({ code, where, aliases: list.split(",") });
      return;
    }
    if (cols[0] === "@pattern") {
      const [, en, hi, mr] = cols;
      pattern = { en, hi, mr };
      return;
    }
    if (!category || !sub) return errors.push(`${where}: product before @sub`);
    const base = {
      categoryId: category.id,
      subcategoryId: sub.id,
      group: category.group,
      allowedUnits: sub.units,
      defaultUnit: sub.units[0],
      reviewStatus: "CURATED" as const,
      source: `catalog/source/${file}`,
      line: where,
    };
    if (cols[0].startsWith("+")) {
      if (!pattern) return errors.push(`${where}: +CODE without @pattern`);
      pending.push({
        code: cols[0].slice(1),
        pattern,
        product: { ...base, aliases: [] },
      });
      return;
    }
    const [en, hi, mr, aliasCol = "", unitCol = "", flagCol = ""] = cols;
    if (!en || !hi || !mr)
      return errors.push(`${where}: English, Hindi and Marathi are required`);
    const flags = flagCol.split(/\s+/).filter(Boolean);
    const units = unitCol ? unitCol.split(",") : sub.units;
    for (const unit of units)
      if (!UNITS.has(unit)) errors.push(`${where}: unknown unit ${unit}`);
    const productCode =
      flags.find((f) => f.startsWith("="))?.slice(1) || codeFor(en);
    products.push({
      ...base,
      productCode,
      slug: slugFor(productCode),
      names: { en, hi, mr },
      aliases: aliasCol
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      allowedUnits: units,
      defaultUnit: units[0],
      variantOf: flags.find((f) => f.startsWith("^"))?.slice(1) || null,
      reviewStatus: flags.includes("?") ? "NEEDS_REVIEW" : "CURATED",
    });
  });
}

// Compose pattern rows after every explicit product is known.
const byCode = new Map(products.map((p) => [p.productCode, p]));
for (const { code, pattern, product } of pending) {
  const source = byCode.get(code);
  if (!source) {
    errors.push(`${product.line}: unknown base product ${code}`);
    continue;
  }
  const fill = (template: string, key: keyof Names) =>
    template.replace(`{${key}}`, source.names[key]);
  const names = {
    en: fill(pattern.en, "en"),
    hi: fill(pattern.hi, "hi"),
    mr: fill(pattern.mr, "mr"),
  };
  const productCode = codeFor(names.en);
  products.push({
    ...product,
    productCode,
    slug: slugFor(productCode),
    names,
    variantOf: null,
    reviewStatus: source.reviewStatus,
  });
}

for (const { code, where, aliases } of extraAliases) {
  const target = products.find((p) => p.productCode === code);
  if (!target) {
    errors.push(`${where}: @alias for unknown product ${code}`);
    continue;
  }
  const have = new Set(target.aliases.map(normalize));
  for (const alias of aliases.map((a) => a.trim()).filter(Boolean))
    if (!have.has(normalize(alias))) {
      target.aliases.push(alias);
      have.add(normalize(alias));
    }
}

// Integrity checks.
const codes = new Map<string, Product>();
const enNames = new Map<string, Product>();
for (const p of products) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(p.productCode) || p.productCode.length > 80)
    errors.push(`${p.line}: invalid code ${p.productCode}`);
  const clash = codes.get(p.productCode);
  if (clash)
    errors.push(
      `${p.line}: duplicate code ${p.productCode} (also ${clash.line})`,
    );
  codes.set(p.productCode, p);
  const en = normalize(p.names.en);
  const sameEn = enNames.get(en);
  if (sameEn)
    errors.push(
      `${p.line}: duplicate English name "${p.names.en}" (also ${sameEn.line})`,
    );
  enNames.set(en, p);
  for (const key of ["hi", "mr"] as const)
    if (!devanagari.test(p.names[key]))
      errors.push(`${p.line}: ${key} name is not Devanagari: ${p.names[key]}`);
  for (const value of Object.values(p.names))
    if (value.length > 120) errors.push(`${p.line}: name longer than 120`);
}
for (const p of products)
  if (p.variantOf && !codes.has(p.variantOf))
    errors.push(`${p.line}: unknown variety parent ${p.variantOf}`);

// Existing Product Master codes must survive with the same identity.
const legacy = JSON.parse(
  await readFile(`${dataDir}gaavli_product_master.json`, "utf8"),
) as {
  code: string;
  nameEn: string;
  nameMr: string;
  sortOrder: number;
  productGroup: string;
}[];
const legacyByCode = new Map(legacy.map((row) => [row.code, row]));
for (const row of legacy) {
  const p = codes.get(row.code);
  if (!p)
    errors.push(`existing product ${row.code} is missing from the catalog`);
  else if (p.names.mr !== row.nameMr || p.names.en !== row.nameEn)
    warnings.push(
      `existing ${row.code}: catalog names differ from Product Master (database keeps the original)`,
    );
}

// Shared native names are common (e.g. one Marathi word for a crop and its
// pods); report them so reviewers can confirm they are intentional.
for (const key of ["hi", "mr"] as const) {
  const seen = new Map<string, string[]>();
  for (const p of products) {
    const name = normalize(p.names[key]);
    seen.set(name, [...(seen.get(name) || []), p.productCode]);
  }
  for (const [name, list] of seen)
    if (list.length > 1)
      warnings.push(`shared ${key} name "${name}": ${list.join(", ")}`);
}

// Search terms: every name and alias, normalized once at build time.
const termOwners = new Map<string, Set<string>>();
const catalogProducts = products.map((p, index) => {
  const terms = new Set<string>();
  for (const value of [...Object.values(p.names), ...p.aliases]) {
    const term = normalize(value);
    if (term) terms.add(term);
  }
  for (const term of terms)
    termOwners.set(
      term,
      (termOwners.get(term) || new Set()).add(p.productCode),
    );
  const old = legacyByCode.get(p.productCode);
  return {
    productCode: p.productCode,
    slug: p.slug,
    categoryId: p.categoryId,
    subcategoryId: p.subcategoryId,
    names: p.names,
    aliases: p.aliases,
    searchTermsNormalized: [...terms],
    allowedUnits: p.allowedUnits,
    defaultUnit: old ? undefined : p.defaultUnit,
    variantOf: p.variantOf,
    status: p.reviewStatus === "CURATED" ? "active" : "pending_review",
    reviewStatus: p.reviewStatus,
    sortOrder: old ? old.sortOrder : NEW_PRODUCT_SORT_BASE + index,
    source: p.source,
  };
});
// Legacy units stay authoritative for existing records.
for (const product of catalogProducts) {
  const old = legacy.find((row) => row.code === product.productCode) as
    { defaultUnit: string } | undefined;
  product.defaultUnit = old ? old.defaultUnit : product.defaultUnit;
  if (old && !product.allowedUnits.includes(old.defaultUnit))
    product.allowedUnits = [old.defaultUnit, ...product.allowedUnits];
}
const ambiguous = [...termOwners].filter(([, owners]) => owners.size > 1);

const legacyGroups = new Set<string>(LISTING_PRODUCT_GROUPS);
const masterRows = products
  .filter((p) => legacyByCode.has(p.productCode) || legacyGroups.has(p.group))
  .map((p) => {
    const product = catalogProducts.find(
      (c) => c.productCode === p.productCode,
    )!;
    const old = legacyByCode.get(p.productCode);
    return {
      code: p.productCode,
      nameMr: old ? old.nameMr : p.names.mr,
      nameEn: old ? old.nameEn : p.names.en,
      nameHi: p.names.hi,
      productGroup: old ? old.productGroup : p.group,
      defaultUnit: product.defaultUnit!,
      status: p.reviewStatus === "CURATED" ? "ACTIVE" : "INACTIVE",
      sortOrder: product.sortOrder,
    };
  });
const blockedGroups = [...new Set(products.map((p) => p.group))].filter(
  (group) => !legacyGroups.has(group),
);
if (!errors.length) productMasterImportSchema.parse(masterRows);

// Aliases for the search-term index: Hindi names plus curated aliases.
// English and Marathi names are indexed from the Product Master itself.
const aliases: Record<string, string[]> = {};
for (const p of products) {
  const list = [...new Set([p.names.hi, ...p.aliases])];
  const old = legacyByCode.get(p.productCode);
  // Keep catalog names searchable even where the stored legacy name differs.
  if (old && old.nameMr !== p.names.mr) list.push(p.names.mr);
  if (old && old.nameEn !== p.names.en) list.push(p.names.en);
  if (list.length) aliases[p.productCode] = list.slice(0, 100);
}

const perCategory = Object.fromEntries(
  categories.map((c) => [
    c.id,
    products.filter((p) => p.categoryId === c.id).length,
  ]),
);
const report = {
  mode: write ? "write" : "dry-run",
  files: files.length,
  categories: categories.length,
  subcategories: categories.reduce((n, c) => n + c.subs.length, 0),
  products: products.length,
  varieties: products.filter((p) => p.variantOf).length,
  needsReview: products.filter((p) => p.reviewStatus === "NEEDS_REVIEW").length,
  productMasterRows: masterRows.length,
  blockedGroups,
  blockedProducts: products.length - masterRows.length,
  ambiguousTerms: ambiguous.length,
  perCategory,
  warnings: warnings.length,
  errors: errors.length,
};
if (process.argv.includes("--verbose"))
  for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);

if (write) {
  const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
  // One record per line keeps the 5k-row files small and diffs reviewable.
  const lines = (rows: unknown[]) =>
    `[\n${rows.map((row) => JSON.stringify(row)).join(",\n")}\n]`;
  const header = {
    catalogVersion: CATALOG_VERSION,
    languages: ["en", "hi", "mr"],
    license:
      "Gaavli curated catalog; names are generic product names, not brands. See data/catalog/README.md.",
  };
  await writeFile(
    `${dataDir}catalog/catalog.v1.json`,
    `${JSON.stringify(header).slice(0, -1)},\n"categories": ${lines(
      categories.map((c) => ({
        categoryId: c.id,
        group: c.group,
        names: c.names,
        subcategories: c.subs.map((s) => ({
          subcategoryId: s.id,
          names: s.names,
          defaultUnits: s.units,
        })),
      })),
    )},\n"products": ${lines(catalogProducts)}\n}\n`,
  );
  await writeFile(
    `${dataDir}catalog/product-master.v2.json`,
    `${lines(masterRows)}\n`,
  );
  await writeFile(`${dataDir}catalog-aliases.v1.json`, json(aliases));
  await writeFile(
    `${dataDir}catalog/ambiguous-terms.v1.json`,
    json(
      Object.fromEntries(
        ambiguous.map(([term, owners]) => [term, [...owners]]),
      ),
    ),
  );
}
