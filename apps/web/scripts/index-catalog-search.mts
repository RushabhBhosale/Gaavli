import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDb } from "../src/server/db/connect";
import { ProductMaster } from "../src/server/models/product-master";
import { CatalogSearchTerm } from "../src/server/models/catalog-search-term";
import {
  deletionKeys,
  normalizeCatalogTerm,
  phoneticKey,
  skeletonKey,
  termWords,
} from "../src/server/catalog/search-text";

nextEnv.loadEnvConfig(process.cwd());
const BATCH = 1000;
const aliases = z
  .record(
    z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    z.array(z.string().trim().min(1).max(120)).max(100),
  )
  .parse(
    JSON.parse(
      await readFile(
        new URL("../data/catalog-aliases.v1.json", import.meta.url),
        "utf8",
      ),
    ),
  );
const apply = process.argv.includes("--apply");
let products = 0,
  terms = 0;
try {
  await connectDb();
  if (apply) await CatalogSearchTerm.init();
  // term -> product, so stale terms can be removed once every product is durable.
  const expected = new Map<string, Set<string>>();
  let operations: mongoose.AnyBulkWriteOperation[] = [];
  const flush = async () => {
    if (operations.length)
      await CatalogSearchTerm.bulkWrite(operations, { ordered: false });
    operations = [];
  };
  const cursor = ProductMaster.find()
    .select("code nameEn nameMr nameHi")
    .lean()
    .cursor();
  for await (const product of cursor) {
    const names = [product.nameEn, product.nameMr, product.nameHi]
      .filter((name): name is string => !!name)
      .map(normalizeCatalogTerm);
    const others = (aliases[product.code] || []).map(normalizeCatalogTerm);
    const map = new Map<string, "name" | "alias" | "word">();
    // Weakest kind first, so a stronger kind for the same term wins.
    for (const term of [...names, ...others].flatMap(termWords))
      map.set(term, "word");
    for (const alias of others) map.set(alias, "alias");
    for (const name of names) map.set(name, "name");
    const rows = [...map].filter(([term]) => term.length > 0);
    products++;
    terms += rows.length;
    if (!apply) continue;
    expected.set(String(product._id), new Set(rows.map(([term]) => term)));
    for (const [term, kind] of rows)
      operations.push({
        updateOne: {
          filter: { product: product._id, term },
          update: {
            $set: {
              kind,
              deletions: deletionKeys(term),
              key: phoneticKey(term),
              skel: skeletonKey(term),
            },
          },
          upsert: true,
        },
      });
    if (operations.length >= BATCH) await flush();
  }
  if (apply) {
    await flush();
    // Remove terms that are no longer produced, including terms of deleted
    // masters, only after every current term is durable.
    let stale: unknown[] = [];
    const existing = CatalogSearchTerm.find()
      .select("product term")
      .lean()
      .cursor();
    for await (const row of existing) {
      if (expected.get(String(row.product))?.has(row.term)) continue;
      stale.push(row._id);
      if (stale.length >= BATCH) {
        await CatalogSearchTerm.deleteMany({ _id: { $in: stale } });
        stale = [];
      }
    }
    if (stale.length)
      await CatalogSearchTerm.deleteMany({ _id: { $in: stale } });
  }
  console.log(
    JSON.stringify({ mode: apply ? "applied" : "dry-run", products, terms }),
  );
} finally {
  await mongoose.disconnect();
}
