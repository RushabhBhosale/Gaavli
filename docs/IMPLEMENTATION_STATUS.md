# Product Details photo-led layout — 2026-10-15

- Replaced the thumbnail/chips/options grid with a large 4:3 photo, product name,
  themed price badge and aligned quantity/minimum/date/distance/pickup/village rows.
  Narrow screens and large text stack labels/values. Existing single-language
  contact reveal, call, notify and request flows remain intact.
- Dates and standing supply come from actual API expiry. Missing distance and
  description explicitly show Not provided; description storage/form/API remains
  separate work. No fabricated gallery count, favourite action or data is added.
  Mobile TypeScript, lint and 31 regression tests passed. Native visual acceptance
  remains pending.

# Exclude own offers from buyer browsing — 2026-10-15

- Marketplace and Home's shared listing feed now exclude the authenticated user's
  own products at the repository query, before pagination/count/category facets.
  My Listings remains the owner management view. No client-side contact/seller ID
  exposure, database migration or owner/detail API change is introduced.
- Isolated integration coverage checks own-only empty feeds, accurate filters/
  counts/pages, other-seller browsing and continued owner-list access. Web
  TypeScript, lint and the isolated listing integration suite passed. See
  `03-api/MOBILE_MARKETPLACE.md`.

# Home product-card spacing and navigation grouping — 2026-10-15

- Fresh in your village cards no longer show category/shelf-life labels. Photo
  space increases to 120 high with containment; body/bottom padding is reduced.
  Existing theme, product navigation and development demo disclosures remain.
- Replaced Explore your village with localized Marketplace and services, grouping
  Marketplace, Services, Transport and Village information vertically in one
  section. Mobile TypeScript and lint passed. Native visual acceptance remains pending.

# Buyer/seller Sent and Received requests — 2026-10-15

- My Activity now has account-scoped Sent/Received request cards with actual
  product photos, names, requested quantity/unit, counterpart/village, date and
  server status. Buyers default to Sent, sellers to Received; both tabs remain
  available. Existing non-request system notifications remain under Received.
- Notify seller collects validated quantity and explicit callback permission.
  New requests snapshot product/unit/photo and counterpart/village data in the
  existing notification record. Legacy quantity stays unknown and legacy notices
  do not grant callback access. No separate collection or fake migration is added.
- Implemented participant-only request lists, recipient-only monotonic Seen/
  Responded actions, and protected per-action callback lookups. Received calls
  record Seen; Responded requires explicit seller confirmation and never means
  an automatically detected answered call. Requests do not reserve inventory.
- Pending sends persist the exact quantity/permission payload and key, with safe
  restart retry and compatibility for old key-only attempts. Client/server quantity
  limits and 24-hour differing-quantity conflict handling avoid silent changes.
- Root typecheck/lint, 31 mobile/13 web tests and isolated listing integration
  passed, including participants/statuses/callbacks/legacy privacy/snapshot tests.
  Android export and web build passed (existing local-photo tracing warning).
  Native visual/dialer/keyboard acceptance remains pending. See
  `03-api/ACTIVITY_REQUESTS.md` for APIs, database, privacy and recovery details.

# Notify seller confirmation, success and in-app delivery — 2026-10-15

- Notify seller now opens a themed confirmation sheet, Cancel/close sends nothing,
  and API-confirmed success shows a green tick and Call again. No Request Status,
  View Request or Back to Listings action is added. Selected-language text explains
  the in-app delivery and buyer-name inclusion; Call again reuses the dialer flow.
- Added authorized idempotent notify-farmer and recipient-only
  notifications APIs. A prior interest and currently eligible listing are required.
  Stable replay keys and 24-hour buyer/listing deduplication prevent duplicate
  notices; rate limits and scope/active-account checks remain server authoritative.
- Extended the existing notification model with the contact-notice type, Marathi
  copy and internal buyer/listing references. My Activity now reads real recipient
  notices with pagination, focus refresh, loading/offline/error states. No phone,
  token, external provider, paid channel or marketing opt-in is added.
- Mobile persists the retry key before sending and retains it across uncertain
  failures/restart. Cleanup failures safely retain confirmed keys. Root typecheck,
  lint, 29 mobile/13 web tests and isolated listing integration passed. Android
  export and web build passed (existing local-photo filesystem tracing warning).
  Native popup/dialer acceptance remains pending. See `03-api/NOTIFY_SELLER.md`.

# Restore saved product interest — 2026-10-15

- Reopening Product Details now reads the existing authenticated buyer/listing
  interest and restores authorized seller contact, Call and disabled Notify controls
  without another Interested tap. Restoration survives navigation/restart/new login
  through database state, with current availability checks. Loading/error states
  show loading/retry; offline cold restoration requires connectivity.
- Added a read-only no-store GET on the existing interested endpoint. It never
  creates/updates interest, returns no contact for another/uninterested account,
  and has a separate 120 reads/user/hour limit. Contact remains only in scoped
  in-memory queries with zero retention after unmount, not SQLite.
- Typecheck, lint, 28 mobile/13 web tests and isolated listing integration passed,
  including new-session restoration, account isolation, no writes on restore
  and missing/blocked/expired contact rejection. Android export/web build passed
  (existing local-photo tracing warning). Native acceptance remains pending.
  See `03-api/BUYER_CONTACT.md`.

# Interested-first contact controls — 2026-10-15

- Product Details now reveals contact through Interested first; Call seller and
  the disabled Notify seller fallback appear only after successful reveal. Returning
  from the dialer and transient network failures preserve already revealed screen
  state. Authorization/unavailable rejections still clear it. Native phone-return
  acceptance remains pending; mobile TypeScript and lint passed.
- Notify seller remains unimplemented/disabled and sends no notification.

# Buyer product photo and seller contact — 2026-10-15

- Enlarged the product preview to 140 by 140 with containment, and seller name/
  number to larger bold type. Existing theme and selected language are preserved.
- Connected Interested and Call seller to a new authenticated contact action.
  Explicit taps reveal database seller details; Call opens the native dialer.
  Browsing DTOs remain contact-free. The server rechecks listing/village/account
  eligibility and writes one unique buyer/listing interest transactionally, with
  safe concurrent retries and persistent throttling. No dependency was added.
- Mobile contact state is scoped to account/village/product and not persisted.
  Calls revalidate server eligibility. Offline/error states remain explicit;
  notification fallback and a background interest queue are separate work.
- Typecheck, mobile/web lint, 28 mobile/13 web tests and isolated listing-route
  integration passed. Android/Hermes export and web production build passed;
  web retains the existing local-photo filesystem tracing warning.
  Native visual/dialer acceptance remains pending. See
  `03-api/BUYER_CONTACT.md` for the API, database and privacy contract.

# Returning-user mobile-only sign-in — 2026-10-15

- Successful logout opens Sign in with mobile + OTP; new-account registration
  remains available and requires first/last name. Cold starts with saved language
  offer Sign in, while first welcome retains registration. Both languages and
  existing theme are supported; OTP resend preserves the chosen mode.
- Extended the existing send-otp API with a strict mobile/language payload.
  Existing accounts restore their identity, village and roles after OTP. Unknown
  accounts require registration only after valid verification; login never creates
  nameless users. Existing throttling, expiry, atomic verification, server logout
  revocation and secure credential handling remain intact. Temporary challenge
  names are nullable and cleared on login sends; no user data is deleted/migrated.
- Root typecheck, lint, 27 mobile/13 web tests and isolated MongoDB onboarding
  integration passed, including post-logout login, profile/seller restoration,
  missing-account rejection and legacy names. Android/Hermes export and web
  production build passed. Web build reports a filesystem tracing warning in the
  existing development local-photo provider; it is unrelated to authentication.
  Native device acceptance pending.
  See `03-api/MOBILE_ONBOARDING.md` for the revised contract.

# Add/Edit photo spacing — 2026-10-15

- Photo preview and Choose/Change photo controls now occupy equal-width columns
  in the shared Add/Edit form; the preview remains square. Mobile TypeScript passed.
  Phone visual acceptance remains pending.

# Toast placement and success icon — 2026-10-15

- Shared toasts now appear at the bottom above the device safe-area inset.
  Success ticks use the existing Home icon green; error icons retain error color.
  Mobile TypeScript and lint passed. Phone visual acceptance remains pending.

# Add/Edit phone-only photo controls — 2026-10-15

- Removed stock-photo and No photo choices from the shared Add/Edit form. Phone
  selection/replacement sits beside a fixed 120 by 120 contained preview. Existing
  server photos and saved older stock-photo drafts remain displayable.
- Removed routine draft-saved/saving and photo-saved text; recoverable draft
  persistence and save-failure feedback remain. Photos remain optional as before.
- Confirmed existing edit/delete success toasts follow successful API completion.
  Mobile typecheck, lint and 26 tests passed. Phone visual acceptance remains pending.

# Compact My Listings, shared edit form and confirmed deletion — 2026-10-15

- Replaced owner cards with compact photo/name/rate/quantity rows, three-dot
  actions, Marketplace/new-product header controls, and Active/Sold out/Drafts tabs.
  Existing theme tokens and selected-language text are used throughout.
- Edit loads actual owner data into Add Listing, saves a separate local edit draft,
  and sends only changed fields with the original version and stable retry key.
  Unedited photos, other-language names and exact expiry remain intact. Conflicts
  require confirmed reload rather than silently replacing newer server data.
- Delete uses a Yes/No popup and the existing authenticated versioned API. Safe
  retries survive restart; confirmed deletion clears the product's local edit
  draft, refreshes owner/buyer caches and shows success. Server history is retained.
- Root typecheck/lint/tests passed (26 mobile and 12 web tests); the isolated listing
  CRUD integration suite passed with mobile edit, replay, conflict and buyer-removal
  checks. Android/Hermes export also passed. Native visual/interaction acceptance remains pending. See
  `03-api/MOBILE_OWN_LISTINGS.md` for scope and remaining lifecycle UI work.

# Listing publication success/error toasts — 2026-10-15

- Added a shared themed toast overlay above navigation, with success/error icons,
  selected-language copy, screen-reader announcements, close control and five-second
  dismissal. A new notice replaces the old one and old timers cannot dismiss it.
- Add Listing shows success after confirmed creation/profile persistence and draft
  cleanup, so it remains visible after navigation to My Listings. Failed validation,
  upload or publication shows an error toast plus the existing inline message.
  A confirmed create followed by local/profile failure explicitly says the product
  was added and can be retried safely; queued/offline work never reports success.
- Mobile TypeScript, lint and 24 regression tests passed. Phone visual acceptance remains
  pending. No dependency or backend/database change was required.

# Expo 57 phone-photo transport correction — 2026-10-15

- Confirmed local API health and Android USB mappings for 3000/8081. Found a
  deterministic photo-upload incompatibility: the old native URI-only multipart
  object is rejected by the installed Expo 57 fetch converter before networking;
  the generic catch reported NETWORK_ERROR and misleadingly suggested API failure.
- Uploads now append an actual Expo File, retaining exact draft file/upload IDs,
  bearer handling, boundary generation and retry/timeout behavior. A pure body
  builder rejects legacy URI-only objects; regression coverage parses an actual
  multipart request and checks photo bytes/content type.
- Mobile TypeScript, lint, 24 regression tests and Android/Hermes export passed.
  Device publication still needs a retry with the refreshed app. No network URL,
  database record or USB script was changed. See `03-api/PHONE_PHOTO_UPLOADS.md`.

# Add Listing dropdown layout — 2026-10-15

- Product group, active API category and unit now use themed dropdown fields with
  scrollable selected-language option dialogs. Available quantity and unit share
  one row, with controls aligned at the bottom when labels wrap.
- Existing validation, draft persistence, pending-request locks and upload/publication
  behavior are preserved. No dependency, database or API change was needed.
- Mobile TypeScript, lint and all 23 regression tests passed, including listing
  field/expiry/minimum/photo validation. Native visual acceptance remains pending.

# Phone photo selection and development uploads — 2026-10-15

- Added SDK-compatible Expo ImagePicker and direct Expo FileSystem usage; gallery
  selection/cropping, private durable draft copy, local preview and existing stock/
  no-photo options use current theme and selected-language copy. No camera or
  microphone feature is added. Picker cancellation preserves the current photo.
- The draft saves a relative local filename, MIME, stable upload ID and returned
  uploaded key. Validate other fields before upload, save the key before staging
  publication, and reuse upload/listing IDs on retry. Missing server objects clear
  the stale uploaded key for retry; draft files are cleaned after replacement or
  confirmed publication. Multipart requests preserve native boundary generation
  and have a dedicated 60-second timeout.
- Added authenticated POST `/api/v1/listings/photos` with origin checks, bounded
  multipart parsing, file/type/pixel limits, user throttling and Sharp validation,
  auto-orientation/resize/WebP conversion and metadata removal. Normalized files
  are immutable and owner-scoped; repeated operations replay and conflicts reject.
  Create/PATCH check uploaded-object existence and preserve ownership enforcement.
- Development files are stored in `apps/web/.local/listing-photos/` (git-ignored),
  served through a validated WebP-only route; MongoDB stores only the photo key.
  This local provider fails closed in production. Durable R2/S3 integration and
  orphan cleanup remain pending; the read-only public base URL is not an upload
  provider. Phone gallery uploads are now implemented for local development.
- Verified shared/mobile/web TypeScript and lint, 23 mobile and 12 web regression
  tests, isolated MongoDB/file tests for upload/auth/origin/size/format/injected
  fields/replay/conflict, output dimensions/metadata stripping, image serving and
  attaching the photo to buyer detail, plus Android/Hermes export. Test files and
  database were removed. Actual phone picker/permissions/restart/network acceptance
  and production deployment remain pending. See `03-api/PHONE_PHOTO_UPLOADS.md`.

# Add Listing form and local photos — 2026-10-15

- Replaced the Add Listing placeholder with a selected-language form using existing
  theme/Input/Button styles. Fields cover product name, group, active shelf-life
  category, quantity, unit, per-unit rate, optional minimum purchase, expiry and
  seller-declared pickup/transport. Village comes from the actual account. No fake
  seller/contact/distance/posted values or database record is created for a draft.
- Added selectable tomato/onion/potato/rice/mango stock photos and no-photo option.
  Server assets live together in `apps/web/public/listing-photos/listings/assets/`;
  exact shared allowlisted keys resolve through the existing owner/buyer DTOs in
  development and production. Create/PATCH retain cross-account key protection.
  Mobile reuses its existing bundled product images. Camera/gallery uploads and
  external object-storage upload integration remain pending by this temporary
  asset-photo approach; no third-party package was installed.
- Connected the existing authenticated database create endpoint with validation
  and cache refresh/navigation to My Listings. Existing database fields already
  cover buyer cards/detail; no schema migration or duplicate endpoint was needed.
  Safe profile persistence retains seller capability after first publication.
- Added account/village-scoped SQLite drafts and a shared ordering queue across
  screen instances. Before publishing, save the exact normalized body/expiry and
  stable operation ID. Uncertain failures preserve a locked replay snapshot across
  restart; definite rejections unlock editing. Save/load failures are visible.
  Offline drafts are supported; a general automatic background sync engine and
  owner edit/lifecycle UI remain pending.
- Verified shared/mobile/web TypeScript and lint, 21 mobile and 12 web tests,
  isolated MongoDB CRUD with mobile-prepared persisted draft/create/replay/buyer
  detail round trip, photo URL and private-field protection, Android/Hermes export,
  formatting and whitespace. Native phone layout/keyboard, real SQLite restart and network-loss
  acceptance and web production build remain pending. See `03-api/ADD_LISTING.md`.

# Settings tab reference layout — 2026-10-14

- Replaced the visible Profile tab label/icon with translated Settings and a gear.
  Retained the existing profile route for compatibility. Reworked the screen into
  the reference's identity card, Account and Notifications groups, icon rows,
  radio language selector titled Change language and logout using existing theme
  tokens. Radio options expose checked/disabled accessibility state and retain
  the existing persisted language behavior.
- Removed the change action from the identity section. Village change is now an
  Account row; village navigation, SQLite-persisted language and authenticated
  logout preserve their existing working behavior and error/busy handling.
- Identity shows actual session name, village and capability. No sample phone
  is displayed because the safe current user DTO does not contain a mobile number.
  Profile edit and favourites show translated unavailable messages. Notifications
  has a visibly disabled switch and explains that delivery/preferences integration
  is pending; it never claims notification consent or delivery was enabled.
- Verified mobile TypeScript, lint, formatting and all 18 regression tests.
  Native phone visual/accessibility acceptance remains pending. No API/database
  changes or dependencies were needed for this layout revision.

# Seller confirmation and My Listings — 2026-10-14

- Implemented explicit authenticated seller activation using existing User.roles,
  preserving buyer and other capabilities. Safe user DTOs now include isSeller
  across OTP, refresh, profile, village changes and activation; secure local session
  persistence precedes the mobile state/tab change. Repeat requests are safe.
- Home opens the supplied confirmation structure using existing theme tokens and
  selected-language copy. No cancels; Yes has loading/error handling and is disabled
  offline. Success replaces the visible Marketplace tab with My Listings, retains
  Home's buyer browsing links, and updates Home/Profile seller capability displays.
- My Listings reads real owned records with pagination/refresh/loading/errors and
  shows the reference sprout/first-product state only after a successful empty read.
  The button opens the existing add-listing placeholder. Add/edit forms, image
  upload, offline drafts/queues and contact disclosure are still pending.
- Verified shared/mobile/web TypeScript, lint, 18 mobile/12 web regression tests,
  isolated MongoDB CRUD plus seller activation/auth/origin/injection/retry/profile/
  village/refresh persistence and secure session restoration. Test data is isolated
  and removed. Android/Hermes export passed. Phone visual acceptance and web
  production build checks remain pending. Contract: `03-api/SELLER_ACTIVATION.md`.

# Listing CRUD backend — 2026-10-14

Status: IMPLEMENTED — backend automated verification passed; client write flows pending.

- Added bearer owner create/PATCH/DELETE, owned history/detail, sold-out/relist
  and active category endpoints. Soft delete retains listing/history/photo refs.
  First publication grants seller while preserving buyer and unrelated roles.
  Strict bounded shared schemas/types reject seller/status/village/role injection;
  publishing/edit/relist require current active village/category and owned images.
- Added categoryId while mirroring existing category codes, explicit versions,
  minimum-purchase and seller-declared fulfillment metadata, and sold_out/
  deactivated statuses/deactivatedAt. Explicit-null recurring expiry is supported;
  old missing expiry/version data is not bulk inferred/migrated. Owner history
  includes expired and deactivated rows; buyer reads remain safe/visible only.
- Transactional persistent operation records (unique user/key, request hash and
  original response) provide safe retries and reject conflicting key reuse.
  Owner write locks serialize duplicate/active-limit checks; stale edits return
  current owned version/status. Successful mutations append versioned events.
  Unicode name normalization/edit distance detects near duplicates without an LLM.
- Active ceiling defaults to 10; audited versioned Super Admin settings API allows
  configuration. Admin stock/category counts now include standing supplies and new
  lifecycle states using shared stock rules and existing chart colours.
- Existing mobile details now display actual optional minimum/fulfillment values
  and handle standing expiry. No add/edit/My listings write form, SQLite queue,
  contact disclosure, image upload or notification delivery is claimed.
- Verified mobile/web TypeScript and lint, 12 web policy/security/auth tests,
  17 mobile regression tests, isolated MongoDB CRUD/ownership/concurrency/replay/
  version/duplicate/ceiling/lifecycle/audit/standing-supply tests and existing read
  integration, formatting and whitespace checks. Test databases were removed;
  application users/listings were not changed by these tests.
- Pending: production build/deployment checks and client/phone acceptance, seller
  write UI/conflict UX/persistent offline queues, upload/object verification,
  protected contact/notifications, admin moderation, nearby mapping and scheduled
  expiry jobs. Restart development backend after schema changes.
  Complete contract/examples/fields: `docs/03-api/LISTING_CRUD.md`.

# Product detail reference layout — 2026-10-14

- Reworked Product Details to the supplied structure: inline circular back/title,
  compact database image beside selected-language name/rate, quantity and village
  chips, minimum-purchase/delivery panels, seller/contact panel and green call/
  yellow notify actions using existing theme tokens. No second-language subtitle
  or posted-date/time is rendered. Demo labels and actual database photo/rate/unit
  values remain intact; narrow screens/large text stack the information panels.
- Current DTO does not supply minimum purchase, delivery or seller contact.
  Missing values explicitly say not provided; seller/contact explains integration
  is pending. Call/notify actions are visibly disabled and send nothing. No fake
  seller, phone, crate conversion or delivery promise was introduced.
- Mobile TypeScript, lint, formatting and all 17 existing tests passed. Phone
  visual/large-text checks and protected contact/notification integration remain
  pending; this is a layout change without API/model/database writes.

# Marketplace product filters and voice icon — 2026-10-14

- Restored fixed translated All/Vegetables/Fruits/Grain/Dairy products chips.
  Added explicit optional Listing productGroup and validated server query filter,
  separate from shelf-life categories. Search/filter/count/pagination still run
  against the database. Unclassified legacy rows remain under All until assigned.
- Classified only the existing five Narayangaon demo rows (3 vegetables, 1 fruit,
  1 grain), preserving all other fields, expiry and timestamps. Seed supports a
  guarded `--update-groups` for these owned demo records only.
- Added a 48 dp accessible microphone icon with a translated unconnected-feature
  message. Actual speech recognition is pending by user instruction when it needs
  an integration/dependency; no package/service/recording permission was added.
- Mobile/web TypeScript and lint, 17 mobile tests and isolated MongoDB integration
  passed. Integration checks each group, empty groups, combined search and rejected
  unknown values. Native filter layout and icon interaction checks remain pending.

# USB mobile API connection recovery — 2026-10-14

- Diagnosed API server healthy at port 3000 and mobile configured for localhost,
  with USB adb forwarding only for port 8081. Restored `tcp:3000 → tcp:3000` on
  the connected Android phone. Verified forwarding list and phone TCP connection;
  backend health returns HTTP 200 from localhost/127.0.0.1/LAN address.
- Added root `mobile:usb` to restore API/Metro mappings and check backend health,
  plus `dev:mobile:usb` to perform the checks before starting Expo Go. Documented
  localhost USB versus LAN/emulator configuration and reconnection behavior.
  Existing mobile environment and server/application data were preserved.
- Script syntax, formatting and live forwarding/health checks passed. In-app
  retry/OTP/listing behavior after reconnection remains a phone acceptance check.

# Listing photos and Narayangaon demo products — 2026-10-14

- Added database `photoObjectKey`/`isDemo`, server photo-provider URL resolution,
  safe nullable `photoUrl`/demo DTO fields and mobile remote-image rendering with
  missing/error placeholders in Home, Marketplace and Product Details. Object keys
  reject traversal and arbitrary origins; development uses backend static files,
  production requires an HTTPS R2/S3/CDN public base. Demo queries are hidden in
  production. No seller image upload/private-signing endpoint is claimed.
- At the user's explicit request, inserted five labelled database demo products
  into existing Narayangaon (`6acdcb80d312658421fd1da5`, Junnar, Pune): Tomato,
  Onion, Potato, Rice and Mango with Marathi names, active category codes, kg
  quantities, rates, 14-day expiry and photo keys. Dedicated demo seller has no
  fabricated phone/email; existing seller/village/listings preserved. Insert-only
  stable IDs, dry-run and transactional apply are in `scripts/seed-narayangaon.mts`.
  Existing generated sample photographs were copied to backend static storage;
  provenance is in `public/listing-photos/ARTWORK.md`. Demo labels prevent these
  sample prices/photos from appearing to be actual seller offers.
- Verified application database: five demo records produce correct photo URLs
  through the real listing service/DTO; all five static WebPs return HTTP 200 and
  image/webp. Mobile/web TypeScript and lint passed, 17 mobile tests passed, isolated
  MongoDB route integration (including photo traversal/credential rejection and
  production demo exclusion) passed, web build and Android export passed.
- Native photo/error/offline appearance remains pending. Production object uploads,
  seller upload UI/API, verified distance/nearby mappings, coordinator/contact APIs
  and durable offline listing/photo storage remain unfinished. Configuration and
  dataset details: `docs/03-api/MOBILE_MARKETPLACE.md`.

# Database-only mobile listing reads — 2026-10-14

Status: IMPLEMENTED — native acceptance pending (live read slice only).

- Added bearer-authenticated `GET /api/v1/listings` and
  `GET /api/v1/listings/:id`: Node Route Handler → auth → strict Zod inputs →
  service → repository → existing MongoDB Listing/User/Village/Category models.
  Safe DTOs, no-store, literal English/Marathi name search, database category
  choices, bounded pagination/count and newest-first sorting. Confirmed active
  village scope; active/unexpired positive-quantity listings, active sellers and
  villages only; known inactive categories are hidden.
- Home, Marketplace and Product Details now use these APIs only, with no fixture
  fallback. Preserved compact layouts, selected-language names, stored units/null
  rates, detail navigation and current-user seller capability from the database.
  Removed sample distances, listing photos and seller contacts from live screens;
  absent photos have a generic placeholder. Coordinator/contact APIs remain future
  work. Historical fixtures remain for tests without runtime screen imports.
- Added loading, empty, error/retry, server search/filter, Load more and marketplace
  pull-to-refresh. Queries are scoped by account/village/filter, reuse session
  renewal and cancel requests. Existing database-derived memory results have an
  offline freshness warning; local expiry checks run every 30 seconds/foreground.
  SQLite listing caching, cold offline reads and write queues are NOT delivered.
- Model compatibility: optional `productNameMr`, new village/status/newest compound
  index, no record rename/migration or application sample seeding. Existing string
  categories are supported. No create/edit/delete listing API is implemented.
- Verified: mobile/web TypeScript and lint; 16 mobile tests; 10 web tests; real
  MongoDB listing-route integration in an isolated random test DB; web production
  build; Android export; changed-source formatting. Integration verifies bearer/
  cookie/origin checks, validation, visibility/scope, bilingual literal search,
  pagination, empty data, null fields, no-store and omission of private contacts.
  The test DB was cleaned up; application data was not seeded or changed.
- Pending: phone visual/search/navigation/offline acceptance, nearby-village
  mappings, photo providers, coordinator data, protected contact/interest writes,
  full listing lifecycle/category-ID migration and durable offline storage.
  Current contract/setup: `docs/03-api/MOBILE_MARKETPLACE.md`.

# Compact buyer dashboard product cards — 2026-10-14

- Removed seller names and available quantities from Home product cards. Reduced
  card width, image height, padding and typography while keeping category, selected
  language name, rate and recency. Existing theme and detail navigation retained.
- Mobile TypeScript and lint passed; source formatting checked with Prettier.
  Phone visual and large-text checks remain pending.

# Marketplace details button placement — 2026-10-14

- Moved the compact View details button to the right of the product information
  and village/distance block inside each marketplace card. Existing theme and
  navigation retained. Mobile TypeScript and lint passed; source formatted.
  Phone visual and large-text checks remain pending.

# Marketplace card distance and centered action — 2026-10-14

- Removed posting-time labels from marketplace cards. View details is now a
  compact centered button using the existing theme, below the village line.
  Quantity remains directly under the rate and names follow the chosen language.
- Village lines include approximate distance from explicitly labelled sample
  metadata (about 4 km). Listings still come from `mockHomeData.ts`, not MongoDB
  or a listing API; distances are not derived from the user's village or GPS.
- Mobile TypeScript, lint and changed-source formatting passed. Phone visual
  checks and live listing/distance integration remain pending.

# Compact marketplace cards — 2026-10-14

- Reduced card padding, thumbnail and typography sizes. Product names now use
  only the selected language; available quantity appears directly under the rate.
  Replaced the full-width button with an inline View details action beside village
  and posting information. Marathi action text is Marathi only. Existing theme,
  product navigation and accessible 48 dp action target are preserved.
- Mobile TypeScript, lint and source formatting passed. Phone visual and
  large-text checks remain pending; this remains a labelled sample marketplace.

# Mobile marketplace layout — 2026-10-14

- Replaced the marketplace grid with one full-width card per listing using the
  existing Home theme, shared panels/buttons and local product images. Cards show
  localized/bilingual names, price per kg, available kg, sample listing village,
  posting day and View details, without seller/contact fields in the feed.
- Added crop search in Marathi/English and All/Vegetables/Fruits/Grains/Milk
  filters over explicitly labelled fixtures, including an empty-results message.
  The header uses the saved village and links to village selection. Sample listing
  villages remain fixture metadata rather than inheriting the account village.
- Verification: mobile TypeScript, lint and all 14 existing tests passed;
  changed source files formatted with Prettier. Native visual, keyboard,
  search/filter interaction and large-text checks remain pending. Live listing
  APIs and durable offline marketplace data remain future integration work.

# Previous mobile branding restored — 2026-10-13

- Reverted user-provided logo integration, size and compact-spacing changes.
  Restored leaf-and-sun welcome branding, native registration/startup Brand,
  earlier form spacing, Expo icon/splash configuration and Android artwork.
  Replacement component/PNG derivatives/preparation script were removed.
- Retained workspace startup fix and existing onboarding/dashboard/backend work.
  Mobile TypeScript, lint, formatting and Android export passed; only the previous
  welcome logo is bundled. Phone/native rebuild verification remains pending.
- Subsequent historical entries for the replacement logo and compact onboarding
  layouts are superseded by this user-requested restoration.

# Compact mobile onboarding spacing — 2026-10-13

- Welcome logo/copy/button are grouped with smaller gaps and a responsive farm
  footer. Registration uses a single back/logo header row and reusable compact
  Screen/Input styles. Touch targets remain at least 48 dp; existing form logic,
  keyboard handling and translation scaling remain intact.
- Removed bounce/overscroll and scroll indicators. Content that fits does not
  scroll; genuine overflow from keyboard/errors/large text remains reachable.
- Mobile TypeScript, lint and Android export passed. Phone fit, keyboard and
  large-text visual checks are pending. No new dependencies or backend changes.

# Expo workspace startup correction — 2026-10-13

- Diagnosed the live Metro manifest serving `node_modules/expo/AppEntry` after
  Expo was started at the monorepo root. The mobile package already declares
  `expo-router/entry`; no root App component or Metro workaround was added.
- Added root `dev:mobile:go` and mobile `start:go` scripts, and documented the
  workspace launch command and cache reset. Restarted the identified Expo server
  from `apps/mobile` in Expo Go mode.
- Verified the live manifest selects `expo-router/entry` and the Android
  development bundle returns HTTP 200 (1,395 modules). Package formatting passed.
  Physical-device launch remains unverified. No dependencies changed.

# User-provided mobile logo — 2026-10-13

- Replaced existing welcome, registration and startup logos with shared
  `GaavliLogo`, using a transparent cutout of the supplied Marathi green-and-gold
  logo. Expo icon/adaptive icon/splash and existing Android resources are updated.
- Mobile TypeScript, lint and Android export passed. Asset dimensions/transparency
  and logo/icon/splash artwork were inspected. Native build/device appearance is
  pending; launcher/splash changes need a client rebuild. No new dependencies or
  backend changes. Provenance: `apps/mobile/assets/LOGO_ARTWORK.md`.

# Mobile home layout refinement — 2026-10-13

- Coordinator information is inline below the village header with a compact Call
  button; removed the separate card. The translated Buyer/Seller badge is beside
  the greeting, and seller actions now follow village exploration at the bottom.
- Mobile TypeScript, lint and all 14 existing mobile tests passed. Phone visual
  and large-text checks remain pending. No backend or dependency changes.

# Mobile buyer dashboard preview — 2026-10-13

- Implemented HomeScreen and reusable dashboard components, 5 local product
  thumbnails, typed mock data, Marathi/English text and the requested bright-green/
  yellow palette through the existing shared theme. Header uses saved identity/
  village; marketplace and coordinator samples are visibly labelled.
- Expo Router native tabs provide Home, Marketplace, My Activity and Profile.
  Product cards → Product Details → Seller Contact routes are connected. Seller
  conversion versus dashboard actions and optional coordinator rendering consume
  fixture data. Other feature routes are honest next-phase previews.
- Profile retains actual language persistence, village changes and logout. Dialer
  links confirm sample contacts; Couldn't Reach does not claim notification delivery.
  No server code or account/role/history records changed. Live data, authorization/
  contacts, seller writes, notifications and durable offline listing storage remain
  pending; see `docs/06-ui/MOBILE_HOME_PREVIEW.md`.
- Installed requested Expo-compatible icon/font packages using npm/root lockfile.
  Mobile TypeScript/lint, 14 tests, Expo dependency check, Android export and web
  TypeScript passed. Native visual, navigation, dialer, seller/coordinator variants
  and large-text acceptance remain pending. Artwork prompts/paths:
  `apps/mobile/assets/products/ARTWORK.md` (built-in image tool).

# Shared mobile village theme — 2026-10-13

- Applied village colours app-wide through `apps/mobile/src/theme.ts`, including cream backgrounds, medium-green buttons, soft-green surfaces, focus borders and shared text/interaction styles. Removed screen-local colour literals and duplicate village control styles.
- Shared UI now supplies buttons, inputs, cards, back arrows, dropdown/action cards, location pin and offline banner. Existing language, OTP and village API/session behavior is retained.
- Mobile TypeScript, lint, all 10 existing tests and Android export passed. Native visual and accessibility/large-text checks remain pending. Usage is documented in `apps/mobile/README.md`; no dependencies were added.

# Mobile village dropdown — 2026-10-13

- User-requested village screen now has one Village dropdown, a soft-green location card, Continue, back arrow and local rural footer artwork. Removed the mobile search input/button; district/taluka remain descriptive choice metadata, not separate controls.
- Paginated choices, network retry, explicit selection and existing authenticated save/session behavior are retained. Nearby lookup failure or empty results falls back to the complete manual dropdown.
- Mobile TypeScript, lint, all 10 existing tests and Android bundle export passed. Physical-device visuals and interaction/location checks remain pending. Exact artwork prompt: `apps/mobile/assets/VILLAGE_ARTWORK.md`.

# Mobile welcome artwork — 2026-10-13

- Replaced centered language cards with compact top-right safe-area language pills; Marathi remains the default. Cream welcome screen now uses local generated logo/farm image assets, centered branding and a rounded bottom illustration. Get started retains language persistence and registration navigation.
- Short screens and enlarged text can scroll below the fixed language header. Native splash uses the cream background and updated logo (requires a native rebuild).
- Verified mobile TypeScript, lint, all 10 existing mobile tests and Android bundle export with both image assets. Device visual checks, including narrow screens and enlarged text, remain pending.
- Asset provenance and exact prompts: `apps/mobile/assets/WELCOME_ARTWORK.md`.

# Mobile onboarding Phases 2–4 — 2026-10-13

Status: **IMPLEMENTED — VERIFICATION PENDING** (physical-device acceptance).

- Welcome screen combines Marathi/English selection with Get started and local
  lightweight countryside shapes. Native splash remains a launch screen.
- Required first/last name and normalized Indian mobile registration; inline
  validation, send/loading/retry, six-digit OTP, resend countdown and translated
  expiry/incorrect/rate-limit errors. Back from OTP preserves the form draft.
- Development-only OTP provider, HMAC-hashed challenges, expiry/attempt limits,
  MongoDB rate limits and transactional one-time verification. Permanent users
  are created only after verification; repeat login resumes existing accounts.
- Separate opaque mobile sessions, hashed server tokens, active-user checks,
  access renewal, logout revocation and atomic SecureStore persistence. Existing
  admin sessions/names/capabilities are retained; legacy names are not split.
- Verified users can temporarily have no village. Authenticated paginated PIN,
  taluka and Marathi/English village search; foreground location suggestions;
  explicit server-validated confirmation. Missing PIN/coordinates are not guessed.
- Admin village add/edit supports optional PIN; editing metadata no longer
  requires coordinates. Actual village data was not fabricated or bulk migrated.
- Server restores the saved village; mobile restores its secure account snapshot
  on startup and network failure. Product listings remain next-phase work.
- Added Expo-compatible Location only. Local ignored mobile API environment is
  configured for the current LAN address; local test-provider settings added
  without overwriting existing backend configuration.

Verification: 20 unit tests PASS (10 mobile, 10 web); shared/mobile/web TypeScript
PASS; workspace lint PASS; Expo dependency compatibility PASS; Android Hermes
bundle export PASS; Next.js production build PASS. Isolated MongoDB integration
PASS for no pre-verification user, incorrect/expired/limited OTP, concurrent
verification, repeat login without duplicates, legacy names/roles, refresh/logout,
blocked accounts, production test-session rejection, PIN/taluka/name pagination,
nearby missing-coordinate behavior, inactive selection and saved-village reads.
Temporary integration database was removed; application records were untouched.
Nine live HTTP checks PASS for JSON/no-store, invalid input, unauthenticated
mobile/admin routes and cross-origin rejection.

No Android devices were attached (`adb devices` was empty). Actual device UI,
permissions, SecureStore/SQLite persistence, restart, offline and large-text
checks remain pending. Test-provider SMS is intentionally not sent. Real SMS
integration is a release gate; production rejects both test OTP and test sessions.
Native builds need rebuilding for Expo Location. API/DB/security/offline details:
[Mobile onboarding contract](03-api/MOBILE_ONBOARDING.md).

The prior Phase 1 records below are historical and do not describe current scope.

# Mobile Phase 1 foundation — 2026-10-13

Status: IMPLEMENTED — VERIFICATION PENDING (native device checks unavailable).
Added Expo SDK 57/React Native/TypeScript/Router mobile foundation, small local
brand/splash, native green/cream UI components, Marathi/English selection,
SQLite settings migration/restore/retry and translated registration scaffold.
No guest route, account creation, OTP, village/products or sync queue execution.
TanStack Query/Zustand, SecureStore helpers and NetInfo/AppState integration are
present. Typed API client validates responses and handles timeout/cancellation.

Established npm workspaces and shared types/validation/constants/utils with one
root lockfile. All 578 original web dependency entries were preserved during
migration; no unrelated upgrades. Existing admin protections remain unchanged.
Public GET `/api/v1/health` supplies minimal no-store liveness, not DB readiness.
Docs record the user-approved registration-first/mobile-language revision and
later first/last-name/nullable-village model migration requirements.

Verification: shared/mobile/web TypeScript PASS; 6 mobile + 6 existing web tests
PASS; Expo compatibility check PASS; Android Hermes export PASS (3.7 MB JS bytecode,
not APK size); web production build PASS. Live HTTP verification PASS for the
mobile client/health contract, GET-only behavior and protected Admin API.
Root workspace lint, targeted formatting and diff checks PASS. No Android device/emulator
was attached, so actual SQLite/SecureStore, restart, offline, visual/large-text
and iOS native checks remain pending. These are not claimed complete.

# Admin Categories tab — 2026-10-13

Added `/categories` navigation and the reference's four-column directory:
Category, Default shelf life, Notify mode, Active listings. Send timing is omitted
from both the table and Add category form. Search, sorting, pagination and
loading/empty/error states use protected, validated Admin APIs. Category creation
and audit logging are transactional. Four approved default tiers were initialized
with insert-only upserts; existing records were preserved on rerun.

TypeScript, lint, production build, six tests and local authenticated API integration PASS,
including authorization, origin checks, invalid input, duplicates, audit,
literal search, page clamping and counts for canonical/legacy category links.
Temporary fixtures were removed, audit evidence retained. Browser visual QA is
pending. Category
edit/delete, listing-tier migration, automatic expiry and notification scheduling
remain unfinished. Existing generic Produce listings have no inferred tier.
Status: IMPLEMENTED — VERIFICATION PENDING. No dependencies or mobile changes.

# Add Village without coordinates — 2026-10-12

User-requested Add Village form now omits coordinates. Admin creation API accepts
an omitted coordinate pair, stores no location, and returns null coordinates.
Edit retains coordinate validation. TypeScript, 5 tests and local village CRUD
API verification PASS, including coordinate-free creation and assignment.
Temporary fixtures cleaned up; browser visual QA not run. API spec updated.

# Explicit Karjat coordinator assignment — 2026-10-12

Saved the administrator-requested Karjat → Kavita Patil mapping after verifying
her active coordinator role and Karjat membership. Transaction retained the
single-coordinator invariant, version locks, audit and Marathi in-app notice.
Verified the authenticated village listing API returns Kavita Patil, and web
TypeScript checks pass. Other villages' assignments remain unchanged. This
explicit repair does not infer assignments from home-village membership.

# Coordinator dropdown and assignment diagnosis — 2026-10-12

Add/Edit Village now uses a single coordinator dropdown, preselected from the
saved assignment. Database inspection found 3 coordinator users but no saved
village assignments, explaining Unassigned in the directory. Administrators must
select a user and save to establish the explicit mapping; no assignments were
inferred or created automatically. Local API checks verified that saved mappings
return the correct coordinator user name and preserve existing protections.
Generated test records were cleaned up. Browser visual QA remains pending; app
status records static checks.

# Single coordinator and village actions update — 2026-10-12

User-approved product revision: at most one assigned coordinator per village.
A coordinator may still cover multiple villages. Single selection, API validation
and a provisioned unique villageId index enforce this; previous multi-coordinator
wording in historical entries is superseded. Listing now shows Assigned
Coordinator and an Actions menu with Edit/Delete. Delete checks linked records
again in a versioned, audited transaction and is blocked while users, listings,
assignments, mappings, preferences, services or subscriptions exist. Confirmation
offers deactivation and directs administrators to reassign/remove dependencies.

TypeScript, lint, production build, 5 tests and local integration passed, including single assignment,
correct listing mapping, dependency-blocked deletion and successful deletion of
an empty generated test village. Existing data was preserved; test fixtures were
cleaned up. Browser and concurrent-race verification remain pending. App-local
status records final tests/build and migration details.

# Village add/edit implementation update — 2026-10-12

Admin village creation/editing, validated coordinates, English/Marathi names,
taluka/district and explicit many-to-many coordinator assignments are implemented.
Directory names open the editor; Add Village creates a new active village.
Deactivation/reactivation preserves linked records and uses confirmation with
existing-model dependency counts. Writes are Super Admin-only, validated,
versioned and transactional with audit and stored assignment notices. Coordinator
role revocation clears assignments atomically. Nearby mappings and notification
delivery remain pending. Permanent deletion is disabled pending comprehensive
dependency/reassignment safeguards.

TypeScript, lint, final production build and 5 tests passed. Local API integration passed for create/edit,
coordinate round-trip, many-to-many assignments, stale/invalid input rejection,
dependencies, status transitions, notices/audit and role-revocation cleanup.
Generated test fixtures were cleaned up with audit evidence retained. Browser
visual QA, concurrent-race and failure-injection verification remain pending;
see app-local status for detailed build verification. No dependencies or mobile
offline behavior were changed.

# Local MongoDB transactions update — 2026-10-12

The existing local MongoDB Windows service now runs as single-node replica set
rs0. Original configuration was backed up; data directory and localhost-only
binding were preserved. App URI now includes `replicaSet=rs0`. Writable primary,
transaction commit, local API login, coordinator listing and audited PUT user
save passed; the saved sample's profile and roles were preserved. Existing data
counts remain 8 villages, 13 users and 10 listings. The local standalone
transaction blocker reported in prior entries is resolved in this environment.
POST creation, failure rollback, notification role-change atomicity and browser
click-through remain unverified. App-local status records setup script details.

# User edit HTTP method update — 2026-10-12

Admin Edit User now uses PUT with complete editable fields and version; creation
uses POST and status-only changes retain PATCH. Existing authorization,
validation and transaction protections are preserved. TypeScript and lint passed. Runtime
saves were not exercised; local standalone MongoDB still cannot run transactions.

# Coordinator form roles and samples update — 2026-10-12

Add/Edit User now supports overlapping Seller, Buyer and Coordinator roles through
Super Admin-only APIs. Buyer remains universal and service capabilities survive
edits. Coordinator grants/removals persist dedicated audit entries and Marathi
in-app notification records in the user transaction. End-user notice delivery and
read APIs/UI, many-to-many village assignments and assignment cleanup remain
pending. Stored records do not demonstrate notification delivery.

Three development samples (Anjali Joshi, Santosh Chavan, Kavita Patil) were added
with all three roles using insert-only stable IDs. TypeScript, lint, production
build and 4 tests passed. Local standalone seed insertion and rerun succeeded;
all three sample users retained all roles. Dataset is 8 villages, 13
users and 10 listings. Admin mutation transactions require a replica set/Atlas;
the current standalone database cannot run those saves. Browser and transactional
role-change verification remain pending. Detailed evidence is in the app status.

# User listing roles update — 2026-10-12

User listing now displays Seller, Buyer and Coordinator badges in that order,
with Sellers/Buyers/Coordinators filter tabs and database-derived counts.
Coordinator query filtering is validated server-side. User form terminology is
now Seller. Coordinator granting, revocation and village assignment workflows
remain pending; existing role preservation rules are unchanged. TypeScript,
ESLint and 3 tests passed, including coordinator query acceptance and mutation
injection rejection. Browser and database-backed filtering remain unverified.

# Village directory implementation update — 2026-10-12

`apps/web` now contains application code, so the historical documentation-only
snapshot below is no longer the current web state. Detailed prior implementation
evidence is in `apps/web/docs/IMPLEMENTATION_STATUS.md`; this update does not
reclassify unrelated features or claim the approved monorepo migration is done.

Village listing: **IMPLEMENTED — VERIFICATION PENDING**. `/villages` now includes
Village, Coordinator, Users, Nearby Mapped and Status columns, search, district
and status filtering, pagination and loading/empty/error states. The protected
`GET /api/v1/admin/villages` reads safe MongoDB-derived village/user-count DTOs
through a server-only service/repository with live Super Admin authorization and
Zod validation. Existing active-village dropdown behavior is preserved.

TypeScript, ESLint, production build, targeted formatting checks and 3
security/validation tests passed. Browser visual QA and
authenticated database-backed behavior remain unverified. Coordinator assignment
and authoritative proximity persistence remain unimplemented; their DTO fields
are null and the UI displays “Not configured”. Village mutations, assignment
notifications and proximity editing remain future work. No schemas, dependencies,
mobile code or offline sync behavior changed.

# Historical Repository Snapshot — 2026-10-07

This checkout contains project documentation only. At inspection time it had no `package.json`, `package-lock.json`, or application source. The `apps/mobile` and `apps/web` directories contain only their `AGENTS.md` instruction documents, not app implementations. No application migration has been performed.

| Area | Approved target | Current status |
| --- | --- | --- |
| AI development | Codex; root and app `AGENTS.md` instructions | Documentation updated |
| Package management | npm workspaces, `package-lock.json` | NOT STARTED; no manifests/lockfile present |
| Mobile | `apps/mobile`, React Native + Expo | NOT STARTED; no app implementation present |
| Web/API/Admin | `apps/web`, Next.js Route Handlers and shared server services | NOT STARTED; no app implementation present |
| Database | MongoDB Atlas + Mongoose, server-only | PLANNED; no integration present |
| Shared packages | `packages/types`, `validation`, `constants`, `utils` | NOT STARTED; no packages present |

This snapshot describes the checkout inspected for the documentation migration. Update it when implementation files are added and verified.

## Documentation Architecture Decision Log — 2026-10-07

| Area | Previous documentation direction | Current approved direction | Status |
| --- | --- | --- | --- |
| AI development | Mixed Claude Code/Codex guidance with root `CLAUDE.md` authority (historical; superseded) | Codex primary; root `/AGENTS.md` and app-local instructions | Documentation updated; no code migration |
| Backend | Node.js + Fastify API (historical; superseded) | Next.js Route Handlers in `apps/web`, with shared server-side services | Documentation updated; backend NOT STARTED |
| Applications | Separate `apps/api` and `apps/admin` targets (historical; superseded) | `apps/mobile` and `apps/web` | Documentation updated; app code NOT STARTED |
| Package management | pnpm + Turborepo (historical; superseded) | npm workspaces and `package-lock.json` | Documentation updated; package manifests NOT STARTED |
| UI/UX design | Mixed design and implementation agent responsibilities | Lovable design-only; Codex production implementation | Documentation updated |

These are documentation decisions only. They do not indicate that applications, workspaces, APIs, or database integrations have been migrated or implemented.

---


# `docs/IMPLEMENTATION_STATUS.md`

````md
# Gaavli — Implementation Status

## 1. Purpose

This document tracks the current implementation status of the Gaavli application.

It is a living project-status document and must reflect the actual state of the codebase, not the intended architecture or future requirements.

The purpose of this document is to allow AI coding agents and developers to quickly understand:

- What has been implemented
- What is partially implemented
- What has not yet been implemented
- What is blocked
- What has been verified
- What still requires testing or verification
- Which features are MVP-critical
- Which features are intentionally deferred

This document must remain synchronized with the actual repository.

---

# 2. AI Coding Agent Instructions

## Mandatory Reading

AI coding agents MUST read this file before starting implementation work.

This includes:

- Codex
- Developers continuing an incomplete feature

Read this file together with the applicable source-of-truth documents defined in `AGENTS.md`.

---

## Status Update Rules

AI coding agents MUST update this file after:

- Completing a feature
- Completing a significant implementation task
- Changing an existing feature
- Completing a major bug fix
- Completing a database/schema migration
- Completing an API contract change
- Completing an offline-sync workflow
- Completing an authentication/authorization workflow
- Completing an infrastructure/provider integration
- Changing implementation status from blocked/deferred to active
- Discovering that a previously marked feature is not actually complete

Do not update this file merely to make the project appear more complete.

---

## Completion Rule

NEVER mark a feature as `COMPLETE` unless:

1. The feature has actually been implemented.
2. The relevant code exists in the repository.
3. The implementation follows the applicable requirements and architecture documents.
4. The implementation has been tested at the appropriate level.
5. Important error/edge cases have been considered.
6. No known critical blocker remains.
7. The feature has been verified in the actual application or appropriate automated tests.

If implementation exists but verification is incomplete, use:

`IMPLEMENTED — VERIFICATION PENDING`

Do not use `COMPLETE`.

---

## Preserve History

When updating this document:

- Preserve existing status history where applicable.
- Do not silently rewrite previous implementation history.
- Add a new entry when a significant status change occurs.
- Do not delete historical information merely because the current status changed.
- Keep historical entries concise and factual.

---

# 3. Status Definitions

Use only the following primary statuses unless there is a strong reason to introduce another status.

| Status | Meaning |
|---|---|
| `NOT STARTED` | No implementation work has started |
| `PLANNED` | Planned but implementation has not started |
| `IN PROGRESS` | Active implementation is underway |
| `IMPLEMENTED — VERIFICATION PENDING` | Implementation exists but required verification is incomplete |
| `COMPLETE` | Implemented and appropriately verified |
| `BLOCKED` | Cannot proceed because of a known dependency/blocker |
| `DEFERRED` | Intentionally postponed to a later phase |
| `REWORK REQUIRED` | Existing implementation does not satisfy current requirements |

Do not mark work as complete simply because:

- The UI exists
- The API endpoint exists
- The code compiles
- A happy-path test passes
- A mock implementation exists
- A placeholder is present
- An AI coding agent generated the code

---

# 4. Verification Levels

Where useful, record the verification level.

### `V0 — Not verified`

No meaningful verification has been performed.

### `V1 — Static verification`

Examples:

- TypeScript compilation
- Lint
- Formatting
- Static checks

### `V2 — Automated verification`

Examples:

- Unit tests
- Integration tests
- API tests
- Component tests

### `V3 — Feature verification`

Feature tested through the relevant application workflow.

### `V4 — End-to-end verification`

Complete workflow verified across the relevant components.

Example:

```text
Mobile → API → MongoDB → Notification/Provider
````

### `V5 — Production-like verification`

Feature verified under realistic conditions such as:

* Slow network
* Intermittent network
* Offline → online transition
* Low-end Android device
* Production-like configuration
* Real external provider sandbox/test environment

Not every feature requires V5.

---

# 5. Project Phase

Current project phase:

**Phase:** `MVP DEVELOPMENT`

Update this when the project moves to another major phase.

Possible phases:

1. FOUNDATION
2. MVP DEVELOPMENT
3. MVP VERIFICATION
4. PILOT
5. PILOT FEEDBACK / HARDENING
6. PRODUCTION RELEASE
7. POST-MVP DEVELOPMENT

---

# 6. Overall Status

| Area                       | Status      | Verification | Notes |
| -------------------------- | ----------- | ------------ | ----- |
| Repository / Monorepo      | NOT STARTED | V0           |       |
| Shared Types               | NOT STARTED | V0           |       |
| Mobile Application         | NOT STARTED | V0           |       |
| Backend API                | NOT STARTED | V0           |       |
| Admin Application          | NOT STARTED | V0           |       |
| Authentication / OTP       | NOT STARTED | V0           |       |
| User / Roles               | NOT STARTED | V0           |       |
| Villages / Proximity       | NOT STARTED | V0           |       |
| Marketplace / Listings     | NOT STARTED | V0           |       |
| Search                     | NOT STARTED | V0           |       |
| Services Directory         | NOT STARTED | V0           |       |
| Interested / Contact Flow  | NOT STARTED | V0           |       |
| Notifications              | NOT STARTED | V0           |       |
| WhatsApp / SMS             | NOT STARTED | V0           |       |
| Offline / Sync             | NOT STARTED | V0           |       |
| Photo Upload               | NOT STARTED | V0           |       |
| Admin Operations           | NOT STARTED | V0           |       |
| Security / Audit           | NOT STARTED | V0           |       |
| Testing                    | NOT STARTED | V0           |       |
| Monitoring / Observability | NOT STARTED | V0           |       |
| Deployment                 | NOT STARTED | V0           |       |

> These values must be updated based on the actual repository. They are not claims that the features are currently implemented.

---

# 7. MVP Feature Status

## 7.1 Project Foundation

| Feature / Task                  | Status      | Verification | Notes |
| ------------------------------- | ----------- | ------------ | ----- |
| npm workspace root configuration | NOT STARTED | V0           | No package manifest present |
| npm workspaces                   | NOT STARTED | V0           | No package manifest or lockfile present |
| Root configuration              | NOT STARTED | V0           |       |
| Shared TypeScript configuration | NOT STARTED | V0           |       |
| Shared types package            | NOT STARTED | V0           |       |
| Shared validation package       | NOT STARTED | V0           |       |
| Shared constants package        | NOT STARTED | V0           |       |
| Shared utilities package        | NOT STARTED | V0           |       |
| Environment configuration       | NOT STARTED | V0           |       |
| Development scripts             | NOT STARTED | V0           |       |
| CI checks                       | NOT STARTED | V0           |       |

---

# 8. Mobile Application

## 8.1 Application Foundation

| Feature                  | Status      | Verification | Notes |
| ------------------------ | ----------- | ------------ | ----- |
| Expo application         | NOT STARTED | V0           |       |
| TypeScript               | NOT STARTED | V0           |       |
| Expo Router              | NOT STARTED | V0           |       |
| Navigation structure     | NOT STARTED | V0           |       |
| Zustand setup            | NOT STARTED | V0           |       |
| TanStack Query setup     | NOT STARTED | V0           |       |
| API client               | NOT STARTED | V0           |       |
| Error handling           | NOT STARTED | V0           |       |
| Localization framework   | NOT STARTED | V0           |       |
| Marathi language support | NOT STARTED | V0           |       |
| Hindi language support   | NOT STARTED | V0           |       |
| English language support | NOT STARTED | V0           |       |

---

# 9. Authentication

| Feature                       | Status      | Verification | Notes |
| ----------------------------- | ----------- | ------------ | ----- |
| Mobile number entry           | NOT STARTED | V0           |       |
| OTP request                   | NOT STARTED | V0           |       |
| OTP verification              | NOT STARTED | V0           |       |
| OTP expiry                    | NOT STARTED | V0           |       |
| OTP attempt limits            | NOT STARTED | V0           |       |
| Resend cooldown               | NOT STARTED | V0           |       |
| Authentication rate limiting  | NOT STARTED | V0           |       |
| Secure token storage          | NOT STARTED | V0           |       |
| Session restoration           | NOT STARTED | V0           |       |
| Logout                        | NOT STARTED | V0           |       |
| Account deactivation handling | NOT STARTED | V0           |       |
| Guest browsing                | NOT STARTED | V0           |       |

---

# 10. User and Roles

| Feature                           | Status      | Verification | Notes |
| --------------------------------- | ----------- | ------------ | ----- |
| User profile                      | NOT STARTED | V0           |       |
| Unified user account              | NOT STARTED | V0           |       |
| Buyer capability                  | NOT STARTED | V0           |       |
| Seller capability                 | NOT STARTED | V0           |       |
| Seller status after first listing | NOT STARTED | V0           |       |
| Service provider capability       | NOT STARTED | V0           |       |
| Coordinator role                  | NOT STARTED | V0           |       |
| Super Admin role                  | NOT STARTED | V0           |       |
| Role authorization                | NOT STARTED | V0           |       |
| Ownership checks                  | NOT STARTED | V0           |       |

---

# 11. Village and Proximity

| Feature                          | Status      | Verification | Notes |
| -------------------------------- | ----------- | ------------ | ----- |
| Village master data              | NOT STARTED | V0           |       |
| Village selection                | NOT STARTED | V0           |       |
| User village association         | NOT STARTED | V0           |       |
| Coordinator village management   | NOT STARTED | V0           |       |
| Manual village proximity mapping | NOT STARTED | V0           |       |
| GPS candidate suggestion         | NOT STARTED | V0           |       |
| Haversine calculation            | NOT STARTED | V0           |       |
| Server-side proximity validation | NOT STARTED | V0           |       |
| Authoritative manual mapping     | NOT STARTED | V0           |       |

**Important rule:**

GPS must only suggest proximity.

GPS/Haversine must never silently become the authoritative village relationship when manual administrative mapping is required.

---

# 12. Marketplace / Listings

| Feature                     | Status      | Verification | Notes |
| --------------------------- | ----------- | ------------ | ----- |
| Category structure          | NOT STARTED | V0           |       |
| Create listing              | NOT STARTED | V0           |       |
| Edit listing                | NOT STARTED | V0           |       |
| Delete/deactivate listing   | NOT STARTED | V0           |       |
| Listing expiry              | NOT STARTED | V0           |       |
| Quantity/unit               | NOT STARTED | V0           |       |
| Optional rate               | NOT STARTED | V0           |       |
| Photo attachment            | NOT STARTED | V0           |       |
| Perishable category         | NOT STARTED | V0           |       |
| Recurring supply category   | NOT STARTED | V0           |       |
| Mid shelf-life category     | NOT STARTED | V0           |       |
| Long shelf-life category    | NOT STARTED | V0           |       |
| Available Now               | NOT STARTED | V0           |       |
| Previously Available        | NOT STARTED | V0           |       |
| Relist                      | NOT STARTED | V0           |       |
| Duplicate listing detection | NOT STARTED | V0           |       |
| Seller ownership validation | NOT STARTED | V0           |       |
| Listing state transitions   | NOT STARTED | V0           |       |

---

# 13. Search

| Feature                   | Status      | Verification | Notes |
| ------------------------- | ----------- | ------------ | ----- |
| Basic search              | NOT STARTED | V0           |       |
| Typeahead                 | NOT STARTED | V0           |       |
| Typo tolerance            | NOT STARTED | V0           |       |
| Marathi search            | NOT STARTED | V0           |       |
| Hindi search              | NOT STARTED | V0           |       |
| English search            | NOT STARTED | V0           |       |
| Category filtering        | NOT STARTED | V0           |       |
| Village filtering         | NOT STARTED | V0           |       |
| Available Now filtering   | NOT STARTED | V0           |       |
| Previously Available      | NOT STARTED | V0           |       |
| MongoDB Atlas Search      | NOT STARTED | V0           |       |
| Device speech recognition | NOT STARTED | V0           |       |

Offline search must only operate on cached data and must clearly communicate its limited scope.

---

# 14. Services Directory

| Feature                | Status      | Verification | Notes |
| ---------------------- | ----------- | ------------ | ----- |
| Service categories     | NOT STARTED | V0           |       |
| Create service profile | NOT STARTED | V0           |       |
| Edit service profile   | NOT STARTED | V0           |       |
| Search services        | NOT STARTED | V0           |       |
| Profession search      | NOT STARTED | V0           |       |
| Keyword search         | NOT STARTED | V0           |       |
| Village filtering      | NOT STARTED | V0           |       |
| Self-declared status   | NOT STARTED | V0           |       |
| Verification status    | NOT STARTED | V0           |       |
| Medical disclaimer     | NOT STARTED | V0           |       |

Service providers must not be presented as verified unless verification actually exists.

---

# 15. Interested / Contact Flow

| Feature                       | Status      | Verification | Notes |
| ----------------------------- | ----------- | ------------ | ----- |
| Interested action             | NOT STARTED | V0           |       |
| Interested offline queue      | NOT STARTED | V0           |       |
| Idempotent Interested request | NOT STARTED | V0           |       |
| Seller notification           | NOT STARTED | V0           |       |
| Notify Farmer fallback        | NOT STARTED | V0           |       |
| Contact privacy               | NOT STARTED | V0           |       |
| Contact disclosure rules      | NOT STARTED | V0           |       |

Gaavli does not control the transaction after connecting the parties.

---

# 16. Notifications

| Feature                       | Status      | Verification | Notes |
| ----------------------------- | ----------- | ------------ | ----- |
| In-app notifications          | NOT STARTED | V0           |       |
| Push notifications            | NOT STARTED | V0           |       |
| Notification preferences      | NOT STARTED | V0           |       |
| Notification consent          | NOT STARTED | V0           |       |
| WhatsApp provider abstraction | NOT STARTED | V0           |       |
| SMS provider abstraction      | NOT STARTED | V0           |       |
| WhatsApp consent              | NOT STARTED | V0           |       |
| SMS consent                   | NOT STARTED | V0           |       |
| STOP/opt-out handling         | NOT STARTED | V0           |       |
| 6 AM digest                   | NOT STARTED | V0           |       |
| Skip empty digest             | NOT STARTED | V0           |       |
| Language-specific templates   | NOT STARTED | V0           |       |

Registration must never automatically imply marketing consent.

---

# 17. Offline-First / Synchronization

Refer to:

`docs/OFFLINE_SYNC.md`

| Feature                    | Status      | Verification | Notes |
| -------------------------- | ----------- | ------------ | ----- |
| Expo SQLite                | NOT STARTED | V0           |       |
| Local schema               | NOT STARTED | V0           |       |
| SQLite migrations          | NOT STARTED | V0           |       |
| Cached reads               | NOT STARTED | V0           |       |
| Local drafts               | NOT STARTED | V0           |       |
| Persistent sync queue      | NOT STARTED | V0           |       |
| Sync engine                | NOT STARTED | V0           |       |
| Stable operationId         | NOT STARTED | V0           |       |
| API idempotency            | NOT STARTED | V0           |       |
| Retry policy               | NOT STARTED | V0           |       |
| Permanent failure handling | NOT STARTED | V0           |       |
| Conflict handling          | NOT STARTED | V0           |       |
| Pending sync UI            | NOT STARTED | V0           |       |
| Manual retry               | NOT STARTED | V0           |       |
| Manual Sync Now            | NOT STARTED | V0           |       |
| Offline listing creation   | NOT STARTED | V0           |       |
| Offline listing editing    | NOT STARTED | V0           |       |
| Offline Interested         | NOT STARTED | V0           |       |
| Offline opt-in             | NOT STARTED | V0           |       |
| Offline relist             | NOT STARTED | V0           |       |
| Offline photo handling     | NOT STARTED | V0           |       |
| Restart recovery           | NOT STARTED | V0           |       |

### Critical Offline Verification

The following workflow must eventually be verified:

```text
Create listing
    ↓
Network unavailable
    ↓
Listing saved locally
    ↓
App closed
    ↓
App restarted
    ↓
Listing still present
    ↓
Network restored
    ↓
Sync occurs
    ↓
Server accepts request
    ↓
Local state updated
    ↓
No duplicate listing created
```

This is a critical MVP acceptance test.

---

# 18. Photo Handling

| Feature                         | Status      | Verification | Notes |
| ------------------------------- | ----------- | ------------ | ----- |
| Photo selection                 | NOT STARTED | V0           |       |
| Image compression               | NOT STARTED | V0           |       |
| Local temporary storage         | NOT STARTED | V0           |       |
| R2/S3 upload                    | NOT STARTED | V0           |       |
| Upload retry                    | NOT STARTED | V0           |       |
| Upload failure handling         | NOT STARTED | V0           |       |
| Server confirmation             | NOT STARTED | V0           |       |
| Cleanup after successful upload | NOT STARTED | V0           |       |

Do not store image binaries directly inside MongoDB unless explicitly approved.

---

# 19. Backend API

| Feature                   | Status      | Verification | Notes |
| ------------------------- | ----------- | ------------ | ----- |
| Next.js application       | NOT STARTED | V0           |       |
| `/api/v1` routing         | NOT STARTED | V0           |       |
| Authentication middleware | NOT STARTED | V0           |       |
| Authorization middleware  | NOT STARTED | V0           |       |
| Zod validation            | NOT STARTED | V0           |       |
| Error handling            | NOT STARTED | V0           |       |
| API pagination            | NOT STARTED | V0           |       |
| Idempotency handling      | NOT STARTED | V0           |       |
| Conflict handling         | NOT STARTED | V0           |       |
| Rate limiting             | NOT STARTED | V0           |       |
| Audit logging             | NOT STARTED | V0           |       |
| Health check              | NOT STARTED | V0           |       |
| API tests                 | NOT STARTED | V0           |       |

---

# 20. Database

Refer to:

`docs/04-database/DATABASE.md`

| Area                 | Status      | Verification | Notes |
| -------------------- | ----------- | ------------ | ----- |
| MongoDB Atlas        | NOT STARTED | V0           |       |
| Mongoose setup       | NOT STARTED | V0           |       |
| User model           | NOT STARTED | V0           |       |
| Village model        | NOT STARTED | V0           |       |
| Listing model        | NOT STARTED | V0           |       |
| Category model       | NOT STARTED | V0           |       |
| Service model        | NOT STARTED | V0           |       |
| Interest model       | NOT STARTED | V0           |       |
| Notification model   | NOT STARTED | V0           |       |
| Consent model        | NOT STARTED | V0           |       |
| Audit model          | NOT STARTED | V0           |       |
| Idempotency records  | NOT STARTED | V0           |       |
| Required indexes     | NOT STARTED | V0           |       |
| Atlas Search indexes | NOT STARTED | V0           |       |

Database implementation must follow `docs/04-database/DATABASE.md`.

---

# 21. Admin Application

| Feature                       | Status      | Verification | Notes |
| ----------------------------- | ----------- | ------------ | ----- |
| Next.js application           | NOT STARTED | V0           |       |
| Admin authentication          | NOT STARTED | V0           |       |
| Coordinator role              | NOT STARTED | V0           |       |
| Super Admin role              | NOT STARTED | V0           |       |
| Village management            | NOT STARTED | V0           |       |
| Proximity management          | NOT STARTED | V0           |       |
| Listing management            | NOT STARTED | V0           |       |
| User management               | NOT STARTED | V0           |       |
| Service management            | NOT STARTED | V0           |       |
| Notification management       | NOT STARTED | V0           |       |
| Platform settings             | NOT STARTED | V0           |       |
| Audit log view                | NOT STARTED | V0           |       |
| Server-side pagination        | NOT STARTED | V0           |       |
| Filtering                     | NOT STARTED | V0           |       |
| Search                        | NOT STARTED | V0           |       |
| Destructive action protection | NOT STARTED | V0           |       |
| Conflict handling             | NOT STARTED | V0           |       |

Admin application must never bypass backend authorization.

---

# 22. Security and Privacy

| Feature                 | Status      | Verification | Notes |
| ----------------------- | ----------- | ------------ | ----- |
| Authentication security | NOT STARTED | V0           |       |
| Authorization           | NOT STARTED | V0           |       |
| OTP rate limiting       | NOT STARTED | V0           |       |
| API rate limiting       | NOT STARTED | V0           |       |
| Input validation        | NOT STARTED | V0           |       |
| Mongo query safety      | NOT STARTED | V0           |       |
| Contact privacy         | NOT STARTED | V0           |       |
| Location privacy        | NOT STARTED | V0           |       |
| Notification privacy    | NOT STARTED | V0           |       |
| Local data minimization | NOT STARTED | V0           |       |
| Secure token storage    | NOT STARTED | V0           |       |
| Admin audit logging     | NOT STARTED | V0           |       |
| Deactivation handling   | NOT STARTED | V0           |       |

Refer to:

`docs/SECURITY_PRIVACY.md`

---

# 23. Testing Status

| Test Area              | Status      | Verification | Notes |
| ---------------------- | ----------- | ------------ | ----- |
| TypeScript checks      | NOT STARTED | V0           |       |
| Lint                   | NOT STARTED | V0           |       |
| Formatting             | NOT STARTED | V0           |       |
| Unit tests             | NOT STARTED | V0           |       |
| API integration tests  | NOT STARTED | V0           |       |
| Mobile tests           | NOT STARTED | V0           |       |
| Admin tests            | NOT STARTED | V0           |       |
| Authentication tests   | NOT STARTED | V0           |       |
| Authorization tests    | NOT STARTED | V0           |       |
| Idempotency tests      | NOT STARTED | V0           |       |
| Conflict tests         | NOT STARTED | V0           |       |
| Offline tests          | NOT STARTED | V0           |       |
| Restart/recovery tests | NOT STARTED | V0           |       |
| Notification tests     | NOT STARTED | V0           |       |
| Security tests         | NOT STARTED | V0           |       |
| End-to-end tests       | NOT STARTED | V0           |       |

---

# 24. Observability and Monitoring

| Feature                         | Status      | Verification | Notes |
| ------------------------------- | ----------- | ------------ | ----- |
| Application logging             | NOT STARTED | V0           |       |
| API error logging               | NOT STARTED | V0           |       |
| Sentry                          | NOT STARTED | V0           |       |
| Sync metrics                    | NOT STARTED | V0           |       |
| API performance monitoring      | NOT STARTED | V0           |       |
| Notification failure monitoring | NOT STARTED | V0           |       |
| Provider failure monitoring     | NOT STARTED | V0           |       |
| Health endpoint                 | NOT STARTED | V0           |       |

Do not log:

* OTPs
* Authentication tokens
* Passwords
* Sensitive personal information
* Full contact information unless necessary
* Sensitive request payloads

---

# 25. Deployment

| Area                             | Status      | Verification | Notes |
| -------------------------------- | ----------- | ------------ | ----- |
| API deployment                   | NOT STARTED | V0           |       |
| Admin deployment                 | NOT STARTED | V0           |       |
| MongoDB production configuration | NOT STARTED | V0           |       |
| R2/S3 production configuration   | NOT STARTED | V0           |       |
| Mobile build configuration       | NOT STARTED | V0           |       |
| Android build                    | NOT STARTED | V0           |       |
| iOS build                        | NOT STARTED | V0           |       |
| Environment secrets              | NOT STARTED | V0           |       |
| Production monitoring            | NOT STARTED | V0           |       |
| Backup/recovery process          | NOT STARTED | V0           |       |

---

# 26. Intentionally Deferred / Future Features

The following features are intentionally outside the current MVP unless explicitly re-approved.

| Feature                     | Status   | Reason                                 |
| --------------------------- | -------- | -------------------------------------- |
| In-app chat                 | DEFERRED | Not required for MVP                   |
| Payments                    | DEFERRED | Gaavli does not control transactions   |
| Delivery management         | DEFERRED | Not required for MVP                   |
| Ratings/reviews             | DEFERRED | Not required for MVP                   |
| CRM                         | DEFERRED | Not required for MVP                   |
| Live transport coordination | DEFERRED | Future module                          |
| Complex transport tracking  | DEFERRED | Future module                          |
| Microservices               | DEFERRED | Modular monolith preferred             |
| Redis/BullMQ                | DEFERRED | Add only when required                 |
| Kafka                       | DEFERRED | Not required for MVP                   |
| Elasticsearch/OpenSearch    | DEFERRED | MongoDB Atlas Search sufficient        |
| Runtime LLM dependency      | DEFERRED | Deterministic implementation preferred |
| Kubernetes                  | DEFERRED | Not required                           |
| GraphQL                     | DEFERRED | REST sufficient                        |

AI coding agents must not implement deferred features unless explicitly instructed.

---

# 27. Known Issues / Blockers

Use this section for currently known blockers or significant implementation issues.

| ID | Issue | Area | Severity | Status | Owner | Notes |
| -- | ----- | ---- | -------- | ------ | ----- | ----- |
|    |       |      |          |        |       |       |

Severity:

* `CRITICAL`
* `HIGH`
* `MEDIUM`
* `LOW`

Do not hide known blockers by changing the feature status to complete.

---

# 28. Technical Debt

Record meaningful technical debt here.

| ID | Area | Technical Debt | Impact | Priority | Status |
| -- | ---- | -------------- | ------ | -------- | ------ |
|    |      |                |        |          |        |

Only record actionable technical debt.

Do not use this section as a general TODO list.

---

# 29. Current Sprint / Active Work

## Current Focus

**Feature / Task:**
**Status:**
**Started:**
**Expected scope:**

### Current Tasks

* [ ]
* [ ]
* [ ]

### Verification Required

* [ ]
* [ ]
* [ ]

### Dependencies / Blockers

*

---

# 30. Recently Completed

Record significant recently completed work.

| Date | Feature / Task | Status   | Verification | Notes |
| ---- | -------------- | -------- | ------------ | ----- |
|      |                | COMPLETE | V            |       |

Keep this section reasonably short.

Older entries should move to the historical log.

---

# 31. Implementation History

Preserve significant status changes here.

Format:

```text
YYYY-MM-DD
Feature:
Previous status:
New status:
Verification:
Summary:
```

Example:

```text
2026-10-10
Feature: Offline listing creation
Previous status: IN PROGRESS
New status: IMPLEMENTED — VERIFICATION PENDING
Verification: V1
Summary: Local SQLite persistence and sync queue implemented. Restart and
offline-to-online verification still pending.
```

Another example:

```text
2026-10-12
Feature: Offline listing creation
Previous status: IMPLEMENTED — VERIFICATION PENDING
New status: COMPLETE
Verification: V4
Summary: Offline creation, app restart, network recovery, server sync and
duplicate prevention verified successfully.
```

Do not remove historical entries when status changes.

---

# 32. Verification Evidence

For important features, record concise evidence of verification.

Example:

```text
Feature: Offline Listing Creation

Verification:
- TypeScript: PASS
- Unit tests: PASS
- API integration tests: PASS
- Android device test: PASS
- Offline → online sync: PASS
- App restart recovery: PASS
- Duplicate prevention: PASS

Verified by:
Date:
Build / commit:
Notes:
```

Do not paste large logs into this document.

Reference the relevant test, issue, PR, commit, or report where available.

---

# 33. Release Readiness

Before an MVP release, review the following.

## Product

* [ ] MVP requirements implemented
* [ ] No critical MVP feature remains incomplete
* [ ] No unauthorized scope has been introduced
* [ ] Deferred features remain deferred

## Authentication

* [ ] OTP flow verified
* [ ] OTP abuse protections verified
* [ ] Session handling verified
* [ ] Logout/deactivation verified

## Marketplace

* [ ] Listing lifecycle verified
* [ ] Ownership verified
* [ ] Duplicate prevention verified
* [ ] Expiry/relist verified
* [ ] Contact/privacy rules verified

## Offline

* [ ] Offline listing creation verified
* [ ] Offline edit verified
* [ ] Interested verified
* [ ] Queue persistence verified
* [ ] App restart verified
* [ ] Retry verified
* [ ] Conflict handling verified
* [ ] Duplicate prevention verified

## Notifications

* [ ] Consent verified
* [ ] Opt-out verified
* [ ] In-app notifications verified
* [ ] WhatsApp/SMS provider behavior verified
* [ ] Digest behavior verified

## Admin

* [ ] Coordinator authorization verified
* [ ] Super Admin authorization verified
* [ ] Destructive action protection verified
* [ ] Audit logging verified
* [ ] Concurrent edit/conflict behavior verified

## Security

* [ ] Authentication tests passed
* [ ] Authorization tests passed
* [ ] Input validation verified
* [ ] Rate limits verified
* [ ] Sensitive logging reviewed
* [ ] Contact/location privacy reviewed

## Production

* [ ] Production environment configured
* [ ] Secrets configured securely
* [ ] Monitoring configured
* [ ] Error reporting configured
* [ ] Database backup/recovery verified
* [ ] Android release build verified

---

# 34. AI Agent Finalization Checklist

Before marking a feature `COMPLETE`, the AI coding agent MUST verify:

### Requirements

* [ ] Relevant requirements document was read
* [ ] Relevant architecture rules were followed
* [ ] No requirement was invented
* [ ] No deferred feature was accidentally implemented

### Implementation

* [ ] Production-quality implementation exists
* [ ] No placeholder/mock implementation remains
* [ ] No unnecessary dependencies were introduced
* [ ] No unrelated refactoring was performed
* [ ] Existing behavior was not unintentionally broken

### Testing

* [ ] Relevant automated tests added/updated
* [ ] Relevant tests pass
* [ ] Error cases considered
* [ ] Authorization/ownership tested where applicable
* [ ] Offline behavior tested where applicable
* [ ] Idempotency tested where applicable
* [ ] Conflict behavior tested where applicable

### Verification

* [ ] Feature was actually verified
* [ ] Verification level recorded
* [ ] Known limitations documented
* [ ] Implementation status updated

### Documentation

* [ ] API_SPEC.md updated if API changed
* [ ] DATABASE.md updated if data model changed
* [ ] OFFLINE_SYNC.md updated if offline behavior changed
* [ ] SECURITY_PRIVACY.md updated if security/privacy behavior changed
* [ ] Relevant AGENTS.md updated if development rules changed
* [ ] IMPLEMENTATION_STATUS.md updated

---

# 35. Rules for AI Agents

AI coding agents MUST:

1. Read `docs/IMPLEMENTATION_STATUS.md` before implementation work.
2. Check whether the requested feature is already implemented.
3. Check whether the feature is marked deferred or blocked.
4. Avoid duplicating existing functionality.
5. Update the status after meaningful implementation work.
6. Preserve historical status information.
7. Record verification honestly.
8. Use `IMPLEMENTED — VERIFICATION PENDING` when implementation exists but verification is incomplete.
9. Use `REWORK REQUIRED` when existing implementation does not meet current requirements.
10. Record blockers instead of pretending the feature is complete.
11. Update related documentation when implementation changes architecture, API, database, security, or offline behavior.
12. Never mark a feature `COMPLETE` based solely on code generation.

AI agents MUST NOT:

* Mark unfinished work as complete
* Delete status history
* Remove blockers to make the project look healthier
* Claim tests passed when they were not run
* Claim manual verification that did not happen
* Treat compilation as feature completion
* Implement intentionally deferred features without approval
* Replace authoritative documentation with assumptions

---

# 36. Definition of "Complete"

A feature is `COMPLETE` only when:

```text
Requirement understood
        ↓
Implementation completed
        ↓
Relevant code reviewed
        ↓
Automated checks/tests passed
        ↓
Relevant edge cases considered
        ↓
Feature behavior verified
        ↓
Related documentation updated
        ↓
Implementation status updated
        ↓
COMPLETE
```

If any required stage is missing:

```text
Do NOT mark COMPLETE
```

Use the appropriate intermediate status instead.

---

# 37. Project North Star

Gaavli is built for real village conditions.

The application should remain:

* Simple
* Lightweight
* Reliable
* Marathi-first
* Useful on low-cost Android devices
* Usable with weak/intermittent networks
* Safe with user data
* Honest about data freshness
* Honest about verification
* Free from unnecessary complexity

The implementation status must reflect reality.

**Code status is not the same as requirement status.**

**A feature is complete only when it works and has been verified.**

```
