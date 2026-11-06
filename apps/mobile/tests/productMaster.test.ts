import { test } from "node:test";
import assert from "node:assert/strict";
import type { MasterProduct, OwnedListing } from "@gaavli/types";
import {
  catalogSearchResponseSchema,
  productMasterImportSchema,
  productMasterPageSchema,
} from "@gaavli/validation";
import {
  loadMasterProducts,
  matchesProductSearch,
  searchMasterProducts,
} from "../src/data/productMaster";
import {
  emptyListingDraft,
  formFromListing,
  selectMasterProduct,
  prepareListing,
  prepareListingEdit,
  newListingOperation,
  listingDraftSchema,
} from "../src/data/listingForm";

const rice: MasterProduct = {
  productId: "a".repeat(24),
  code: "RICE",
  nameMr: "तांदूळ",
  nameEn: "Rice",
  nameHi: "चावल",
  productGroup: "grains",
  defaultUnit: "kg",
  status: "ACTIVE",
  sortOrder: 1,
};
const now = Date.now();
const legacy: OwnedListing = {
  id: "b".repeat(24),
  productName: "Saved English name",
  productNameMr: "जुने उत्पादन",
  productNameHi: null,
  description: null,
  categoryId: "c".repeat(24),
  category: "PERISHABLE",
  productGroup: "vegetables",
  quantity: 10,
  unit: "kg",
  price: 20,
  photoObjectKey: null,
  photoUrl: null,
  minimumPurchaseQuantity: null,
  fulfillmentOptions: ["farm_pickup"],
  tags: [],
  villageId: "d".repeat(24),
  village: null,
  status: "active",
  version: 4,
  expiresAt: new Date(now + 86400000).toISOString(),
  createdAt: new Date(now).toISOString(),
  updatedAt: new Date(now).toISOString(),
};

test("master selection fills both names, source group/unit and ID without changing shelf-life category", () => {
  const original = formFromListing(legacy, "mr", now);
  const selected = selectMasterProduct(original, rice, "mr");
  assert.equal(selected.name, "तांदूळ");
  assert.equal(selected.productId, rice.productId);
  assert.equal(selected.group, "grains");
  assert.equal(selected.categoryId, legacy.categoryId);
  assert.equal(selected.unit, "kg");
  const body = prepareListing(
    selected,
    legacy.villageId,
    "en",
    "PERISHABLE",
    now,
  );
  assert.equal(body.productName, "Rice");
  assert.equal(body.productNameMr, "तांदूळ");
  assert.equal(body.productId, rice.productId);
  const patch = prepareListingEdit(
    selected,
    legacy,
    original,
    "mr",
    "PERISHABLE",
    now,
  );
  assert.equal(patch.productId, rice.productId);
  assert.equal(patch.productName, "Rice");
  assert.equal(patch.productNameMr, "तांदूळ");
  assert.equal(patch.productGroup, "grains");
  assert.equal(patch.categoryId, undefined);
});
test("legacy edits and pending request snapshots remain unchanged; linked drafts restore selection", () => {
  const form = formFromListing(legacy, "mr", now);
  assert.equal(form.productId, null);
  assert.deepEqual(
    prepareListingEdit(
      { ...form, price: "30" },
      legacy,
      form,
      "mr",
      "PERISHABLE",
      now,
    ),
    { version: 4, price: 30 },
  );
  const body = prepareListing(form, legacy.villageId, "mr", "PERISHABLE", now);
  const pending = newListingOperation(body);
  assert.equal("productId" in pending.body, false);
  const restored = listingDraftSchema.parse(
    JSON.parse(JSON.stringify({ ...emptyListingDraft, form, pending })),
  );
  assert.deepEqual(restored.pending, pending);
  const selected = selectMasterProduct(form, rice, "en");
  const linkedDraft = listingDraftSchema.parse(
    JSON.parse(JSON.stringify({ ...emptyListingDraft, form: selected })),
  );
  assert.equal(linkedDraft.form.productId, rice.productId);
  assert.equal(linkedDraft.form.productNameMr, rice.nameMr);
  const linkedForm = formFromListing(
    {
      ...legacy,
      productId: rice.productId,
      productName: rice.nameEn,
      productNameMr: rice.nameMr,
      productGroup: rice.productGroup,
    },
    "mr",
    now,
  );
  assert.equal(linkedForm.name, rice.nameMr);
  assert.equal(linkedForm.productId, rice.productId);
  assert.deepEqual(
    prepareListingEdit(
      { ...linkedForm, price: "30" },
      {
        ...legacy,
        productId: rice.productId,
        productName: rice.nameEn,
        productNameMr: rice.nameMr,
        productGroup: rice.productGroup,
      },
      linkedForm,
      "mr",
      "PERISHABLE",
      now,
    ),
    { version: 4, price: 30 },
  );
});
test("product search matches Marathi and case-insensitive English literally", () => {
  const names = `${rice.nameMr} ${rice.nameEn}`;
  assert.equal(matchesProductSearch(names, "rIc"), true);
  assert.equal(matchesProductSearch(names, "तांदूळ"), true);
  assert.equal(matchesProductSearch(names, "["), false);
  assert.equal(matchesProductSearch(names, "rice तांदूळ"), true);
});
test("reference cache supports offline selection, validates records and does not block fresh reads on cache-write failure", async () => {
  let saved: string | null = null;
  let fetches = 0;
  const storage = {
    read: async () => saved,
    write: async (value: string) => {
      saved = value;
    },
  };
  const fetch = async () => {
    fetches++;
    return { products: [rice] };
  };
  const fresh = await loadMasterProducts({ storage, fetch, offline: false });
  assert.equal(fresh.cached, false);
  const offline = await loadMasterProducts({ storage, fetch, offline: true });
  assert.equal(offline.cached, true);
  assert.equal(fetches, 1);
  const fallback = await loadMasterProducts({
    storage,
    fetch: async () => {
      throw new Error("network");
    },
    offline: false,
  });
  assert.equal(fallback.products[0].productId, rice.productId);
  const withoutDisk = await loadMasterProducts({
    storage: {
      ...storage,
      write: async () => {
        throw new Error("disk");
      },
    },
    fetch,
    offline: false,
  });
  assert.equal(withoutDisk.cached, false);
  saved = null;
  await assert.rejects(loadMasterProducts({ storage, fetch, offline: true }));
  saved = JSON.stringify({ products: [{ ...rice, status: "INACTIVE" }] });
  await assert.rejects(loadMasterProducts({ storage, fetch, offline: true }));
  assert.equal(
    productMasterPageSchema.safeParse({
      products: [{ ...rice, category: "PERISHABLE" }],
    }).success,
    false,
  );
  const { productId: _id, ...row } = rice;
  assert.equal(productMasterImportSchema.safeParse([row, row]).success, false);
});

test("offline search tolerates typos and any word order", () => {
  const names = "Mango Pickle आम का अचार";
  for (const search of [
    "mango pickle",
    "pickle mango",
    "pickel",
    "mnago pickle",
    "अचार आम",
    "अचारा",
  ])
    assert.equal(matchesProductSearch(names, search), true, search);
  for (const search of ["potato", "pickle potato", "ab", "टमाटर"])
    assert.equal(matchesProductSearch(names, search), false, search);
});

test("online search carries a corrected spelling and tolerates older servers", async () => {
  const stored: string[] = [];
  const storage = {
    read: async () => null,
    write: async (value: string) => void stored.push(value),
  };
  const withHint = await searchMasterProducts({
    storage,
    offline: false,
    search: "tomoto",
    fetch: async () => ({ products: [rice], didYouMean: "tomato" }),
  });
  assert.equal(withHint.didYouMean, "tomato");
  assert.equal(withHint.cached, false);
  const older = await searchMasterProducts({
    storage,
    offline: false,
    search: "rice",
    fetch: async () => ({ products: [rice] }),
  });
  assert.equal(older.didYouMean, null);
  assert.equal(older.products.length, 1);
});

test("the catalog search response with a corrected spelling is accepted", () => {
  const product = {
    productId: "6a1111111111111111111111",
    code: "ONION_SEEDS",
    nameMr: "कांदा बियाणे",
    nameEn: "Onion Seeds",
    nameHi: "प्याज बीज",
    productGroup: "farm_inputs",
    defaultUnit: "kg",
    status: "ACTIVE",
    sortOrder: 1,
  };
  for (const didYouMean of [null, "kanda biyane", undefined]) {
    const response = catalogSearchResponseSchema.parse({
      products: [product],
      ...(didYouMean === undefined ? {} : { didYouMean }),
    });
    assert.equal(response.products.length, 1);
  }
  assert.throws(() =>
    catalogSearchResponseSchema.parse({ products: [], extra: 1 }),
  );
});
