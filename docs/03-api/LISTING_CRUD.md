> Product photo revision - 2026-10-25 (user approved): new optional listing
> uploads use Atlas GridFS in all environments, through the existing Node API and
> Mongo connection. Keep legacy references and originals. Profile photo storage
> is unchanged. See docs/03-api/PRODUCT_PHOTO_STORAGE.md at repository root.

> Product Master revision - 2026-10-21: optional productId links the existing
> Listing to an active master. Server resolves canonical English/Marathi names
> and group within the existing transaction. Owner reads return ID/null, edit
> restores snapshots, and existing no-ID records remain valid. Inactive masters
> block new selections, while existing price/quantity edits remain available.
> Categories/lifecycle/idempotency remain unchanged. See `PRODUCT_MASTER.md`.

# Listing CRUD backend — 2026-10-14

Description revision — 2026-10-16: create and PATCH accept optional nullable
`description`: trimmed plain text up to 2,000 characters, allowing line breaks and
tabs while rejecting other ASCII control characters. Omission preserves existing
text on PATCH; null clears it. Owner and buyer listing DTOs include description
as string|null, with missing historical values returned as null. Existing write
authorization, version conflicts and idempotency apply without new endpoints.

Implemented for the mobile unified buyer/seller account using the existing bearer
session. These write contracts supersede the illustrative historical listing-write
payloads in `API_SPEC.md`. Use `/api/v1`, HTTPS outside local development, JSON
envelopes, and `Cache-Control: no-store`. There is no mobile guest flow.

## Endpoints

Seller activation can also occur before publication through explicit Home
confirmation: see `SELLER_ACTIVATION.md`. First publication still grants seller
while preserving all other capabilities.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/categories` | Active category IDs, names, shelf-life labels and notification modes |
| GET | `/listings` | Existing village marketplace feed with search/group/category/page filters |
| GET | `/listings/:id` | Existing safe visible product detail |
| GET | `/listings/mine` | Owner-only history; optional status, page and limit |
| GET | `/listings/mine/:id` | Owner-only product, editable fields, version and effective status |
| POST | `/listings` | Create/publish; earns seller capability without removing buyer/other roles |
| PATCH | `/listings/:id` | Edit an active, unexpired owned listing |
| DELETE | `/listings/:id` | Deactivate an owned listing, retaining history |
| POST | `/listings/:id/sold-out` | Mark active owned stock sold out; quantity becomes zero |
| POST | `/listings/:id/relist` | Relist expired/sold-out owned stock with quantity and expiry |
| GET/PATCH | `/admin/listing-settings` | Separately authenticated Super Admin active-listing ceiling |

Owner reads include expired/sold-out/deactivated records even after changing
village. Marketplace reads do not reveal those records or private seller data.
Publishing/editing/relisting requires the account's current confirmed active
village to match the listing village. Removing/selling out old stock remains
possible without changing village back. Non-owner targets return the same
`404 LISTING_UNAVAILABLE` as missing IDs. Admin cookies do not authenticate mobile
routes, and mobile bearer credentials do not grant admin settings access.

## Authentication and safe retries

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
Idempotency-Key: <stable-operation-id>
```

All five mutation methods require the same stable key on retries: 8–100 ASCII
letters, digits, hyphens or underscores (UUIDs work). Scope is account + key;
reusing it for another operation/path or a different normalized body returns
`409 IDEMPOTENCY_CONFLICT`. Reordering JSON object keys does not change the request
hash. Successful responses/statuses are persisted and replayed atomically with the
listing mutation. Failed requests do not reserve a key. A replay returns the
original successful snapshot, not necessarily the current listing version; fetch
the owner detail to get current state. Replaying an old create after delete never
recreates or activates the listing.

MongoDB replica-set/Atlas transactions and unique indexes are required. The
server serializes each owner's writes to prevent concurrent duplicate/limit races,
and takes the same village/category locks as administrative changes. Admin/user
status changes are rechecked in the transaction. Operation records currently have
no TTL so delayed retries cannot silently repeat writes. Future retention changes
must preserve an explicitly agreed offline retry window.

## Create example

Get the actual `categoryId` from `/categories` and `villageId` from `/users/me`.
Submit a future ISO UTC date, or null only for the `RECURRING_SUPPLY` category.

```json
{
  "productName": "Tomato",
  "productNameMr": "टोमॅटो",
  "categoryId": "<actual MongoDB category ID>",
  "villageId": "<your confirmed MongoDB village ID>",
  "productGroup": "vegetables",
  "quantity": 40,
  "unit": "kg",
  "price": 28,
  "expiresAt": "<future ISO UTC timestamp>",
  "minimumPurchaseQuantity": 2,
  "fulfillmentOptions": ["farm_pickup"]
}
```

- `productName`: required, trimmed, 1–120 characters; no control/format characters.
  `productNameMr` is optional and may be null. No automatic translation.
- `categoryId`: required active Category MongoDB ID. It is stored together with
  the category code for backward-compatible marketplace/category queries.
- `villageId`: required and must equal the current user's confirmed village.
  The server determines seller and initial active status; clients cannot supply
  roles, seller, status, isDemo, version, timestamps or another village.
- `productGroup`: optional `vegetables`, `fruits`, `grain` or `dairy`, separately
  from the category's shelf-life tier. Null/omitted groups stay under All so other
  approved produce (such as flowers/spices) is not forced into a false group.
- `quantity`: positive finite JSON number, maximum 1 billion. `unit` is a trimmed
  1–30 character label, permitting kg/litre/dozen/bunch/pieces and local terms;
  quantities are not forced to kilograms. Numeric strings are rejected.
- `price`: optional nonnegative finite JSON number up to 1 billion; null means
  no rate. Rate is per the listing unit.
- `expiresAt`: required future ISO UTC timestamp, or explicit null for standing
  `RECURRING_SUPPLY` only. Default shelf-life is returned as a category label for
  form presentation; backend does not guess a date from that free-text label.
- `minimumPurchaseQuantity`: optional positive number/null in the same listing
  unit, and cannot exceed available quantity.
- `fulfillmentOptions`: optional distinct values `farm_pickup`/`local_transport`.
  These are seller-declared informational options, not managed delivery bookings.
- `photoObjectKey`: optional/null, safe `listings/<current-user-id>/...` image key
  ending in webp/png/jpg/jpeg. Cross-account keys, URLs and traversal are rejected.
  This API references already uploaded objects; it does not upload files or verify
  remote object existence. Upload/provider integration remains separate work.

First publication transactionally grants seller while preserving buyer and all
other existing capabilities. Creation/relisting checks the overall active ceiling
(default 10, editable by Super Admin), independent of category. A deterministic
Unicode name comparison catches exact/near spellings in the same owner's active
stock. A duplicate yields `409 DUPLICATE_LISTING` with the owned existing listing
ID so the client can offer to edit it. It does not silently merge products.

## Edit, delete and lifecycle examples

Get the latest `version` from `/listings/mine/:id` first.

```http
PATCH /api/v1/listings/<id>
Idempotency-Key: <new stable operation ID>
```

```json
{"version":1,"quantity":30,"price":32}
```

PATCH accepts any create product field except `villageId`, plus required positive
integer `version`; at least one editable field is required. Omitted fields are
preserved; explicit null clears optional name/rate/photo/minimum values. It cannot
revive expired/sold-out/deactivated/reported/pending stock or bypass duplicate,
minimum-quantity, category, expiry or image-ownership rules.

```http
DELETE /api/v1/listings/<id>
Idempotency-Key: <new stable operation ID>
```

```json
{"version":2}
```

Returns `{id,deleted:true,status:"deactivated",version}`. The database record and
its photo reference remain; `deactivatedAt` is recorded. Already deactivated owned
records return the confirmed state without another listing event/version change.
Seller capability and all buyer/seller history remain intact. No hard-delete or
automatic resurrection path exists here.

Sold-out request: `{version}` to `/listings/:id/sold-out`. Relist request:
`{version,quantity,expiresAt}` to `/listings/:id/relist`. Relist accepts only expired
or sold-out stock, requires current active village/category and reruns duplicate/
ceiling/minimum checks. Reported/pending/deactivated records cannot use it.

Successful edits/state changes increment `version`. Legacy records without that
field read as version 1; their first mutation persists version 2. Stale edits yield
`409 STALE_VERSION` with current version/status in `error.details`; reload and
resolve the conflict rather than overwriting server data.

## Database and response fields

Listings retain the existing `productName/productNameMr`, quantity/unit/price,
seller/village references, category string, group, photo key, demo flag and
timestamps. New optional fields are `categoryId`, `version`,
`minimumPurchaseQuantity`, `fulfillmentOptions`, and `deactivatedAt`. Status values
remain lowercase; `sold_out` and `deactivated` extend the existing active/expired/
reported/pending states. No application records are bulk renamed or inferred.

Owner DTOs include the ID, product fields, category ID/code, photo key/resolved URL,
village ID/safe village DTO, effective status, version, expiry and timestamps. They
never expose phone/email/session data. Marketplace DTOs additionally return safe
minimum/fulfillment metadata but omit owner-only fields. A null recurring expiry
is current stock until explicitly sold out/deactivated; missing legacy expiries
are not silently converted to standing supply. Expired status is evaluated at
read time, independently of a future scheduled expiry job.

New server-only collections:

- `listingoperations`: unique `{user,key}`, scope, SHA-256 request hash, original
  safe response/status and timestamps. No token or submitted raw contact data.
- `listingevents`: user/listing IDs, created/updated/sold_out/relisted/deactivated
  action, version and timestamps, indexed by listing/createdAt.
- `listingsettings`: singleton `listing-policy`, activeListingLimit and version.
  Admin GET starts at `{activeListingLimit:10,version:0}` before any configuration.
  PATCH takes those two fields, uses a version check and appends an admin audit
  event. Existing admin cookie/CSRF-origin/auth rules apply.

## Verification and unfinished client work

2026-10-15 update: the mobile Add Listing form, ordered SQLite draft persistence,
staged manual retry and local asset-photo selection are now connected. See
`ADD_LISTING.md`. Exact allowlisted `listings/assets/*.webp` keys are now permitted
alongside owner-scoped images. Older statements below about the add form/upload
work reflect the earlier backend-only milestone; native upload, edit UI and automatic
background queue are still pending.

```powershell
npm run test:listing-crud --workspace=@gaavli/web
npm run test:listing-integration --workspace=@gaavli/web
npm run test --workspace=@gaavli/web
```

CRUD integration uses only a random `gaavli_crud_test_<hex>` database, dropped after
the test. It covers actual Route Handlers and MongoDB transactions, anonymous/
non-owner/origin/privilege rejection, create/edit/get/delete, category/village/
expiry/photo validation, seller conversion, concurrency, replay/key conflicts,
duplicate/limit checks, standing supply, metadata, lifecycle, retained history and
settings audit. Application listings/users are not modified by these tests.

Mobile existing detail views now display saved minimum/fulfillment values and
handle standing expiry; add/edit/My listings forms, conflict resolution UI,
persistent SQLite queues/restart recovery and upload UI/API are not connected by
this backend task. Protected seller contacts, notification delivery, admin listing
moderation UI/API, nearby mappings and scheduled expiry notifications remain
separate work. No payment, chat or delivery-management workflow is introduced.

Restart the development backend after model changes with `npm run dev:web`.
