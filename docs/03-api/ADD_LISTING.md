# Mobile Add Listing — 2026-10-15

Photo UI revision: Add/Edit now offers only phone photo selection/replacement,
beside a square contained preview. Photo and button columns share the row equally.
Stock-photo and No photo controls and
routine draft-saved messages are removed. Existing photos/drafts are preserved;
photo selection remains optional and draft failures still show retry feedback.

Owner-edit revision: My Listings now reuses this form with prefilled owner data,
separate saved edit drafts and versioned partial updates. See
`MOBILE_OWN_LISTINGS.md` for editing, confirmation-based deletion and retry behavior.

Phone-upload revision: local gallery selection, durable private draft copies,
authenticated image upload and development file serving are now implemented.
See `PHONE_PHOTO_UPLOADS.md`; earlier asset-only/upload-pending text below describes
the initial milestone. Production object storage remains separate work.

The mobile `/add-listing` route now publishes through the existing bearer-authenticated
`POST /api/v1/listings`. No new MongoDB model fields or create endpoint were needed.
See `LISTING_CRUD.md` for server authorization, limits, duplicates, versions and replay.

## Fields and buyer display

Publication feedback: confirmed completion shows a success toast that persists
across navigation to My Listings. Validation/upload/publication failures show
an error toast and inline details. Partial failure after server creation is
labelled explicitly; retry preserves the existing idempotency snapshot.

Layout revision: group, category and unit use dropdowns; available quantity and
unit appear on the same row. These controls use the same draft and validation
contract as before. Categories still come from the active-category API.

| Form field | Persisted field / behavior |
| --- | --- |
| Product name (required) | `productName`; Marathi entry also populates `productNameMr`. No automatic translation or bilingual subtitle. |
| Product group | `productGroup`: vegetables/fruits/grain/dairy; Other saves null and appears under All. |
| Shelf-life category (required) | Actual active `categoryId` from GET `/categories`; server mirrors its category code. |
| Available quantity (required) | Positive `quantity`, shown on Marketplace/detail. |
| Unit (required) | kg/litre/dozen/bunch/pieces; translated when displaying rate, availability and minimum purchase. |
| Rate per unit (required in this form) | Nonnegative `price`, shown on buyer cards/detail. The general API still permits an omitted rate. |
| Minimum purchase (optional) | `minimumPurchaseQuantity`, same unit, cannot exceed availability. |
| Availability days | Whole 1–365 days, converted to exact future `expiresAt` once when staging. RECURRING_SUPPLY uses explicit null standing expiry. |
| Pickup / local transport | Seller-declared `fulfillmentOptions`, informational only. |
| Product photo (optional) | Selected allowlisted `photoObjectKey`; no photo saves null. |
| Village | Current account's confirmed village, displayed read-only; server enforces village/category availability and owner identity. |

Seller identity/capability comes from the authenticated account. The form never asks
for or overrides seller ID, phone, status, posted timestamps or calculated distance.
Protected seller contact access and notifications remain separate unfinished work.

## Temporary local asset photos

- Selectable stock collection: tomato, onion, potato, rice, mango. These reuse the
  existing mobile `assets/products` images and are labelled as representative photos
  in the form. This is an asset selector, not a device gallery/camera upload.
- Server copies are together in `apps/web/public/listing-photos/listings/assets/`.
  Shared allowlist: `LISTING_ASSET_PHOTOS` in `packages/constants/src/index.ts`.
- Exact immutable keys `listings/assets/<allowlisted-name>.webp` are permitted in
  create/PATCH in addition to existing owner-scoped keys. Unknown stock keys and
  another user's keys are rejected. The folder is not an arbitrary filesystem API.
- These packaged assets resolve to same-origin `/listing-photos/<key>` in all
  environments, independent of an optional remote image provider base URL. Buyer
  and owner DTOs already resolve the stored key. No base64/file bytes go into MongoDB.
- No new third-party dependency, photo permission, external storage or upload API
  was introduced. Device uploads/R2/S3 integration remain later work.

## Drafts and safe retry

- SQLite's existing settings table stores one namespaced JSON draft per user/village
  under `listing-draft:<user-id>:<village-id>`. No token or phone number is stored.
  Changing accounts/villages remounts and loads that account's distinct draft.
- Edits and reads persist in shared order across screen instances, so reopening
  cannot race ahead of an older screen's queued edits. A load failure blocks editing to avoid overwriting an
  unread draft; a save failure is visible and retryable. Explicit back saves before
  navigation. Abrupt termination before a pending SQLite write finishes can still
  lose the last in-flight edit; device persistence acceptance remains to be checked.
- Publishing validates the form, then durably stages the exact normalized body and
  stable operation key before the network call. The key is an identifier, not a secret.
- Network/timeout/server failures retain a locked pending snapshot. Manual retry,
  including after restart, reuses the same key/body/expiry. Definite create rejection
  unlocks editing; a profile/storage failure after confirmed creation retains replay
  identity. A retry after server commit cannot create another listing.
- Offline input can be saved as a draft. Publish requires connectivity; there is
  no automatic background delivery queue or optimistic buyer-visible stock.
- After create and safe profile persistence succeed, the draft is removed, listing
  queries are invalidated, and navigation returns to My Listings. Buyer feeds refresh
  through their existing database queries. A first publication still grants seller.

## Verification

Mobile form tests cover required/invalid values, Marathi digits, rate/minimum/expiry,
standing supply, optional photo, and exact persisted request restoration. The isolated
MongoDB CRUD test now runs a mobile-prepared draft through create/replay and buyer
detail, checking photo, quantity, rate, minimum, village and safe response schema.
Native keyboard/layout, SQLite restart and network-interruption acceptance on the
phone are pending; automated checks do not claim those device scenarios were run.
