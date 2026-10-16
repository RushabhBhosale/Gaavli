import assert from "node:assert/strict";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import {
  mobileListingPageSchema,
  mobileListingsQuerySchema,
} from "@gaavli/validation";
nextEnv.loadEnvConfig(process.cwd());
if (process.env.NODE_ENV === "production")
  throw new Error("Development demo verification only.");
Object.assign(process.env, { NODE_ENV: "development" });
const { connectDb } = await import("../src/server/db/connect");
const { User, Village } = await import("../src/server/models");
const { listMobileListings } = await import("../src/server/services/listings");
try {
  await connectDb();
  const village = await Village.findOne({
    _id: "6acdcb80d312658421fd1da5",
    isActive: true,
  }).lean();
  assert.ok(village);
  const user = await User.findOne({
    name: "Narayangaon demo seller (sample data)",
    village: village._id,
  }).lean();
  assert.ok(user);
  const page = mobileListingPageSchema.parse(
    await listMobileListings(
      user,
      mobileListingsQuerySchema.parse({ limit: 50 }),
    ),
  );
  const demo = page.listings.filter((listing) => listing.isDemo);
  assert.equal(demo.length, 5);
  for (const [productGroup, count] of [
    ["vegetables", 3],
    ["fruits", 1],
    ["grain", 1],
    ["dairy", 0],
  ] as const) {
    const filtered = await listMobileListings(
      user,
      mobileListingsQuerySchema.parse({ productGroup }),
    );
    assert.equal(filtered.total, count);
  }
  for (const listing of demo) {
    assert.ok(listing.productNameMr);
    assert.ok(listing.price !== null && listing.quantity! > 0);
    assert.equal(listing.village.id, String(village._id));
    assert.ok(
      listing.photoUrl?.startsWith(
        "/listing-photos/listings/narayangaon-demo-v1/",
      ),
    );
    assert.equal("photoObjectKey" in listing, false);
    assert.equal("seller" in listing, false);
  }
  console.log(
    JSON.stringify({
      result: "PASS",
      village: village.nameEn,
      totalDemoListings: demo.length,
      listings: demo.map(
        ({ productName, productNameMr, photoUrl, quantity, unit, price }) => ({
          productName,
          productNameMr,
          photoUrl,
          quantity,
          unit,
          price,
        }),
      ),
    }),
  );
} finally {
  await mongoose.disconnect();
}
