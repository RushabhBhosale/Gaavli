import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createListingSchema,
  updateListingSchema,
  relistListingSchema,
  listingOperationKeySchema,
} from "@gaavli/validation";
import { similarProductName } from "../src/server/services/listing-policy";
const input = {
  productName: "Tomato",
  productNameMr: "टोमॅटो",
  categoryId: "123456789012345678901234",
  villageId: "123456789012345678901235",
  productGroup: "vegetables",
  quantity: 10,
  unit: "kg",
  price: null,
  expiresAt: "2026-12-01T00:00:00.000Z",
};
test("listing inputs bound data and reject privilege injection, unsafe photos and empty updates", () => {
  assert.equal(createListingSchema.safeParse(input).success, true);
  assert.equal(
    createListingSchema.safeParse({
      ...input,
      productName: "Flowers",
      productGroup: null,
    }).success,
    true,
  );
  for (const invalid of [
    { ...input, seller: input.villageId },
    { ...input, isDemo: true },
    { ...input, status: "active" },
    { ...input, quantity: 0 },
    { ...input, price: -1 },
    { ...input, minimumPurchaseQuantity: 11 },
    { ...input, fulfillmentOptions: ["farm_pickup", "farm_pickup"] },
    { ...input, photoObjectKey: "listings/../secret.webp" },
    { ...input, productName: "Unsafe\u0000name" },
  ])
    assert.equal(createListingSchema.safeParse(invalid).success, false);
  assert.equal(updateListingSchema.safeParse({ version: 1 }).success, false);
  assert.equal(
    updateListingSchema.safeParse({ version: 0, quantity: 12 }).success,
    false,
  );
  assert.equal(
    updateListingSchema.safeParse({ version: 1, price: null }).success,
    true,
  );
  assert.equal(
    updateListingSchema.safeParse({ version: 1, villageId: input.villageId })
      .success,
    false,
  );
  assert.equal(
    relistListingSchema.safeParse({ version: 2, quantity: 20, expiresAt: null })
      .success,
    true,
  );
  assert.equal(
    listingOperationKeySchema.safeParse("operation-123").success,
    true,
  );
  assert.equal(listingOperationKeySchema.safeParse("short").success, false);
});
test("duplicate detection normalizes names and catches close spellings without conflating unrelated produce", () => {
  for (const [a, b] of [
    ["Tomato", " tomato "],
    ["Tomato", "Tomatoe"],
    ["Tomato", "tooommmtooo"],
    ["टोमॅटो", "टोमॅटो"],
  ])
    assert.equal(similarProductName(a, b), true);
  for (const [a, b] of [
    ["Rice", "Milk"],
    ["Onion", "Mango"],
    ["", ""],
    ["टोमॅटो", "कांदा"],
    ["Pea", "Tea"],
  ])
    assert.equal(similarProductName(a, b), false);
});
