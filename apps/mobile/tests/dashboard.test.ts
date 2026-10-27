import { test } from "node:test";
import { requestTabs, availableRequestTab } from "../src/data/requestTabs";
import { orderedDraftStorage } from "../src/storage/orderedDrafts";
import {
  sendSellerNotification,
  prepareSellerRequest,
  parseSavedSellerNotification,
  sellerNotificationStorageKey,
} from "../src/data/notifySeller";
import {
  emptyListingDraft,
  prepareListing,
  newListingOperation,
  listingDraftSchema,
  ListingFormError,
  formFromListing,
  prepareListingEdit,
} from "../src/data/listingForm";
import assert from "node:assert/strict";
import type { MobileUser, MobileListing, OwnedListing } from "@gaavli/types";
import {
  savedProductDrafts,
  pendingListingDeleteSchema,
} from "../src/data/ownedListings";
import { toHomeListing, liveDashboard } from "../src/data/listings";
import { accountHeaderIdentity } from "../src/data/accountHeader";
import { hasCoordinatorRole } from "../src/data/accountAccess";
import { resolveListingPhotoUrl } from "../src/data/listingPhotos";
import {
  listingRate,
  listingQuantity,
  listingUnit,
} from "../src/components/dashboard/listingText";
import {
  mobileListingSchema,
  mobileListingsQuerySchema,
  sellerContactSchema,
} from "@gaavli/validation";
import { dashboardForAccount, findMockListing } from "../src/data/mockHomeData";
import { formatMessage, messages } from "../src/i18n";

test("My Requests exposes buyer and seller tabs and guards a stale received selection", () => {
  assert.deepEqual(requestTabs(false), ["sent", "notifications"]);
  assert.deepEqual(requestTabs(true), ["sent", "received", "notifications"]);
  assert.equal(availableRequestTab(false, "received"), "sent");
  assert.equal(availableRequestTab(true, "sent"), "sent");
  assert.equal(availableRequestTab(false, "notifications"), "notifications");
  for (const language of ["mr", "en"] as const) {
    const t = messages(language);
    assert.ok(t.sentRequests && t.receivedRequests && t.requestNotifications);
  }
});

const account: MobileUser = {
  id: "real-user",
  name: "Riya More",
  firstName: "Riya",
  lastName: "More",
  language: "mr",
  village: {
    id: "real-village",
    name: "Nere",
    nameMr: "नेरे",
    taluka: "Panvel",
    district: "Raigad",
    pinCode: "410206",
  },
};

test("shared header preserves identity and prioritizes active coordinator, seller, then buyer", () => {
  const buyer = accountHeaderIdentity(account, "en");
  assert.equal(buyer.name, "Riya More");
  assert.equal(buyer.initials, "RM");
  assert.equal(buyer.role, "buyer");
  assert.equal(buyer.location, "Nere, Panvel, Raigad");
  assert.equal(
    accountHeaderIdentity(account, "mr").location,
    "नेरे, Panvel, Raigad",
  );
  assert.equal(
    accountHeaderIdentity({ ...account, isSeller: true }, "en").role,
    "seller",
  );
  assert.equal(
    accountHeaderIdentity(
      { ...account, isSeller: true, coordinatorVillages: [account.village!] },
      "en",
    ).role,
    "coordinator",
  );
  assert.equal(
    accountHeaderIdentity(
      { ...account, isSeller: true, coordinatorVillages: [] },
      "en",
    ).role,
    "seller",
  );
  const legacy = accountHeaderIdentity(
    {
      ...account,
      name: "Saved Display Name",
      firstName: null,
      lastName: null,
      village: null,
    },
    "mr",
  );
  assert.equal(legacy.name, "Saved Display Name");
  assert.equal(legacy.initials, "SN");
  assert.equal(legacy.location, "");
});
test("admin-granted coordinator role is visible before village assignment and explicit revocation wins over cached villages", () => {
  const pending = { ...account, isCoordinator: true, coordinatorVillages: [] };
  assert.equal(hasCoordinatorRole(pending), true);
  assert.equal(accountHeaderIdentity(pending, "en").role, "coordinator");
  const revoked = {
    ...account,
    isCoordinator: false,
    coordinatorVillages: [account.village!],
  };
  assert.equal(hasCoordinatorRole(revoked), false);
  assert.equal(accountHeaderIdentity(revoked, "en").role, "buyer");
  assert.equal(hasCoordinatorRole(null), false);
  assert.equal(hasCoordinatorRole(account), false);
  assert.equal(
    hasCoordinatorRole({ ...account, coordinatorVillages: [account.village!] }),
    true,
  );
});
const databaseListing: MobileListing = {
  id: "123456789012345678901234",
  productName: "Milk",
  productNameMr: null,
  description: "Fresh milk from the morning milking.",
  photoUrl: null,
  isDemo: false,
  category: "RECURRING_SUPPLY",
  categoryName: "Recurring supply",
  categoryNameMr: "नियमित पुरवठा",
  quantity: 7,
  unit: "litre",
  price: null,
  village: account.village!,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};
test("Notify seller retries survive restart without duplicate requests and never send before durable storage", async () => {
  const values = new Map<string, string>();
  let storageFailed = false;
  let cleanupFailed = false;
  const storage = {
    read: async (key: string) => values.get(key) || null,
    write: async (key: string, value: string) => {
      if (storageFailed) throw new Error("Storage failed");
      values.set(key, value);
    },
    remove: async (key: string) => {
      if (cleanupFailed) throw new Error("Cleanup failed");
      values.delete(key);
    },
  };
  const keys: string[] = [];
  let networkFailed = true;
  const listingId = "a".repeat(24);
  const result = {
    listingId,
    notificationId: "b".repeat(24),
    notified: true as const,
    channel: "in_app" as const,
    createdAt: "2026-10-15T00:00:00.000Z",
  };
  const send = async (key: string) => {
    keys.push(key);
    if (networkFailed) throw new Error("Response lost");
    return result;
  };
  const input = {
    accountId: "buyer",
    listingId,
    storage,
    isCurrent: () => true,
    send,
  };
  await assert.rejects(sendSellerNotification(input));
  assert.equal(values.size, 1);
  networkFailed = false;
  cleanupFailed = true;
  assert.deepEqual(await sendSellerNotification({ ...input }), result);
  assert.equal(
    values.size,
    1,
    "confirmed requests retain their replay key if cleanup fails",
  );
  cleanupFailed = false;
  assert.deepEqual(await sendSellerNotification({ ...input }), result);
  assert.equal(values.size, 0);
  assert.equal(
    new Set(keys).size,
    1,
    "reopened screens must reuse exactly the same saved key",
  );
  storageFailed = true;
  await assert.rejects(sendSellerNotification(input));
  assert.equal(keys.length, 3, "no send when the key could not be persisted");
  storageFailed = false;
  assert.equal(
    await sendSellerNotification({
      ...input,
      accountId: "another",
      isCurrent: () => false,
    }),
    null,
  );
  assert.equal(keys.length, 3, "an account change must prevent sending");
});

test("request quantity accepts Marathi decimals and enforces minimum/current availability", () => {
  assert.deepEqual(prepareSellerRequest("१०.५", 40, 5), {
    quantity: 10.5,
    callbackConsent: true,
  });
  for (const value of [
    "",
    "0",
    "-1",
    "४",
    "४१",
    "1e2",
    "Infinity",
    "NaN",
    "10kg",
  ])
    assert.throws(() => prepareSellerRequest(value, 40, 5));
  assert.throws(() => prepareSellerRequest("10", null, null));
});

test("seller request messages are optional, trimmed and bounded", () => {
  assert.deepEqual(prepareSellerRequest("2", 10, null, "  "), {
    quantity: 2,
    callbackConsent: true,
  });
  assert.equal(
    prepareSellerRequest("2", 10, null, "  उद्या येतो\nThank you  ").message,
    "उद्या येतो\nThank you",
  );
  assert.throws(
    () => prepareSellerRequest("2", 10, null, "a".repeat(501)),
    /REQUEST_MESSAGE_INVALID/,
  );
});

test("request retries preserve exact quantity/permission snapshots and keep legacy no-consent retries intact", async () => {
  const rows = new Map<string, string>();
  const storage = {
    read: async (key: string) => rows.get(key) || null,
    write: async (key: string, value: string) => {
      rows.set(key, value);
    },
    remove: async (key: string) => {
      rows.delete(key);
    },
  };
  const listingId = "a".repeat(24);
  const result = {
    listingId,
    notificationId: "b".repeat(24),
    notified: true as const,
    channel: "in_app" as const,
    createdAt: "2026-10-15T00:00:00.000Z",
  };
  const body = prepareSellerRequest("10", 40, 5, "Please keep it ready.");
  const sent: { key: string; body: unknown }[] = [];
  let lost = true;
  const send = async (key: string, staged: unknown) => {
    sent.push({ key, body: staged });
    if (lost) throw new Error("Response lost");
    return result;
  };
  const input = {
    accountId: "buyer",
    listingId,
    body,
    storage,
    send,
    isCurrent: () => true,
  };
  await assert.rejects(sendSellerNotification(input));
  const pending = parseSavedSellerNotification(
    rows.get(sellerNotificationStorageKey("buyer", listingId))!,
  );
  assert.deepEqual(pending.body, body);
  lost = false;
  await assert.rejects(
    sendSellerNotification({
      ...input,
      body: prepareSellerRequest("11", 40, 5),
    }),
    /REQUEST_PENDING_CHANGED/,
  );
  assert.equal(sent.length, 1);
  await assert.rejects(
    sendSellerNotification({
      ...input,
      body: prepareSellerRequest("10", 40, 5, "Changed message"),
    }),
    /REQUEST_PENDING_CHANGED/,
  );
  assert.deepEqual(await sendSellerNotification({ ...input }), result);
  assert.deepEqual(
    sent[0],
    sent[1],
    "restarted requests must send the same key, quantity and callback permission",
  );
  rows.set(
    sellerNotificationStorageKey("buyer", listingId),
    "legacy-notify-key-01",
  );
  assert.deepEqual(
    await sendSellerNotification({ ...input, body: {} }),
    result,
  );
  assert.deepEqual(
    sent[2],
    { key: "legacy-notify-key-01", body: {} },
    "old pending notices cannot gain consent or a fabricated quantity",
  );
});

test("revealed contact accepts only the protected DTO and a safe Indian dialer number", () => {
  const value = {
    listingId: "a".repeat(24),
    interested: true,
    seller: { name: "Riya More", mobile: "+919876543210" },
  };
  assert.ok(sellerContactSchema.safeParse(value).success);
  for (const mobile of [
    "tel:+919876543210",
    "+919876543210?call=other",
    "javascript:alert(1)",
    "+919876543210\n",
    "123",
  ]) {
    assert.equal(
      sellerContactSchema.safeParse({
        ...value,
        seller: { ...value.seller, mobile },
      }).success,
      false,
    );
  }
  assert.equal(
    sellerContactSchema.safeParse({ ...value, interested: false }).success,
    false,
  );
  assert.equal(
    sellerContactSchema.safeParse({
      ...value,
      seller: { ...value.seller, accessToken: "private" },
    }).success,
    false,
  );
});

test("database adapter preserves actual fields without sample prices, names, photos, contacts or distances", () => {
  const listing = toHomeListing(databaseListing);
  assert.equal(listing.nameMr, "Milk");
  assert.equal(listing.description, databaseListing.description);
  assert.equal(listing.price, null);
  assert.equal(listing.image, null);
  assert.equal(listing.sellerName, "");
  assert.equal(listing.sampleDistanceKm, undefined);
  assert.equal(listing.distanceKm, undefined);
  assert.equal(listingRate(listing, "en"), "Rate not provided");
  assert.equal(listingQuantity(listing, "en"), "7 litre available");
  assert.equal(listingRate({ ...listing, price: 55 }, "en"), "₹55 / litre");
  const home = liveDashboard(account, "mr", [databaseListing], 12, true);
  assert.equal(home.isPreview, false);
  assert.equal(home.coordinator, null);
  assert.equal(home.listingCount, 12);
  assert.equal(home.user.isSeller, true);
  assert.equal(home.user.village, "नेरे");
  assert.equal(home.listings[0].id, databaseListing.id);
  assert.deepEqual(liveDashboard(account, "en", [], 0, false).listings, []);
});
test("listing contracts reject malformed records and unbounded or injected queries", () => {
  assert.equal(mobileListingSchema.safeParse(databaseListing).success, true);
  for (const listing of [
    { ...databaseListing, price: -1 },
    { ...databaseListing, id: "1" },
    { ...databaseListing, mobile: "9876543210" },
  ])
    assert.equal(mobileListingSchema.safeParse(listing).success, false);
  for (const query of [
    { limit: 51 },
    { page: 0 },
    { search: { $ne: null } },
    { status: "pending" },
  ])
    assert.equal(mobileListingsQuerySchema.safeParse(query).success, false);
});
test("database photos and demo labels survive the adapter; photo resolution rejects unsafe paths", () => {
  const photoUrl = "/listing-photos/listings/narayangaon-demo-v1/tomato.webp";
  const listing = toHomeListing({ ...databaseListing, photoUrl, isDemo: true });
  assert.equal(listing.photoUrl, photoUrl);
  assert.equal(listing.isDemo, true);
  assert.equal(
    resolveListingPhotoUrl(photoUrl, "http://192.168.1.6:3000/api/v1", true),
    `http://192.168.1.6:3000${photoUrl}`,
  );
  assert.equal(
    resolveListingPhotoUrl(
      "https://cdn.example/photo.webp",
      "https://api.example/api/v1",
      false,
    ),
    "https://cdn.example/photo.webp",
  );
  for (const value of [
    "//other.example/photo.webp",
    "/private/config",
    "file:///tmp/picture",
    "data:image/png;base64,anything",
    "https://secret@cdn.example/photo.webp",
    "http://other.example/photo.webp",
  ])
    assert.equal(
      resolveListingPhotoUrl(value, "https://api.example/api/v1", false),
      null,
    );
  assert.equal(
    mobileListingSchema.safeParse({
      ...databaseListing,
      photoUrl: "javascript:alert(1)",
    }).success,
    false,
  );
});
test("preview adapter retains the signed-in identity and selected village in both languages", () => {
  const original = structuredClone(account);
  const mr = dashboardForAccount(account, "mr");
  assert.equal(mr.user.firstName, "Riya");
  assert.equal(mr.user.village, "नेरे");
  assert.equal(mr.user.isBuyer, true);
  assert.equal(mr.isPreview, true);
  assert.equal(dashboardForAccount(account, "en").user.village, "Nere");
  assert.deepEqual(account, original);
});
test("legacy display names and missing villages are not replaced with fixture identity", () => {
  const legacy = {
    ...account,
    name: "Existing display name",
    firstName: null,
    lastName: null,
    village: null,
  };
  const result = dashboardForAccount(legacy, "en");
  assert.equal(result.user.firstName, legacy.name);
  assert.equal(result.user.lastName, "");
  assert.equal(result.user.village, "");
  assert.equal(legacy.firstName, null);
});
test("unknown or ambiguous product route parameters cannot resolve a sample seller", () => {
  assert.equal(findMockListing("not-found"), undefined);
  assert.equal(findMockListing(["1", "2"]), undefined);
  assert.equal(findMockListing(undefined), undefined);
  assert.equal(findMockListing("1")?.name, "Tomato");
});
test("listing form validates buyer fields, Marathi numbers, minimums, expiry and stock photos", () => {
  const villageId = "a".repeat(24),
    categoryId = "b".repeat(24);
  const form = {
    ...emptyListingDraft.form,
    name: " टोमॅटो ",
    categoryId,
    photo: "tomato",
    quantity: "४०.५",
    price: "२५",
    minimum: "२",
  };
  const body = prepareListing(form, villageId, "mr", "PERISHABLE", 1000000);
  assert.equal(body.productName, "टोमॅटो");
  assert.equal(body.productNameMr, "टोमॅटो");
  assert.equal(body.quantity, 40.5);
  assert.equal(body.price, 25);
  assert.equal(body.minimumPurchaseQuantity, 2);
  assert.equal(body.photoObjectKey, "listings/assets/tomato.webp");
  assert.equal(body.expiresAt, new Date(1000000 + 2 * 86400000).toISOString());
  const homemade = prepareListing(
    { ...form, group: "homemade" },
    villageId,
    "mr",
    "PERISHABLE",
  );
  assert.equal(homemade.productGroup, "homemade");
  assert.equal(
    mobileListingsQuerySchema.parse({ productGroup: "homemade" }).productGroup,
    "homemade",
  );
  for (const invalid of [
    { name: "" },
    { quantity: "0" },
    { quantity: "1e2" },
    { price: "" },
    { price: "-1" },
    { minimum: "41" },
    { days: "0" },
    { days: "1.5" },
    { days: "366" },
    { photo: "../../other" },
    { categoryId: "invalid" },
  ])
    assert.throws(
      () =>
        prepareListing({ ...form, ...invalid }, villageId, "mr", "PERISHABLE"),
      ListingFormError,
    );
  const recurring = prepareListing(
    {
      ...form,
      name: "Milk",
      unit: "litre",
      group: "dairy",
      days: "",
      photo: "",
      minimum: "",
    },
    villageId,
    "en",
    "RECURRING_SUPPLY",
  );
  assert.equal(recurring.expiresAt, null);
  assert.equal(recurring.photoObjectKey, null);
  assert.equal(recurring.productNameMr, null);
  assert.equal(recurring.minimumPurchaseQuantity, null);
  assert.equal(listingUnit("litre", "mr"), "लिटर");
});

test("draft writes cannot be overtaken by a reopened screen or another account, and failures remain retryable", async () => {
  const rows = new Map<string, string>();
  let unblock!: () => void;
  const gate = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  const storage = orderedDraftStorage({
    read: async (key) => rows.get(key) ?? null,
    write: async (key, value) => {
      await gate;
      if (value === "fail") throw new Error("disk full");
      rows.set(key, value);
    },
    remove: async (key) => {
      rows.delete(key);
    },
  });
  const oldScreenWrite = storage.write("a:village", "first");
  const lastEdit = storage.write("a:village", "latest");
  const reopenedRead = storage.read("a:village");
  unblock();
  await Promise.all([oldScreenWrite, lastEdit]);
  assert.equal(await reopenedRead, "latest");
  assert.equal(await storage.read("b:village"), null);
  await assert.rejects(storage.write("a:village", "fail"));
  assert.equal(await storage.read("a:village"), "latest");
  await storage.write("a:village", "retry");
  assert.equal(await storage.read("a:village"), "retry");
  await storage.remove("a:village");
  assert.equal(await storage.read("a:village"), null);
});

test("phone photo drafts restore the private file reference and stable upload ID; only uploaded keys enter listing payloads", () => {
  const form = {
    ...emptyListingDraft.form,
    name: "Tomato",
    quantity: "20",
    price: "25",
    categoryId: "b".repeat(24),
    localPhoto: {
      fileName: "phone-photo.jpg",
      mimeType: "image/jpeg" as const,
      operationKey: "phone-upload-identity",
      uploadedKey: null as string | null,
    },
  };
  const restored = listingDraftSchema.parse(
    JSON.parse(JSON.stringify({ form, pending: null })),
  );
  assert.equal(restored.form.localPhoto?.fileName, "phone-photo.jpg");
  assert.equal(restored.form.localPhoto?.operationKey, "phone-upload-identity");
  assert.throws(
    () => prepareListing(restored.form, "a".repeat(24), "en", "PERISHABLE"),
    ListingFormError,
  );
  const uploadedKey = `listings/${"c".repeat(24)}/uploads/${"d".repeat(64)}.webp`;
  const body = prepareListing(
    { ...form, localPhoto: { ...form.localPhoto, uploadedKey } },
    "a".repeat(24),
    "en",
    "PERISHABLE",
  );
  assert.equal(body.photoObjectKey, uploadedKey);
  assert.equal(JSON.stringify(body).includes("phone-photo.jpg"), false);
  assert.equal(JSON.stringify(body).includes("phone-upload-identity"), false);
});

test("a restarted listing draft keeps the exact request identity, payload and expiry", () => {
  const form = {
    ...emptyListingDraft.form,
    name: "Rice",
    quantity: "20",
    price: "60",
    categoryId: "b".repeat(24),
  };
  const body = prepareListing(form, "a".repeat(24), "en", "PERISHABLE");
  const pending = newListingOperation(body);
  const restored = listingDraftSchema.parse(
    JSON.parse(JSON.stringify({ form, pending })),
  );
  assert.deepEqual(restored.pending, pending);
  assert.equal(restored.form.name, "Rice");
  assert.notEqual(newListingOperation(body).key, pending.key);
});

function ownedProduct(now: number): OwnedListing {
  return {
    id: "c".repeat(24),
    productName: "Tomato",
    description: "Organic tomatoes.\nPicked this morning.",
    productNameMr: "टोमॅटो",
    categoryId: "b".repeat(24),
    category: "PERISHABLE",
    productGroup: "vegetables",
    quantity: 40,
    unit: "crate",
    price: 25,
    photoObjectKey: `listings/${"a".repeat(24)}/uploads/${"d".repeat(64)}.webp`,
    photoUrl: null,
    minimumPurchaseQuantity: 2,
    fulfillmentOptions: ["local_transport", "farm_pickup"],
    villageId: "e".repeat(24),
    village: null,
    status: "active",
    version: 4,
    expiresAt: new Date(now + 2 * 86400000).toISOString(),
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
}
test("descriptions survive drafts, edits and legacy data without changing pending retry payloads", () => {
  const row = ownedProduct(Date.now());
  const initial = formFromListing(row, "en");
  assert.equal(initial.description, row.description);
  const next = { ...initial, description: "  Farm grown\nFreshly picked  " };
  const body = prepareListing(next, row.villageId, "en", "PERISHABLE");
  assert.equal(body.description, "Farm grown\nFreshly picked");
  const pending = newListingOperation(body);
  const draft = listingDraftSchema.parse(
    JSON.parse(JSON.stringify({ form: next, pending })),
  );
  assert.equal(draft.form.description, next.description);
  assert.deepEqual(draft.pending, pending);
  assert.deepEqual(prepareListingEdit(next, row, initial, "en", "PERISHABLE"), {
    version: row.version,
    description: "Farm grown\nFreshly picked",
  });
  assert.deepEqual(
    prepareListingEdit(
      { ...initial, description: "" },
      row,
      initial,
      "en",
      "PERISHABLE",
    ),
    { version: row.version, description: null },
  );
  const legacyForm = { ...initial } as Partial<typeof initial>;
  delete legacyForm.description;
  const legacyBody = { ...body };
  delete legacyBody.description;
  const legacyPending = { key: pending.key, body: legacyBody };
  const legacyDraft = listingDraftSchema.parse({
    form: legacyForm,
    pending: legacyPending,
  });
  assert.equal(legacyDraft.form.description, "");
  assert.deepEqual(legacyDraft.pending, legacyPending);
  const legacyListing = { ...databaseListing } as Partial<MobileListing>;
  delete legacyListing.description;
  assert.equal(mobileListingSchema.parse(legacyListing).description, null);
});

test("editing a rate preserves other-language name, existing image, unit and exact expiry; only changed fields are patched", () => {
  const now = Date.now();
  const row = ownedProduct(now);
  const initial = formFromListing(row, "mr", now);
  assert.equal(initial.name, "टोमॅटो");
  assert.equal(initial.unit, "crate");
  assert.deepEqual(
    prepareListingEdit(
      { ...initial, price: "30" },
      row,
      initial,
      "mr",
      "PERISHABLE",
      now + 86400000,
    ),
    { version: 4, price: 30 },
  );
  assert.deepEqual(
    prepareListingEdit(
      { ...initial, name: "ताजे टोमॅटो" },
      row,
      initial,
      "mr",
      "PERISHABLE",
      now,
    ),
    { version: 4, productNameMr: "ताजे टोमॅटो" },
  );
  assert.deepEqual(
    prepareListingEdit(
      { ...initial, days: "3" },
      row,
      initial,
      "mr",
      "PERISHABLE",
      now,
    ),
    { version: 4, expiresAt: new Date(now + 3 * 86400000).toISOString() },
  );
  assert.deepEqual(
    prepareListingEdit(
      { ...initial, existingPhotoKey: null },
      row,
      initial,
      "mr",
      "PERISHABLE",
      now,
    ),
    { version: 4, photoObjectKey: null },
  );
  assert.throws(
    () => prepareListingEdit(initial, row, initial, "mr", "PERISHABLE", now),
    (error: unknown) =>
      error instanceof ListingFormError && error.field === "unchanged",
  );
  assert.throws(() =>
    prepareListingEdit(
      { ...initial, minimum: "50" },
      row,
      initial,
      "mr",
      "PERISHABLE",
      now,
    ),
  );
});

test("saved create/edit drafts stay distinct and retain original version and exact pending patch across restart", () => {
  const row = ownedProduct(Date.now());
  const initial = formFromListing(row, "en");
  const edit = {
    ...emptyListingDraft,
    form: { ...initial, price: "30" },
    editBase: row,
    editInitialForm: initial,
    editLanguage: "en" as const,
    editPending: {
      key: "edit-product-operation",
      body: { version: row.version, price: 30 },
    },
  };
  const prefix = `${"a".repeat(24)}:${row.villageId}`;
  const create = {
    ...emptyListingDraft,
    form: { ...emptyListingDraft.form, name: "Rice" },
  };
  const rows = [
    { key: prefix, value: JSON.stringify(create) },
    { key: `${prefix}:edit:${row.id}`, value: JSON.stringify(edit) },
    { key: "another-account:village", value: "not readable here" },
  ];
  const restored = savedProductDrafts(rows, "a".repeat(24), row.villageId);
  assert.equal(restored.length, 2);
  assert.equal(restored[0].draft.editBase, null);
  assert.deepEqual(restored[1].draft.editPending, edit.editPending);
  assert.equal(restored[1].draft.editBase?.version, 4);
  assert.deepEqual(
    savedProductDrafts(
      [{ key: prefix, value: JSON.stringify(emptyListingDraft) }],
      "a".repeat(24),
      row.villageId,
    ),
    [],
  );
  assert.throws(() =>
    savedProductDrafts(
      [
        {
          key: `${prefix}:edit:${"f".repeat(24)}`,
          value: JSON.stringify(edit),
        },
      ],
      "a".repeat(24),
      row.villageId,
    ),
  );
  const operation = {
    id: row.id,
    version: row.version,
    key: "delete-product-operation",
  };
  assert.deepEqual(
    pendingListingDeleteSchema.parse(JSON.parse(JSON.stringify(operation))),
    operation,
  );
  assert.equal(
    pendingListingDeleteSchema.safeParse({ ...operation, version: 0 }).success,
    false,
  );
});

test("translated dashboard templates preserve literal user input during substitution", () => {
  assert.equal(
    formatMessage(messages("en").greeting, { name: "$& Riya" }),
    "Namaskar, $& Riya 👋",
  );
  assert.equal(
    formatMessage(messages("mr").availableInVillage, { village: "नेरे" }),
    "आज नेरे येथे काय उपलब्ध आहे ते पाहा",
  );
});

test("optional product photos can be omitted, preserved, replaced and explicitly removed", () => {
  const now = Date.now();
  const row = ownedProduct(now);
  const initial = formFromListing(row, "en", now);
  assert.deepEqual(
    prepareListingEdit(
      { ...initial, price: "35" },
      row,
      initial,
      "en",
      "PERISHABLE",
      now,
    ),
    { version: row.version, price: 35 },
  );
  const newKey = `listings/${"a".repeat(24)}/uploads/${"f".repeat(64)}.webp`;
  const replacement = {
    ...initial,
    existingPhotoKey: null,
    localPhoto: {
      fileName: "replacement.jpg",
      mimeType: "image/jpeg" as const,
      operationKey: "replacement-photo-operation",
      uploadedKey: newKey,
    },
  };
  assert.deepEqual(
    prepareListingEdit(replacement, row, initial, "en", "PERISHABLE", now),
    { version: row.version, photoObjectKey: newKey },
  );
  assert.deepEqual(
    prepareListingEdit(
      { ...initial, existingPhotoKey: null },
      row,
      initial,
      "en",
      "PERISHABLE",
      now,
    ),
    { version: row.version, photoObjectKey: null },
  );
  const withoutPhoto = prepareListing(
    { ...initial, existingPhotoKey: null },
    row.villageId,
    "en",
    "PERISHABLE",
    now,
  );
  assert.equal(withoutPhoto.photoObjectKey, null);
  assert.equal(
    toHomeListing({ ...databaseListing, photoUrl: null }).photoUrl,
    null,
  );
});
