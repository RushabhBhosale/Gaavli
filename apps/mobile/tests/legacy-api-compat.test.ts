import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activityRequestSchema,
  mobileListingSchema,
  ownedListingSchema,
  productMasterSchema,
} from "@gaavli/validation";

const id = "a".repeat(24);
const time = "2026-11-03T00:00:00.000Z";
const village = {
  id,
  name: "Kalamb",
  nameMr: "कळंब",
  taluka: "Ambegaon",
  district: "Pune",
  pinCode: null,
};

test("older API responses without Hindi product names remain usable", () => {
  const product = productMasterSchema.parse({
    productId: id,
    code: "TOMATO",
    nameEn: "Tomato",
    nameMr: "टोमॅटो",
    productGroup: "vegetables",
    defaultUnit: "kg",
    status: "ACTIVE",
    sortOrder: 1,
  });
  assert.equal(product.nameHi, null);
  const listing = mobileListingSchema.parse({
    id,
    productName: "Tomato",
    productNameMr: "टोमॅटो",
    category: "PERISHABLE",
    categoryName: "Perishable",
    categoryNameMr: "नाशवंत",
    quantity: 10,
    unit: "kg",
    price: 32,
    village,
    createdAt: time,
    updatedAt: time,
    expiresAt: null,
  });
  assert.equal(listing.productNameHi, null);
  const owned = ownedListingSchema.parse({
    id,
    productName: "Tomato",
    productNameMr: "टोमॅटो",
    categoryId: id,
    category: "PERISHABLE",
    productGroup: "vegetables",
    quantity: 10,
    unit: "kg",
    price: 32,
    photoObjectKey: null,
    minimumPurchaseQuantity: null,
    fulfillmentOptions: [],
    villageId: id,
    village,
    status: "active",
    version: 1,
    expiresAt: null,
    createdAt: time,
    updatedAt: time,
  });
  assert.equal(owned.productNameHi, null);
  const inquiry = activityRequestSchema.parse({
    id,
    status: "new",
    seenAt: null,
    respondedAt: null,
    listingId: id,
    product: { name: "Tomato", nameMr: "टोमॅटो", photoUrl: null, unit: "kg" },
    person: { name: "Asha", village: null },
    quantity: null,
    createdAt: time,
    canCall: false,
  });
  assert.equal(inquiry.product.nameHi, null);
  assert.equal(
    mobileListingSchema.safeParse({ ...listing, productNameHi: 123 }).success,
    false,
  );
});
