import nextEnv from "@next/env";
import mongoose from "mongoose";
import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import { connectDb } from "../src/server/db/connect";
import { Category, Listing, User, Village } from "../src/server/models";
nextEnv.loadEnvConfig(process.cwd());
const villageId = process.argv
  .find((arg) => arg.startsWith("--village-id="))
  ?.split("=")[1];
const apply = process.argv.includes("--apply");
const products = [
  {
    slug: "tomato",
    productName: "Tomato",
    productGroup: "vegetables",
    productNameMr: "टोमॅटो",
    category: "PERISHABLE",
    quantity: 40,
    price: 28,
  },
  {
    slug: "onion",
    productName: "Onion",
    productGroup: "vegetables",
    productNameMr: "कांदा",
    category: "MID_SHELF_LIFE",
    quantity: 60,
    price: 32,
  },
  {
    slug: "potato",
    productName: "Potato",
    productGroup: "vegetables",
    productNameMr: "बटाटा",
    category: "MID_SHELF_LIFE",
    quantity: 30,
    price: 25,
  },
  {
    slug: "rice",
    productName: "Rice",
    productGroup: "grain",
    productNameMr: "तांदूळ",
    category: "LONG_SHELF_LIFE",
    quantity: 100,
    price: 55,
  },
  {
    slug: "mango",
    productName: "Mango",
    productGroup: "fruits",
    productNameMr: "आंबा",
    category: "PERISHABLE",
    quantity: 25,
    price: 120,
  },
];
const stableId = (key: string) =>
  new mongoose.Types.ObjectId(
    createHash("sha256")
      .update(`gaavli-narayangaon-demo-v1:${villageId}:${key}`)
      .digest("hex")
      .slice(0, 24),
  );
try {
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo seed is forbidden in production.");
  if (!villageId || !/^[a-f0-9]{24}$/i.test(villageId))
    throw new Error("Supply the exact --village-id=<MongoDB ID>.");
  for (const product of products)
    await access(
      `public/listing-photos/listings/narayangaon-demo-v1/${product.slug}.webp`,
    );
  await connectDb();
  await Promise.all([Listing.init(), User.init(), Village.init()]);
  const village = await Village.findOne({
    _id: villageId,
    isActive: true,
  }).lean();
  if (!village || !/^(narayangaon|narayangoan)$/i.test(village.nameEn.trim()))
    throw new Error("The exact target must be an active Narayangaon village.");
  const categories = await Category.find({
    code: { $in: [...new Set(products.map((product) => product.category))] },
    status: "ACTIVE",
  }).lean();
  if (categories.length !== 3)
    throw new Error(
      "Required active database categories are missing. Nothing seeded.",
    );
  const sellerId = stableId("seller");
  const sellerName = "Narayangaon demo seller (sample data)";
  const now = new Date();
  const expiry = new Date(now.getTime() + 14 * 86400000);
  const documents = products.map(
    ({ slug, ...product }) =>
      new Listing({
        _id: stableId(slug),
        ...product,
        unit: "kg",
        seller: sellerId,
        village: village._id,
        status: "active",
        isDemo: true,
        photoObjectKey: `listings/narayangaon-demo-v1/${slug}.webp`,
        expiresAt: expiry,
        createdAt: now,
        updatedAt: now,
      }),
  );
  await Promise.all(documents.map((doc) => doc.validate()));
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      village: {
        id: villageId,
        name: village.nameEn,
        taluka: village.taluka,
        district: village.district,
      },
      demoSeller: sellerName,
      products: documents.map((doc) => ({
        name: doc.productName,
        nameMr: doc.productNameMr,
        quantity: doc.quantity,
        unit: doc.unit,
        price: doc.price,
        photoObjectKey: doc.photoObjectKey,
      })),
      expiresAt: expiry.toISOString(),
    }),
  );
  if (apply) {
    await User.db.transaction(async (session) => {
      const currentVillage = await Village.findOne({
        _id: villageId,
        isActive: true,
      }).session(session);
      if (!currentVillage) throw new Error("Village is no longer active.");
      const existingSeller = await User.findById(sellerId)
        .session(session)
        .lean();
      if (
        existingSeller &&
        (existingSeller.name !== sellerName ||
          String(existingSeller.village) !== villageId ||
          existingSeller.mobile ||
          existingSeller.email)
      )
        throw new Error("Demo seller ID collision; nothing written.");
      await User.updateOne(
        { _id: sellerId },
        {
          $setOnInsert: {
            name: sellerName,
            village: village._id,
            roles: ["buyer", "seller"],
            status: "active",
            preferredLanguage: "mr",
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true, session, runValidators: true, timestamps: false },
      );
      for (const doc of documents) {
        const existing = await Listing.findById(doc._id)
          .session(session)
          .lean();
        if (
          existing &&
          (!existing.isDemo ||
            String(existing.village) !== villageId ||
            String(existing.seller) !== String(sellerId))
        )
          throw new Error("Demo listing ID collision; nothing written.");
        // Insert-only: retries never overwrite existing products or reset expiry.
        const { _id, ...fields } = doc.toObject();
        await Listing.updateOne(
          { _id },
          { $setOnInsert: fields },
          { upsert: true, session, runValidators: true, timestamps: false },
        );
        if (existing && process.argv.includes("--update-groups")) {
          if (existing.productName !== doc.productName)
            throw new Error("Demo product changed; refuse group migration.");
          await Listing.updateOne(
            { _id, isDemo: true, village: village._id, seller: sellerId },
            { $set: { productGroup: doc.productGroup } },
            { session, runValidators: true, timestamps: false },
          );
        }
      }
      const persisted = await Listing.find({
        _id: { $in: documents.map((doc) => doc._id) },
        village: village._id,
        seller: sellerId,
        isDemo: true,
      })
        .session(session)
        .lean();
      if (
        persisted.length !== 5 ||
        persisted.some((doc) => !doc.photoObjectKey)
      )
        throw new Error("Seed verification failed.");
    });
    console.log(
      "PASS: five database demo listings with photo keys verified. Existing village/sellers/listings preserved. No phone or contact fabricated.",
    );
  }
} catch (error) {
  console.error(
    error instanceof Error && !error.message.includes("mongodb")
      ? error.message
      : "Narayangaon seed failed; check database connection/access.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
