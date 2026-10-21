import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import { productMasterImportSchema } from "@gaavli/validation";
import { connectDb } from "../src/server/db/connect";
import { ProductMaster } from "../src/server/models/product-master";
import { importMasterProducts } from "../src/server/repositories/product-master";

nextEnv.loadEnvConfig(process.cwd());
const inputFile =
  process.argv.find((arg) => arg.startsWith("--file="))?.slice(7) ||
  fileURLToPath(new URL("../data/gaavli_product_master.json", import.meta.url));
const rows = productMasterImportSchema.parse(
  JSON.parse(await readFile(inputFile, "utf8")),
);
try {
  await connectDb();
  const codes = rows.map((row) => row.code);
  const before = await ProductMaster.countDocuments({ code: { $in: codes } });
  if (!process.argv.includes("--apply")) {
    console.log(
      JSON.stringify({
        mode: "dry-run",
        source: rows.length,
        existing: before,
        toInsert: rows.length - before,
      }),
    );
  } else {
    const result = await importMasterProducts(rows);
    const saved = await ProductMaster.countDocuments({ code: { $in: codes } });
    if (saved !== rows.length)
      throw new Error("Product Master verification failed");
    console.log(
      JSON.stringify({ mode: "applied", ...result, verified: saved }),
    );
  }
} finally {
  await mongoose.disconnect();
}
