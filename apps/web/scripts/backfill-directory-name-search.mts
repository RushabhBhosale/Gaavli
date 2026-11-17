import nextEnv from "@next/env";
import mongoose from "mongoose";
import { connectDb } from "../src/server/db/connect";
import { backfillDirectoryNameSearch } from "../src/server/repositories/directory-name-search-backfill";

nextEnv.loadEnvConfig(process.cwd());
const apply = process.argv.includes("--apply");
try {
  await connectDb();
  const counts = await backfillDirectoryNameSearch(apply);
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...counts }));
} finally {
  await mongoose.disconnect();
}
