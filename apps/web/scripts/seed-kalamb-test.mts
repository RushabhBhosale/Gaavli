import nextEnv from "@next/env";
import mongoose, { Types } from "mongoose";
import { createHash } from "node:crypto";
import {
  Category,
  Listing,
  Notification,
  User,
  Village,
} from "../src/server/models";
import { ProductMaster } from "../src/server/models/product-master";
import { Service } from "../src/server/models/service";
import { connectDb } from "../src/server/db/connect";

nextEnv.loadEnvConfig(process.cwd());
const apply = process.argv.includes("--apply");
const villageArg = process.argv
  .find((x) => x.startsWith("--village-id="))
  ?.slice(13);
const ownerArg = process.argv
  .find((x) => x.startsWith("--owner-id="))
  ?.slice(11);
if (
  !villageArg ||
  !ownerArg ||
  !Types.ObjectId.isValid(villageArg) ||
  !Types.ObjectId.isValid(ownerArg)
)
  throw new Error("Supply valid --village-id and --owner-id.");
const expectedVillage = new Types.ObjectId(villageArg),
  ownerId = new Types.ObjectId(ownerArg);
const dbName = decodeURIComponent(
  new URL(process.env.MONGODB_URI || "").pathname.slice(1),
);
const permitted =
  dbName === "gaavli" &&
  villageArg === "cc304fff547539c3e1733e42" &&
  ownerArg === "6ae83ab32365c6a6cea7257e";
const isolatedTest = /^gv_kalamb_test_[a-f0-9]{16}$/.test(dbName);
if (!permitted && !isolatedTest)
  throw new Error(
    "This seed is restricted to the authorized Kalamb test database and account.",
  );
const key = (value: string) =>
  new Types.ObjectId(
    createHash("sha256")
      .update(`gaavli-kalamb-test-v1:${dbName}:${villageArg}:${value}`)
      .digest("hex")
      .slice(0, 24),
  );
const products = [
  ["TOMATO", 32, 40, "listings/assets/tomato.webp"],
  ["ONION", 28, 65, "listings/assets/onion.webp"],
  ["POTATO", 30, 48, "listings/assets/potato.webp"],
  ["CAULIFLOWER", 35, 18, null],
  ["SPINACH", 15, 24, null],
  ["CORIANDER_LEAVES", 12, 20, null],
  ["MANGO", 180, 12, "listings/assets/mango.webp"],
  ["BANANA", 65, 15, null],
  ["LEMON", 5, 4, null],
  ["RICE", 72, 80, "listings/assets/rice.webp"],
  ["WHEAT", 42, 0, null],
  ["JAGGERY", 70, 0, null],
  ["BRINJAL", 40, 20, null],
  ["OKRA", 45, 18, null],
  ["CUCUMBER", 28, 22, null],
  ["CLUSTER_BEANS", 55, 16, null],
  ["GUAVA", 70, 15, null],
  ["PAPAYA", 45, 20, null],
  ["POMEGRANATE", 110, 18, null],
  ["COW_MILK", 60, 25, null],
  ["CURD", 90, 12, null],
  ["GHEE", 680, 6, null],
  ["TOOR_DAL", 150, 30, null],
  ["MOONG_DAL", 125, 24, null],
  ["MANGO_PICKLE", 320, 8, null],
  ["LEMON_PICKLE", 280, 7, null],
  ["UDID_PAPAD", 260, 10, null],
  ["RAGI_LADOO", 360, 6, null],
] as const;
const services = [
  [
    "services",
    "Farm equipment repair",
    "शेती उपकरणे दुरुस्ती",
    "Utility",
    200,
    "visit",
  ],
  ["services", "Tailoring", "शिलाई काम", "Other", 150, "item"],
  [
    "services",
    "Irrigation pump repair",
    "पाणी पंप दुरुस्ती",
    "Utility",
    250,
    "visit",
  ],
  [
    "transport",
    "Local goods vehicle",
    "स्थानिक मालवाहतूक",
    "Other",
    400,
    "trip",
  ],
  [
    "transport",
    "Tractor with trolley",
    "ट्रॅक्टर व ट्रॉली",
    "Other",
    600,
    "trip",
  ],
] as const;
try {
  await connectDb();
  await Promise.all([
    User.init(),
    Listing.init(),
    Service.init(),
    Notification.init(),
  ]);
  const village = await Village.findOne({
    _id: expectedVillage,
    isActive: true,
  }).lean();
  const owner = await User.findOne({
    _id: ownerId,
    status: "active",
    roles: "seller",
  }).lean();
  if (!village || village.nameEn.toLowerCase() !== "kalamb" || !owner?.village)
    throw new Error("Expected active Kalamb and seller account not found.");
  const ownerVillage = await Village.findOne({
    _id: owner.village,
    isActive: true,
  }).lean();
  if (!ownerVillage)
    throw new Error("Seller's registered village is unavailable.");
  const categories = await Category.find({
    code: { $in: ["PERISHABLE", "LONG_SHELF_LIFE"] },
    status: "ACTIVE",
  }).lean();
  if (categories.length !== 2)
    throw new Error("Required active categories not found.");
  const master = await ProductMaster.find({
    code: { $in: products.map((p) => p[0]) },
    status: "ACTIVE",
  }).lean();
  if (master.length !== products.length)
    throw new Error(
      "Required active products are missing; no records written.",
    );
  const sellerIds = [
    key("seller-1"),
    key("seller-2"),
    key("seller-3"),
    key("seller-4"),
  ];
  const buyerId = key("buyer");
  const now = new Date();
  const users = [
    {
      _id: sellerIds[0],
      name: "Meera Jadhav",
      firstName: "Meera",
      lastName: "Jadhav",
      mobile: "9000000222",
      roles: ["buyer", "seller"],
    },
    {
      _id: sellerIds[1],
      name: "Anand Shinde",
      firstName: "Anand",
      lastName: "Shinde",
      mobile: "9000000444",
      roles: ["buyer", "seller"],
    },
    {
      _id: sellerIds[2],
      name: "Vasudha More",
      firstName: "Vasudha",
      lastName: "More",
      mobile: "9000000555",
      roles: ["buyer", "seller"],
    },
    {
      _id: sellerIds[3],
      name: "Suresh Pawar",
      firstName: "Suresh",
      lastName: "Pawar",
      mobile: "9000000666",
      roles: ["buyer", "seller"],
    },
    {
      _id: buyerId,
      name: "Asha Patil",
      firstName: "Asha",
      lastName: "Patil",
      roles: ["buyer"],
    },
  ].map((u) => ({
    ...u,
    village: expectedVillage,
    status: "active",
    preferredLanguage: "mr",
    createdAt: now,
    updatedAt: now,
  }));
  const makeListing = (
    code: string,
    price: number,
    quantity: number,
    photo: string | null,
    seller: Types.ObjectId,
    villageId: Types.ObjectId,
    idName: string,
    index: number,
  ) => {
    const product = master.find((p) => p.code === code)!;
    const longLife = ["grain", "grains", "pulses", "homemade"].includes(
      product.productGroup,
    );
    const category = categories.find(
      (c) => c.code === (longLife ? "LONG_SHELF_LIFE" : "PERISHABLE"),
    )!;
    return {
      _id: key(idName),
      productId: product._id,
      productName: product.nameEn,
      productNameMr: product.nameMr,
      productGroup: product.productGroup,
      category: category.code,
      categoryId: category._id,
      description: longLife
        ? "Prepared for local pickup. Please contact for availability."
        : "Freshly available for local pickup. Please contact for details.",
      price,
      quantity,
      unit: product.defaultUnit,
      seller,
      village: villageId,
      status: quantity ? "active" : "sold_out",
      expiresAt: new Date(now.getTime() + 30 * 86400000),
      fulfillmentOptions: ["farm_pickup"],
      photoObjectKey: photo || undefined,
      isDemo: false,
      version: 1,
      createdAt: new Date(now.getTime() - index * 45 * 60000),
      updatedAt: now,
    };
  };
  const listingRows = products.map(([code, price, qty, photo], i) =>
    makeListing(
      code,
      price,
      qty,
      photo,
      sellerIds[i % sellerIds.length],
      expectedVillage,
      `listing-${code}`,
      i,
    ),
  );
  const ownerRows = [
    makeListing(
      "RICE",
      68,
      35,
      "listings/assets/rice.webp",
      ownerId,
      ownerVillage._id,
      "owner-rice",
      2,
    ),
    makeListing(
      "TOMATO",
      30,
      18,
      "listings/assets/tomato.webp",
      ownerId,
      ownerVillage._id,
      "owner-tomato",
      8,
    ),
    makeListing(
      "BANANA",
      60,
      0,
      null,
      ownerId,
      ownerVillage._id,
      "owner-banana",
      25,
    ),
  ];
  const serviceRows = services.map(
    ([module, profession, professionMr, serviceCategory, price, unit], i) => ({
      _id: key(`service-${i}`),
      userId: sellerIds[i % sellerIds.length],
      villageId: expectedVillage,
      module,
      profession,
      professionMr,
      serviceCategory,
      price,
      unit,
      status: "ACTIVE",
      available: true,
      description: "Available locally. Please contact for availability.",
      createdAt: new Date(now.getTime() - i * 3600000),
      updatedAt: now,
    }),
  );
  const notices = [
    {
      _id: key("notice-received"),
      userId: ownerId,
      type: "BUYER_TRIED_CONTACT",
      title: "A buyer tried to reach you",
      titleMr: "एका खरेदीदाराने संपर्क करण्याचा प्रयत्न केला",
      body: "Asha Patil is interested in your rice.",
      bodyMr: "आशा पाटील यांना तुमच्या तांदळामध्ये रस आहे.",
      data: {
        listingId: ownerRows[0]._id,
        buyerId,
        productName: "Rice",
        productNameMr: "तांदूळ",
        buyerName: "Asha Patil",
        sellerName:
          [owner.firstName, owner.lastName].filter(Boolean).join(" ") ||
          owner.name,
        quantity: 2,
        callbackConsent: false,
      },
      readAt: null,
    },
    {
      _id: key("notice-sent"),
      userId: sellerIds[0],
      type: "BUYER_TRIED_CONTACT",
      title: "A buyer tried to reach you",
      titleMr: "एका खरेदीदाराने संपर्क करण्याचा प्रयत्न केला",
      body: "A buyer is interested in your tomatoes.",
      bodyMr: "एका खरेदीदाराला तुमच्या टोमॅटोमध्ये रस आहे.",
      data: {
        listingId: listingRows[0]._id,
        buyerId: ownerId,
        productName: "Tomato",
        productNameMr: "टोमॅटो",
        buyerName:
          [owner.firstName, owner.lastName].filter(Boolean).join(" ") ||
          owner.name,
        sellerName: "Meera Jadhav",
        quantity: 3,
        callbackConsent: false,
      },
      readAt: null,
    },
  ].map((notice) => ({ ...notice, createdAt: now, updatedAt: now }));
  const batches = [
    { model: User, docs: users },
    { model: Listing, docs: [...listingRows, ...ownerRows] },
    { model: Service, docs: serviceRows },
    { model: Notification, docs: notices },
  ];
  for (const { model, docs } of batches)
    for (const doc of docs) await new model(doc).validate();
  for (const seller of users.filter((user) => user.mobile)) {
    const mobile = seller.mobile!;
    const collisions = await User.countDocuments({
      mobile: { $in: [mobile, `+91${mobile}`, `91${mobile}`] },
      _id: { $ne: seller._id },
    });
    if (collisions)
      throw new Error(
        "Test phone collides with an existing account; no records written.",
      );
  }
  for (const { model, docs } of batches)
    for (const doc of docs) {
      const existing = await model.findById(doc._id).lean();
      if (existing) {
        // Stable IDs are insert-only. Check ownership of existing rows, not their
        // mutable prices or read state, so normal app testing is not overwritten.
        const expected = doc as Record<string, unknown>;
        for (const field of ["seller", "village", "userId", "villageId"])
          if (
            expected[field] &&
            String((existing as Record<string, unknown>)[field]) !==
              String(expected[field])
          )
            throw new Error(`Existing ${field} collision; no records written.`);
        if (
          model === User &&
          (existing as { name?: string }).name !== expected.name
        )
          throw new Error(
            "Existing test account collision; no records written.",
          );
      }
    }
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      database: dbName,
      marketplaceVillage: village.nameEn,
      ownerVillage: ownerVillage.nameEn,
      marketplaceListings: listingRows.length,
      ownerListings: ownerRows.length,
      services: 3,
      transport: 2,
      inquiries: notices.length,
      sellerTestLogin: "9000000222",
    }),
  );
  if (apply) {
    await User.db.transaction(async (session) => {
      for (const { model, docs } of batches)
        for (const doc of docs) {
          const { _id, ...fields } = doc;
          await model.updateOne(
            { _id },
            { $setOnInsert: fields },
            { upsert: true, runValidators: true, timestamps: false, session },
          );
        }
    });
    console.log(
      "Inserted or retained test records without changing existing records.",
    );
  }
} finally {
  await mongoose.disconnect();
}
