# Marketplace availability layout — 2026-10-29

Marketplace reuses its existing header/search/voice/categories and listing card,
with full-width available cards followed by muted compact unavailable rows. Both
sections fetch five actual seller listings per page through the existing endpoint
with optional `availability`; see [API_SPEC.md](API_SPEC.md). The default category
is All. Each section expands on the same screen independently; filter/village/
account changes reset visible counts even when cached pages exist. Unavailable
rows contain image/name/village/status only, with no detail/contact actions.
Product Master remains only a voice/search reference, never unavailable inventory.
Active detail navigation, registered contact flows and backend sorting remain.

# Mobile database listing reads — 2026-10-14

Browsing village revision — 2026-10-23: Home and Marketplace now share a
searchable location dropdown and a persisted browsing center, independent of
registered village. Feed/detail GETs use an active `sourceVillageId` for guest
and signed-in reads. Existing village chips narrow that center and its confirmed
connections. Contact/write/coordinator authorization keeps its registered-account
scope. This supersedes the older plain-text/no-dropdown header wording below.
See [BROWSING_VILLAGE.md](BROWSING_VILLAGE.md).

Voice search revision — 2026-10-21: Marketplace microphone now converts speech
to text using the device recognizer in mr-IN/en-IN. Lightweight Product Master
matching extracts product names; the same listing API/search input is reused.
Exact active catalog-name searches also match paired Marathi/English names and
linked product IDs, preserving literal search and all visibility filters.
See [VOICE_SEARCH.md](VOICE_SEARCH.md) for permissions, native rebuild steps,
lifecycle, offline/device limitations and verification. Earlier voice-placeholder
notes below describe the previous implementation.

Coordinator proximity revision — 2026-10-19: confirmed active manual village links
extend marketplace/detail and protected contact eligibility by one hop in both
directions, retaining active-village/seller/category/stock checks and owner-feed
exclusion. GPS alone never expands scope. Removal affects new reads immediately
without deleting listings or request history. See `COORDINATOR_MOBILE.md`; earlier
confirmed-village-only boundaries below describe the previous milestone.

Description/search revision — 2026-10-16: listing DTOs include nullable plain-text
description, shown on Product Details in the seller's original language. Product
search splits whitespace into literal terms; every term must match a substring
of productName, productNameMr or description, case-insensitively. Terms can match
different fields and appear in any order. For a Tomato described as Organic,
`tomato`, `toma`, `TOMA`, `organic tomato` and `toma orga` match. Regex metacharacters
are escaped; 100-character input bounds, village/visibility/owner exclusions,
category filters, pagination and accurate counts remain intact. Marketplace's
existing debounced input, search icon and keyboard Search use this API. No new
search screen, Elasticsearch service, fuzzy matching or relevance index is added.
This extends the historical single-substring/name-only description below.

Own-offer browsing revision — 2026-10-15: authenticated listing collection reads
exclude products whose seller is the current user, before pagination, totals and
category facets. This applies to Marketplace and Home's fresh-product feed. The
viewer ID comes only from the verified server session; no client-supplied owner
filter or seller ID is exposed. My Listings/owner APIs retain the user's products.
Single-product reads and protected contact eligibility remain unchanged.

CRUD revision — 2026-10-14: create/edit/soft-delete/owned reads and lifecycle APIs
are now implemented; see [LISTING_CRUD.md](LISTING_CRUD.md). Buyer detail returns
optional saved minimumPurchaseQuantity/fulfillmentOptions. Standing recurring
supplies have explicit null expiry and remain visible until sold out/deactivated.
Earlier no-write/no-standing-field limitations below are historical.

Village-product filters — 2026-10-21: below the product-group icons, Marketplace
shows All plus the buyer's active village and directly confirmed active connected
villages, with localized names and real listing counts. All refers to those
villages within the current search/product group, not every village in the system.
Selecting a chip sends optional `villageId` to GET `/api/v1/listings`; it narrows
results without changing the saved account village. The server rejects a village
outside current discovery scope with 403 `VILLAGE_FILTER_UNAVAILABLE`, including
after disconnection. The same visibility/own-stock/privacy rules remain.

Responses add `villageCounts: [{id,name,nameMr,count}]`: counts reflect the current
search/category/productGroup across all eligible villages before village selection
and pagination. Source village appears first; connected villages follow name order,
including zero-count choices. Product results and total apply village selection
before pagination. Missing historical `villageCounts` defaults to [] on mobile.
Marketplace query keys include account/source village/search/group/selected village;
an account/source change resets the effective village filter. No locations or
listing groups are migrated by filtering.

Header simplification — 2026-10-19: show the selected village name as plain text
with a location icon, without a dropdown or taluka/district subtitle. Village
changes remain available through existing Home/Settings controls. Use the short
single-language Search products / उत्पादने शोधा placeholder and single-line input.
This supersedes the dropdown and longer placeholder in the header revision below.

Header revision — 2026-10-19: Marketplace uses the existing Gaavli mark and
native countryside artwork in a branded banner with localized tagline, current
village/taluka/district selector, notification bell and initials avatar. The bell
opens the protected existing Received activity/notifications route; avatar opens
Settings and village opens the existing selector. No notification count is guessed.
Search remains debounced/API-backed with the existing explicit voice-unavailable
message, now using a localized vegetables/fruits/grains/dairy/homemade placeholder.
The category row remains below the banner; no new API is required for this header.

Filter revision — 2026-10-19: Marketplace replaces the All/text-chip row with
five illustrated circular categories: Vegetables, Fruits, Grains, Dairy Products
and Homemade Products. Vegetables is initially selected. Labels use the selected
language and existing 14px typography; narrower screens scroll horizontally.
Optional `productGroup=vegetables|fruits|grain|dairy|homemade` queries filter an
explicit stored Listing product group on the server, separately from the existing
shelf-life category. Homemade is supported by create/edit/drafts/owner DTOs and
the database enum. Unfiltered API reads and Home still include unclassified legacy
rows; no product groups are guessed or migrated. This supersedes the All chip.
Existing five
Narayangaon demo rows were explicitly classified (3 vegetables, 1 fruit, 1 grain).
The search field has an accessible microphone action which reports that speech
recognition is not yet integrated. No voice dependency, recording permission or
external service was added, as requested.

Photo/demo revision — 2026-10-14: database `photoObjectKey` now resolves to
`photoUrl:null|string` in listing DTOs, and `isDemo:boolean` identifies sample
offers. Home, Marketplace and Product Details render these URLs with an image-error
placeholder. Development serves curated files from backend `/listing-photos/`;
mobile resolves relative URLs against its configured backend origin. Production
requires `LISTING_PHOTO_BASE_URL` (HTTPS public R2/S3/CDN base); no local-development
URL fallback exists in production. Object keys reject traversal and external URLs.
This implements photo reads; seller uploads and private-object signing are not
implemented. Demo listings are excluded by production listing queries.

Five user-requested, labelled demo products were inserted for the existing active
Narayangaon village (`6acdcb80d312658421fd1da5`, Junnar, Pune) using a dedicated
demo seller without a fabricated phone/contact. Tomato, Onion, Potato, Rice and
Mango have Marathi names, category codes, sample quantities/rates, kg units and
photo keys. Images reuse generated sample artwork documented in
`apps/mobile/assets/products/ARTWORK.md`; they are not actual seller photographs.
Records expire after 14 days. Existing village/account/listing records are retained.

To preview/retry this development seed, from `apps/web`:

```powershell
node --import tsx scripts/seed-narayangaon.mts --village-id=6acdcb80d312658421fd1da5
node --import tsx scripts/seed-narayangaon.mts --village-id=6acdcb80d312658421fd1da5 --apply
```

No `--apply` means no data writes. Stable insert-only IDs and a transaction prevent
duplicates/partial writes; retries preserve timestamps, rates and expiry of existing
demo records. The script refuses production and mismatched/inactive village IDs.

Historical no-photo references below are superseded by this revision.

User-approved change: Home, Marketplace and Product Details read MongoDB listings
through authenticated REST APIs only. No local sample listing fallback, sample
distance, photo or contact is substituted when the database is empty/unavailable.
This supersedes the listing-data portions of `MOBILE_HOME_PREVIEW.md`.

## Endpoints

- `GET /api/v1/listings?search=...&category=...&page=1&limit=20`
- `GET /api/v1/listings/:id` (24-character hexadecimal MongoDB ID)

Both use the existing native bearer session, Node.js runtime, mobile origin checks,
JSON envelopes and `Cache-Control: no-store`. Admin cookies do not authenticate
these routes. Query validation rejects unknown fields, page outside 1–10000,
limit outside 1–50, search over 100 characters and category over 100 characters.
Search is a literal case-insensitive substring over `productName` and
`productNameMr`; regular-expression input is escaped. This is a bounded database
query, not an Atlas Search deployment or a global search implementation.

The saved active village on the authenticated database user defines scope; the
client cannot override it. Only `active` listings with future `expiresAt`, positive
quantity, an existing active seller and active village are visible. Listings in an
existing inactive category are excluded. Existing category strings without a
Category record remain readable using that database string; no inferred category
is assigned. Listings sort by `createdAt DESC, _id DESC` and pagination/count share
the same visibility filters. Category choices represent visible database category
values in the village, independent of current search/category filters.

Page data is `{listings,total,page,limit,categories,isSeller}`. Categories are
`{code,name,nameMr:null|string}`; `isSeller` reads the current user's database role
and does not grant it. A listing DTO contains:

```text
id, productName, productNameMr:null|string,
category:null|string, categoryName:null|string, categoryNameMr:null|string,
quantity:null|number, unit:null|string, price:null|number,
photoUrl:null|string, isDemo:boolean,
village:{id,name,nameMr,taluka,district,pinCode},
createdAt, updatedAt, expiresAt (ISO timestamps)
```

Missing optional values remain null. Names are not machine-translated. If a
Marathi product/category name is absent, mobile shows the original database name.
Actual units are preserved, including non-kg units. Absent rate is displayed as
not provided. DTOs contain no seller identifiers, names, mobile numbers, addresses,
session data or raw documents. Photo references resolve through the server provider;
missing/unavailable images use a generic leaf placeholder. Distances are omitted
because no authoritative listing-distance source exists in the current model.

Errors include `401 AUTH_REQUIRED`, `422 VALIDATION_ERROR`,
`422 VILLAGE_UNAVAILABLE`, and `404 LISTING_UNAVAILABLE`. A missing, expired,
hidden or out-of-village detail ID returns the same unavailable error.

## Compatibility and current boundaries

The implemented Mongoose model retains its existing database fields:
`productName`, optional `productNameMr`, `category` string/code, `quantity`, `unit`,
`price`, `seller`, `village`, lowercase `status`, `expiresAt`, and timestamps.
No existing records are renamed or rewritten; first-class category IDs, target
listing lifecycle transitions, seller writes and photo-object uploads/private signing
still require their separate approved migrations/implementation.

Nearby-village mappings are not currently implemented. These endpoints deliver
the confirmed village only; they do not infer nearby villages from coordinates.
Coordinator data/contact and interest persistence are not delivered here. The
former sample contact screen now honestly reports that requests are unconnected;
listing reads never reveal a phone. No create/update/delete endpoint is added.

Mobile uses TanStack Query with account/village/filter-scoped keys, session renewal,
abort signals, bounded retries, server-side filters, Load more and pull-to-refresh.
Home loads the latest five database listings with the actual total. Loading, empty,
network failure/retry, invalid detail and offline states are distinct. Previously
loaded database results remain usable in memory with an offline freshness warning.
Expiry checks run every 30 seconds and on foreground return; details revalidate on
mount. This is **not** persistent SQLite listing caching or an offline write queue;
neither is claimed complete. Cold offline launch asks the user to connect.

## Verification

`npm run test:listing-integration --workspace=@gaavli/web` exercises actual route
handlers and MongoDB in a randomly named `gaavli_listing_test_<hex>` database,
then drops only that exact test database. It does not seed the application DB.
Checks cover bearer/admin-cookie/origin behavior, validation, village scope,
visibility/expiry/category/seller rules, literal Marathi search, pagination/count,
null values, empty data, safe projections and `no-store`.

Mobile tests additionally verify adapter identity/units/null fields and absence of
sample photos, prices, contacts or distances. Phone visual, network, pagination and
navigation acceptance remain separate from automated checks.

## Running locally

Use the existing backend `MONGODB_URI` in `apps/web/.env.local` and mobile
`EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env.local` (including `/api/v1`).
Keep credentials server-only. Start/restart the backend with `npm run dev:web` and
mobile with `npm run dev:mobile:go` at the repository root. Select a village that
actually has eligible database listings. Empty or expired database data produces
an empty state, never automatic sample seeding.
