import nextEnv from "@next/env";
import mongoose from "mongoose";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { productMasterImportSchema } from "@gaavli/validation";
import { connectDb } from "../src/server/db/connect";
import {
  Category,
  Listing,
  User,
  Village,
  VillageCoordinator,
  Notification,
} from "../src/server/models";
import { Service } from "../src/server/models/service";
import { ProductMaster } from "../src/server/models/product-master";

nextEnv.loadEnvConfig(process.cwd());
const apply = process.argv.includes("--apply");
const databaseUrl = new URL(process.env.MONGODB_URI || "");
const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
if (
  process.env.NODE_ENV === "production" ||
  !/^gaavli_demo_[a-z0-9_]+$/.test(databaseName)
)
  throw new Error(
    "Demo seed requires a non-production gaavli_demo_* database.",
  );
if (process.env.OTP_PROVIDER !== "test")
  throw new Error(
    "Demo accounts require OTP_PROVIDER=test; real SMS is not supported.",
  );
const id = (key: string) =>
  new mongoose.Types.ObjectId(
    createHash("sha256")
      .update(`gaavli-demo-v1:${databaseName}:${key}`)
      .digest("hex")
      .slice(0, 24),
  );
const productCodes = [
  "TOMATO",
  "ONION",
  "POTATO",
  "CAULIFLOWER",
  "SPINACH",
  "CORIANDER_LEAVES",
  "MANGO",
  "BANANA",
  "LEMON",
  "RICE",
  "WHEAT",
  "JAGGERY",
  "BRINJAL",
  "OKRA",
  "CUCUMBER",
  "CLUSTER_BEANS",
  "GUAVA",
  "PAPAYA",
  "POMEGRANATE",
  "COW_MILK",
  "CURD",
  "GHEE",
  "TOOR_DAL",
  "MOONG_DAL",
  "MANGO_PICKLE",
  "LEMON_PICKLE",
  "UDID_PAPAD",
  "RAGI_LADOO",
];
const catalog = productMasterImportSchema
  .parse(
    JSON.parse(
      await readFile(
        new URL("../data/catalog/product-master.v2.json", import.meta.url),
        "utf8",
      ),
    ),
  )
  .filter((p) => productCodes.includes(p.code) && p.status === "ACTIVE");
if (catalog.length !== productCodes.length)
  throw new Error("Demo master products are missing or inactive.");
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
const serviceItems = [
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
    Village.init(),
    Category.init(),
    ProductMaster.init(),
    Listing.init(),
    Service.init(),
    VillageCoordinator.init(),
    Notification.init(),
  ]);
  const now = new Date();
  const villageId = id("village"),
    buyerId = id("buyer"),
    sellerId = id("seller"),
    coordinatorId = id("coordinator"),
    growerId = id("grower"),
    makerId = id("maker");
  const categories = [
    {
      _id: id("category-perishable"),
      code: "PERISHABLE",
      name: "Perishable",
      nameMr: "नाशवंत",
      defaultShelfLife: "1–2 days",
      notifyMode: "daily_digest",
    },
    {
      _id: id("category-standing"),
      code: "RECURRING_SUPPLY",
      name: "Recurring supply",
      nameMr: "नियमित पुरवठा",
      defaultShelfLife: "Standing",
      notifyMode: "change_only",
    },
  ];
  const users = [
    {
      _id: buyerId,
      name: "Asha Patil",
      firstName: "Asha",
      lastName: "Patil",
      mobile: "9000000111",
      roles: ["buyer"],
    },
    {
      _id: sellerId,
      name: "Meera Jadhav",
      firstName: "Meera",
      lastName: "Jadhav",
      mobile: "9000000222",
      roles: ["buyer", "seller"],
    },
    {
      _id: coordinatorId,
      name: "Sanjay Pawar",
      firstName: "Sanjay",
      lastName: "Pawar",
      mobile: "9000000333",
      roles: ["buyer", "coordinator"],
    },
    {
      _id: growerId,
      name: "Anand Shinde",
      firstName: "Anand",
      lastName: "Shinde",
      roles: ["buyer", "seller"],
    },
    {
      _id: makerId,
      name: "Vasudha More",
      firstName: "Vasudha",
      lastName: "More",
      roles: ["buyer", "seller"],
    },
  ].map((u) => ({
    ...u,
    village: villageId,
    status: "active",
    preferredLanguage: "mr",
  }));
  const village = {
    _id: villageId,
    nameEn: "Kalamb",
    nameMr: "कळंब",
    taluka: "Karjat",
    district: "Raigad",
    isActive: true,
  };
  const masterRows = catalog.map((p) => ({
    ...p,
    _id: id(`master-${p.code}`),
  }));
  const listingRows = products.map(([code, price, quantity, photo], i) => {
    const product = masterRows.find((p) => p.code === code)!;
    const sold = quantity === 0;
    return {
      _id: id(`listing-${code}`),
      productId: product._id,
      productName: product.nameEn,
      productNameMr: product.nameMr,
      productGroup: product.productGroup,
      category: "PERISHABLE",
      categoryId: id("category-perishable"),
      description: "Available for local pickup. Please contact for details.",
      price,
      quantity,
      unit: product.defaultUnit,
      seller: i < 6 ? sellerId : i % 2 ? growerId : makerId,
      village: villageId,
      status: sold ? "sold_out" : "active",
      expiresAt: new Date(now.getTime() + 365 * 86400000),
      fulfillmentOptions: ["farm_pickup"],
      photoObjectKey: photo || undefined,
      isDemo: false,
      version: 1,
    };
  });
  const services = serviceItems.map(
    ([module, profession, professionMr, serviceCategory, price, unit], i) => ({
      _id: id(`service-${i}`),
      userId: sellerId,
      villageId,
      module,
      profession,
      professionMr,
      serviceCategory,
      price,
      unit,
      status: "ACTIVE",
      available: true,
      description: "Available locally. Please contact for availability.",
    }),
  );
  const assignment = {
    _id: id("assignment"),
    villageId,
    userId: coordinatorId,
    publicContactPhone: null,
  };
  const notifications = [
    {
      _id: id("notification"),
      userId: sellerId,
      type: "BUYER_TRIED_CONTACT",
      title: "A buyer tried to reach you",
      titleMr: "एका खरेदीदाराने संपर्क करण्याचा प्रयत्न केला",
      body: "Asha Patil is interested in your tomatoes.",
      bodyMr: "आशा पाटील यांना तुमच्या टोमॅटोमध्ये रस आहे.",
      data: {
        listingId: listingRows[0]._id,
        buyerId,
        productName: "Tomato",
        productNameMr: "टोमॅटो",
        buyerName: "Asha Patil",
        sellerName: "Meera Jadhav",
        quantity: 2,
        callbackConsent: false,
      },
      readAt: null,
    },
  ];
  const batches = [
    { model: Village, docs: [village] },
    { model: Category, docs: categories },
    { model: User, docs: users },
    { model: ProductMaster, docs: masterRows },
    { model: Listing, docs: listingRows },
    { model: Service, docs: services },
    { model: VillageCoordinator, docs: [assignment] },
    { model: Notification, docs: notifications },
  ];
  for (const { model, docs } of batches)
    for (const doc of docs) await new model(doc).validate();
  const foreignCounts = await Promise.all(
    batches.map(({ model, docs }) =>
      model.countDocuments({ _id: { $nin: docs.map((doc) => doc._id) } }),
    ),
  );
  if (foreignCounts.some(Boolean))
    throw new Error("Database has non-demo data; refusing to seed.");
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      database: databaseName,
      village: village.nameEn,
      counts: {
        users: users.length,
        masterProducts: masterRows.length,
        listings: listingRows.length,
        services: 3,
        transport: 2,
        notifications: 1,
      },
      demoAccounts: users.map(({ mobile, roles }) => ({ mobile, roles })),
    }),
  );
  if (apply) {
    for (const { model, docs } of batches) {
      for (const doc of docs) {
        const { _id, ...fields } = doc;
        await model.updateOne(
          { _id },
          { $setOnInsert: fields },
          { upsert: true, runValidators: true, setDefaultsOnInsert: true },
        );
      }
    }
    console.log(
      "Demo data is ready. Existing demo records were not overwritten.",
    );
  }
} finally {
  await mongoose.disconnect();
}
