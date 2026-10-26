# Independent browsing village — 2026-10-23

## Registered buyer/seller default - 2026-10-26 (user approved)

On login/account switch and each app launch, signed-in buyers and sellers start
with their registered village as the browsing center, ignoring an older saved
browsing choice. Home and Marketplace keep sharing the same center. They may
select another village during the launch; session refresh and profile updates
preserve that explicit choice. Guest and coordinator persistence is unchanged.
The device preference is retained in SQLite; this revision supersedes restoring
it as the initial buyer/seller center. Discovery connections and protected
contact scope remain unchanged.

User-approved Home and Marketplace revision: their headers show the current
browsing village with a location icon and dropdown chevron. Both reuse one
searchable picker, existing theme/components and Marathi/English text.

## Mobile state and persistence

- `browsingVillage` in the existing global store is separate from
  `session.user.village`, coordinator assignments and onboarding `guestVillage`.
  With no explicit choice, use the registered or guest onboarding village.
- Fetch active villages through existing `GET /api/v1/villages`, with bilingual
  server search, 20-row pagination and automatic loading on scroll. No hardcoded
  village records. Duplicate loaded names show existing area metadata; the closed
  control shows only the localized selected name.
- Persist validated public metadata under SQLite settings key `browsing-village`.
  Existing key/value storage needs no schema migration. Serialize writes across
  tabs and publish only after successful persistence. Failed writes leave the
  prior selection active and show a picker error; corrupt saved data falls back.
- Startup restores this choice before either feed renders. Language changes,
  registration and profile-village updates preserve an explicit browsing choice.
  It is a device-wide public preference. The 2026-10-26 logout revision clears
  this setting together with the guest village to restart first village selection.
- Home, Marketplace and product-detail query keys include source village and
  viewer identity. Selection refreshes both feeds; existing Marketplace chip and
  voice-search scope changes with it. Old chip IDs cannot narrow a new source.
- Reuse loading, empty, retry, storage-error and offline UI. Cached village
  choices can be selected offline; fresh villages/listings require connectivity.
  Previous-source listings are not placeholders for a new village. Persistent
  offline listing-cache support is unchanged.

## Existing listing API

Existing optional `sourceVillageId` now selects the public browsing center for
both guests and authenticated readers:

- `GET /api/v1/listings?sourceVillageId=<id>&...`
- `GET /api/v1/listings/:id?sourceVillageId=<id>`

Validate an active source. Authenticated accounts retain registered-village
readiness checks; omitting the source retains their old default. Discovery still
uses the selected center and manually confirmed active connections. An optional
`villageId` chip only narrows that source's scope. Own-offer exclusion, visibility,
expiry, pagination, bilingual search, safe DTOs and no-store responses remain.

## Registered village and contact boundary

Browsing never PATCHes `/users/me`, changes profile/registration data, or writes
coordinator mappings. Profile's existing village confirmation stays unchanged.
Seller contact, interest, notification, callback and listing writes retain their
registered-account village/ownership/consent checks. Passing a browsing source
to a contact route cannot broaden authorization. Public product details remain
readable from the selected browsing center.

## Verification

Mobile tests cover restart persistence, registration/assignment isolation,
profile-village changes, failed-write recovery, cross-tab ordering, corrupt
metadata and localized labels. Isolated listing-route tests cover unrelated
active village browsing/detail reads, inactive/invalid sources, unchanged
registered village and contact protection (including a contact source override
attempt). Device layout, keyboard, scrolling and restart checks remain pending.
