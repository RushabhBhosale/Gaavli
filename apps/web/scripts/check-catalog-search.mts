// Read-only smoke check: runs real catalog searches against the configured DB.
// Usage: node --conditions=react-server --import tsx scripts/check-catalog-search.mts [term ...]
import nextEnv from "@next/env";
import mongoose from "mongoose";
import { connectDb } from "../src/server/db/connect";
import { searchCatalog } from "../src/server/repositories/catalog-search";

nextEnv.loadEnvConfig(process.cwd());
const terms = process.argv.slice(2);
try {
  await connectDb();
  for (const term of terms) {
    const started = performance.now();
    const { products, didYouMean } = await searchCatalog(term, 5);
    console.log(
      `${term}${didYouMean ? `  [did you mean: ${didYouMean}]` : ""} (${Math.round(performance.now() - started)} ms): ${
        products
          .map((p) => `${p.nameEn} / ${p.nameMr} / ${p.nameHi ?? "-"}`)
          .join(" | ") || "no results"
      }`,
    );
  }
} finally {
  await mongoose.disconnect();
}
