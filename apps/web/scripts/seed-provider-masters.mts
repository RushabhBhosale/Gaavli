import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import { providerMasterSeedSchema } from "@gaavli/validation";
import { connectDb } from "../src/server/db/connect";
import { seedProviderMasters } from "../src/server/repositories/provider-masters";

nextEnv.loadEnvConfig(process.cwd());
const file = fileURLToPath(
  new URL(
    "../data/gaavli_provider_master_seed_simple_en_mr_hi.json",
    import.meta.url,
  ),
);
const rows = providerMasterSeedSchema.parse(
  JSON.parse(await readFile(file, "utf8")),
);
if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({
      mode: "validation-only",
      records: rows.length,
      groups: Object.fromEntries(
        [...new Set(rows.map((row) => row.masterType))].map((group) => [
          group,
          rows.filter((row) => row.masterType === group).length,
        ]),
      ),
      instruction:
        "Pass --apply to insert missing records. Existing records are never overwritten.",
    }),
  );
} else {
  try {
    await connectDb();
    console.log(JSON.stringify(await seedProviderMasters(rows)));
  } finally {
    await mongoose.disconnect();
  }
}
