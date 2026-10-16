import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDb } from "../src/server/db/connect";
import { Admin } from "../src/server/models";
loadEnvConfig(process.cwd());
async function main() {
  const config = z
    .object({
      ADMIN_EMAIL: z.email(),
      ADMIN_PASSWORD: z.string().min(12).max(72),
      ADMIN_NAME: z.string().min(1),
      JWT_SECRET: z.string().min(32),
    })
    .parse(process.env);
  await connectDb();
  await Admin.init();
  if (await Admin.exists({ email: config.ADMIN_EMAIL.toLowerCase() })) {
    console.log("Admin already exists; credentials were not changed.");
    return;
  }
  const passwordHash = await bcrypt.hash(config.ADMIN_PASSWORD, 12);
  await Admin.updateOne(
    { email: config.ADMIN_EMAIL.toLowerCase() },
    {
      $setOnInsert: {
        email: config.ADMIN_EMAIL.toLowerCase(),
        name: config.ADMIN_NAME,
        passwordHash,
        role: "super_admin",
        status: "active",
      },
    },
    { upsert: true },
  );
  console.log("Super Admin created.");
}
main()
  .catch((error) => {
    if (error instanceof z.ZodError) {
      console.error("Seed failed: invalid environment configuration.");
      for (const issue of error.issues)
        console.error(`${issue.path.join(".")}: ${issue.message}`);
    } else {
      console.error(
        "Seed failed: could not create the administrator. Check MONGODB_URI, database access and connectivity.",
      );
    }
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
