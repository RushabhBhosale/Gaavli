import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { connectDb } from "../src/server/db/connect";
import { Category } from "../src/server/models";

loadEnvConfig(process.cwd());
async function main() {
  await connectDb();
  await Category.init();
  const defaults = [
    {
      code: "PERISHABLE",
      name: "Perishable",
      nameMr: "नाशवंत",
      defaultShelfLife: "1–2 days",
      notifyMode: "daily_digest",
    },
    {
      code: "RECURRING_SUPPLY",
      name: "Recurring supply",
      nameMr: "नियमित पुरवठा",
      defaultShelfLife: "Standing",
      notifyMode: "change_only",
    },
    {
      code: "MID_SHELF_LIFE",
      name: "Mid shelf-life",
      nameMr: "मध्यम टिकाऊ",
      defaultShelfLife: "~7 days",
      notifyMode: "daily_digest",
    },
    {
      code: "LONG_SHELF_LIFE",
      name: "Long shelf-life",
      nameMr: "दीर्घ टिकाऊ",
      defaultShelfLife: "30+ days",
      notifyMode: "weekly_digest",
    },
  ];
  for (const [index, category] of defaults.entries()) {
    await Category.updateOne(
      { code: category.code },
      { $setOnInsert: { ...category, status: "ACTIVE", sortOrder: index + 1 } },
      { upsert: true, runValidators: true },
    );
  }
  console.log("Default categories initialized; existing categories preserved.");
}
main()
  .catch(() => {
    console.error(
      "Category initialization failed. Check database configuration and connectivity.",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
