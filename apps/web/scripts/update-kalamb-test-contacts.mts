import nextEnv from "@next/env";
import { createHash } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { connectDb } from "../src/server/db/connect";
import { User } from "../src/server/models";

nextEnv.loadEnvConfig(process.cwd());
const villageArg = process.argv
  .find((arg) => arg.startsWith("--village-id="))
  ?.slice(13);
const apply = process.argv.includes("--apply");
const dbName = decodeURIComponent(
  new URL(process.env.MONGODB_URI || "").pathname.slice(1),
);
if (
  !villageArg ||
  !Types.ObjectId.isValid(villageArg) ||
  !(
    (dbName === "gaavli" && villageArg === "cc304fff547539c3e1733e42") ||
    /^gv_kalamb_test_[a-f0-9]{16}$/.test(dbName)
  )
)
  throw new Error(
    "This update is restricted to the authorized test database and village.",
  );
const key = (value: string) =>
  new Types.ObjectId(
    createHash("sha256")
      .update(`gaavli-kalamb-test-v1:${dbName}:${villageArg}:${value}`)
      .digest("hex")
      .slice(0, 24),
  );
const expected = [
  { id: key("seller-2"), name: "Anand Shinde", mobile: "9000000444" },
  { id: key("seller-3"), name: "Vasudha More", mobile: "9000000555" },
  { id: key("seller-4"), name: "Suresh Pawar", mobile: "9000000666" },
];
try {
  await connectDb();
  await User.init();
  for (const row of expected) {
    const user = await User.findOne({
      _id: row.id,
      name: row.name,
      village: villageArg,
      status: "active",
      roles: "seller",
    })
      .select("mobile")
      .lean();
    if (!user || (user.mobile && user.mobile !== row.mobile))
      throw new Error(
        "Sample seller is missing or has a different number; no changes made.",
      );
    if (
      await User.exists({
        _id: { $ne: row.id },
        mobile: { $in: [row.mobile, `+91${row.mobile}`, `91${row.mobile}`] },
      })
    )
      throw new Error(
        "A proposed test number is already in use; no changes made.",
      );
  }
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      database: dbName,
      sellers: expected.length,
    }),
  );
  if (apply) {
    await User.db.transaction(async (session) => {
      for (const row of expected) {
        const result = await User.updateOne(
          {
            _id: row.id,
            name: row.name,
            village: villageArg,
            status: "active",
            roles: "seller",
            $or: [
              { mobile: { $exists: false } },
              { mobile: null },
              { mobile: "" },
              { mobile: row.mobile },
            ],
          },
          { $set: { mobile: row.mobile } },
          { session, runValidators: true },
        );
        if (result.matchedCount !== 1)
          throw new Error("Sample seller changed; transaction cancelled.");
      }
    });
    console.log("Sample seller contacts updated.");
  }
} finally {
  await mongoose.disconnect();
}
