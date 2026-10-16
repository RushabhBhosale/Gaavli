# Listing CRUD backend compatibility — 2026-10-14

Server create/edit/deactivate/owned reads/sold-out/relist APIs are implemented;
their current contract is `docs/03-api/LISTING_CRUD.md` at repository root. Mobile
existing reads support explicit-null standing expiry and saved minimum/fulfillment
values in Product Details. No mobile seller write form, queue or conflict UI is
connected by this backend task. Mobile TypeScript/lint and 17 regression tests
passed; native acceptance remains pending.

# Product details layout — 2026-10-14

Applied the user reference structure in the existing theme with one language,
small product image/name/rate row, quantity/village chips, purchase/delivery panels
and seller/actions section. No posting time. Missing API fields show not provided;
contact and notification actions remain disabled pending their protected APIs.
Mobile TypeScript, lint, formatting and 17 existing tests passed; phone visual and
large-text acceptance are pending. No database or backend behavior was changed.

# Database listing photos — 2026-10-14

Home, Marketplace and Product Details render API photo URLs, resolving local
development paths against the configured backend origin. Failed/missing images
show a leaf placeholder. Narayangaon has five user-requested database demo products
with sample image references and translated demo labels. No local listing fallback
is introduced. Mobile/web TypeScript/lint, 17 mobile tests, isolated photo-route
integration, web build and Android export passed. Actual seeded database DTOs and
all five HTTP photo responses were verified. Phone visual/offline photo checks,
seller uploads and production object hosting remain pending.

# Database-only listing reads — 2026-10-14

Home, Marketplace and Product Details use bearer-authenticated database page/detail
APIs. Removed live sample listing/coordinator/contact fallback; rate/unit/name/null
fields are preserved. Search/category filters and pagination run on the server;
Home shows the latest five and the actual database total. Loading, empty, retry,
pull-to-refresh and offline freshness states are implemented. Expired memory-cached
data is hidden using a 30-second/foreground clock.

Mobile TypeScript/lint and 16 tests passed; web TypeScript/lint, 10 tests,
production build and isolated MongoDB listing-route integration passed. Android
bundle export also passed.
Phone checks, durable SQLite reads, listing writes, nearby mappings, photos,
coordinator data and protected contact requests remain pending. Contract:
`docs/03-api/MOBILE_MARKETPLACE.md` at the repository root.

# Previous branding restored — 2026-10-13

Reverted the user-provided Marathi PNG logo integration, its size changes and the
subsequent compact-layout changes at the user's request. Welcome again uses the
previous leaf/sun/fields image and Gaavli title; registration/startup use the
previous native Brand component. Restored prior screen/form spacing, Expo icon
and splash configuration, Android artwork/resources and brand generator. Removed
the replacement component, PNG derivatives and preparation script. The original
user image in Downloads is untouched. The retired artwork document is historical.

Retained Expo workspace startup correction and existing onboarding/dashboard/API
work. Checks: mobile TypeScript, lint, formatting and Android export passed;
export includes the previous welcome mark and no replacement logo assets. Native
splash artwork was inspected; phone and native rebuild verification are pending.
The following logo/compact-layout entries are superseded by this restoration.

# Compact welcome and registration spacing — 2026-10-13

Grouped welcome branding/copy/button, reduced divider and vertical padding, and
scaled the farm footer down on shorter screens or with enlarged text. Registration
places back/logo on one row and uses reusable compact Screen/Input styles: 12 dp
screen gaps, 6 dp label gaps and minimum 48 dp inputs. Intro text and privacy copy
have tighter spacing. Removed scroll bounce/overscroll and indicators; genuine
overflow remains accessible when the keyboard, validation errors or enlarged text
need additional space. Existing current logo source/size is retained.

Checks: mobile TypeScript, lint and Android export passed. Native phone fit,
keyboard and large-text checks remain pending. No dependencies or API changes.

# Expo workspace startup correction — 2026-10-13

Added `start:go` (`expo start --go --clear`) and root `dev:mobile:go` to reliably
launch the mobile workspace. The reported `../../App` resolution error came from
the live server serving the monorepo root's default `expo/AppEntry`, rather than
the mobile package's existing `expo-router/entry`.

Restarted the identified server using the new root command. Verified Router entry
in its manifest and successful Android development bundle HTTP 200 (1,395
modules); package formatting passed. Device launch remains pending. No new
dependencies, root App component or custom Metro configuration.

# User-provided mobile logo — 2026-10-13

Replaced the welcome mark and generated registration/startup branding with one
reusable `GaavliLogo` component using the supplied green-and-gold Marathi logo.
Prepared a transparent cutout and local icon/adaptive-icon derivatives. Expo
configuration and existing Android launcher/splash resources use the new logo.
The Marathi wordmark stays intact in either interface language; duplicate Latin
title removed from welcome. Other screen layout/theme and onboarding are retained.

Checks: mobile TypeScript, lint, Android export and asset dimension/transparency
inspection passed. Logo and derived icon/splash artwork visually inspected.
Physical-device appearance and a native rebuild remain pending. No dependency or
backend changes. Source, edit prompt and regeneration instructions:
`assets/LOGO_ARTWORK.md`.

# Home dashboard layout refinement — 2026-10-13

Moved coordinator information below the village header with a compact right-side
Call button, replacing the separate coordinator card. The translated Buyer/Seller
badge appears beside the saved-name greeting. Become Seller or seller dashboard
actions now appear below the village exploration cards. Shared theme and existing
sample-contact confirmation are retained.

Checks: mobile TypeScript, lint and all 14 existing mobile tests passed. Native
phone visual and large-text checks remain pending. No dependencies or backend
changes were needed.

# Buyer dashboard preview — 2026-10-13

Implemented `src/screens/HomeScreen.tsx`, modular dashboard components, typed
fixtures, Marathi/English messages and the requested light palette through the
shared theme. The real selected village/name is used with labelled sample product
and coordinator content. Horizontal product cards, Marketplace, buyer/seller
conditional cards and village navigation are connected to routes. Native Expo
Router tabs supply Home/Marketplace/Activity/Profile with safe-area and large-text
spacing. Product Details → Seller Contact works for sample IDs; invalid IDs render
unavailable. Dialer links require sample-contact confirmation. Seller notification
is explicitly unimplemented; no fake request is recorded. Future feature routes
are labelled previews. Profile retains real language/village/logout behavior.

Added Expo-compatible `@expo/vector-icons`/`expo-font` with the root npm lockfile.
Five local product thumbnails (~190 KB total) and prompts are in `assets/products`.
Icons use a direct Ionicons import. No backend services/models or role/account
records changed. Live listing/capability/coordinator/contact/notification APIs,
seller writes and durable offline listing storage remain pending.

Checks: mobile TypeScript/lint, 14 mobile tests, Expo dependency compatibility,
Android export and web TypeScript passed. Native phone UI/navigation/dialer/large-
text checks remain pending. Tests cover fixture identity boundaries, missing
legacy names, route ID handling and translated interpolation in addition to the
existing onboarding/API checks. Export is compilation evidence, not device proof.

# Shared village theme — 2026-10-13

Centralized the village palette, radii, spacing and interaction states in `src/theme.ts`. All mobile screen/component colour literals now live there. Updated common buttons, inputs (including focus borders), cards and text styles; extracted reusable back arrows, dropdown field, action card, location pin and offline banner. Welcome, registration, OTP, village, home and startup use the shared styling. The village screen no longer maintains duplicate button/form/card styles. Registration and OTP use the same back-arrow control.

Verified mobile TypeScript, lint, all 10 existing tests and Android bundle export. Physical-device visual/large-text checks remain pending. No dependencies added.

# Village dropdown screen — 2026-10-13

Village selection now uses one rounded dropdown, a location-pin card, Continue and a local rural sunrise illustration on a cream background. Search input/button are removed; no district/taluka fields are added. The choice sheet supports pagination and retry. Location suggests choices, with manual dropdown fallback after denial, failure or no nearby results. Saving still revalidates through the existing API and SecureStore session flow.

Verified TypeScript, lint, all 10 existing mobile tests and Android export (including the 81KB illustration). Native visual, dropdown interaction and location-permission checks remain pending. Asset provenance: `assets/VILLAGE_ARTWORK.md`.

# Welcome artwork — 2026-10-13

Cream welcome screen now includes top-right Marathi/English pills, local generated leaf/sun logo, translated supporting copy and a rounded rural illustration sized to roughly one third of screen height. Get started still persists language and opens registration. Content scrolls on short screens or with enlarged text while the language header stays visible. Native splash artwork changes require a native rebuild.

TypeScript, lint, all 10 existing mobile tests and Android bundle export pass. Physical-device visual checks remain pending. Artwork paths and prompts are recorded in `assets/WELCOME_ARTWORK.md`.

# Mobile Phases 2–4 — 2026-10-13

Status: **IMPLEMENTED — VERIFICATION PENDING** (native device acceptance).

Welcome now combines branding, Marathi/English choice and Get started. The
registration scaffold has been replaced with required names/mobile, local/shared
validation, API send/retry/loading, six-digit OTP, resend timer and error states.
Back from OTP retains draft details. SecureStore stores the issued session before
navigation. Startup resumes village selection until the server confirms a village.
Village search supports PIN/taluka/name, paginated results, optional foreground
location suggestions and explicit selection/confirmation. The saved village
survives through the server and secure snapshot. Products remain next-phase work.

Backend APIs, safe shared schemas/types, nullable village compatibility, separate
name fields, existing-account resumption, protected mobile sessions, test-only OTP,
and admin PIN editing are implemented. See
[the complete contract](../../docs/03-api/MOBILE_ONBOARDING.md).

Checks performed: 10 mobile + 10 web unit tests, TypeScript, lint, Expo dependency
compatibility, Android Hermes export and Next.js production build passed. Isolated
MongoDB integration passed (including OTP races, repeat login, session lifecycle,
legacy compatibility and village searches); temporary DB removed. Nine live HTTP
validation/authorization/cache checks passed. Local environment configured for
physical-phone LAN access and development OTP; no real SMS provider configured.

Pending: Android development-build installation, screenshots/large text, device
permission denial/location timeout, real SecureStore/SQLite writes, force-stop and
restart recovery, airplane-mode transitions, iOS. No device was attached.
Production refuses test authentication; real SMS remains a launch gate.

## Historical Phase 1 record

# Mobile Phase 1 — 2026-10-13

Status: **IMPLEMENTED — VERIFICATION PENDING**.

## Delivered

- Expo SDK 57, React Native 0.86.3, TypeScript and Expo Router.
- Native splash/brand, lightweight green/cream components and system fonts.
- Marathi/English selection; Marathi default, confirmed choice stored in SQLite.
- Startup restoration before translated navigation; storage errors offer retry.
- Registration scaffold only, with no guest route or simulated authentication.
- TanStack Query, Zustand, NetInfo/AppState, SQLite and SecureStore helpers.
- Validated REST client, configured `/api/v1` base, timeout/cancellation/errors.
- Development-only health diagnostics with a real protected-backend integration check.
- npm workspaces, shared safe packages, one root lock and documented device setup.

## Verification

- Shared/mobile/web TypeScript: PASS.
- Mobile tests: PASS, 6 tests (translations, language restoration/navigation,
  persistence failure/retry, API validation/errors, URL configuration and cancellation).
- Existing web tests: PASS, 6 tests.
- Expo native dependency compatibility: PASS.
- Android Metro/Hermes export: PASS, 1,449 modules; JS bytecode 3.7 MB.
- Existing web production build: PASS, including `/api/v1/health`.
- Live health/mobile client/admin protection check: PASS.
- Root workspace lint: PASS for mobile and existing web app.
- Targeted formatting and `git diff --check`: PASS.

Tests use a storage interface for preference behavior; they do not exercise native
SQLite/SecureStore. No connected Android device/emulator was available. Native
development build installation, actual language persistence after force-stop,
offline launch, narrow-screen/large-text UI, and iOS testing remain pending.
Bytecode size is not install/APK size.

Initial sandboxed worker checks failed with EPERM; approved test/export/build
reruns passed. npm install preserved the existing web lock entries. It reported
32 transitive vulnerabilities (11 moderate, 21 high); no automatic audit fix or
unapproved dependency upgrade was applied. A subsequent offline metadata-only
install is not a fresh security audit. Windows reported locked obsolete native
module cleanup files while an existing web server was running; installation
completed successfully and the rebuilt application passed its checks.

## Next phase

Implement required first/last name/mobile registration and real OTP/session
behavior. Migrate existing names compatibly and allow verified accounts before
village selection. Village lookup/PIN/location, products, notifications and
offline write synchronization remain later phases.
