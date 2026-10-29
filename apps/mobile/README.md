# Gaavli mobile — onboarding Phases 1–4

Expo SDK 57, React Native, TypeScript and Expo Router. The implemented flow is
welcome + Marathi/English selection → Get started → first name/last name/mobile →
OTP → village selection → buyer dashboard. Home, Marketplace and Product Details
now load listings through authenticated database-backed APIs without sample fallback.
Marathi is the default. No guest entry point. Android first, iOS-compatible code.

## Shared visual theme

`src/theme.ts` is the single source for mobile colours, corner radii, spacing,
content width and interaction opacity. The village palette is used across welcome,
registration, OTP, village, home and startup/error screens. The latest buyer
dashboard palette is primary `#8BC34A`, cream `#FFFDF7`, light green `#F4F9EC`,
soft green `#B7DC7A` and yellow `#F6C94C`. Primary buttons use readable `#2F3A2F`
text on the light-green surface.

Reuse `Button`, `Input`, `Card`, `BackButton`, `DropdownField`, `ActionCard`,
`LocationPin`, `OfflineBanner` and `Screen` from `src/components/ui.tsx` rather
than copying their styles into screens. `Input` applies the shared focus border;
buttons/cards handle busy, disabled and pressed states. Screens keep their own
layout and navigation logic. Update theme tokens to adjust the app-wide palette.

## Buyer dashboard and marketplace

Marketplace voice search uses the device speech recognizer in Marathi/English.
Rebuild the development app after installing dependencies; Expo Go keeps manual
search but cannot run this native feature. Permissions, setup, phrase matching,
privacy and device verification are documented in
[`docs/03-api/VOICE_SEARCH.md`](../../docs/03-api/VOICE_SEARCH.md).

`src/screens/HomeScreen.tsx` is reached after the existing account/village flow.
The four native Expo Router tabs are Home, Marketplace, My Activity and Profile.
Expo Router uses React Navigation; there is no second navigation container.

- `src/listings.ts` loads authenticated database listing page/detail DTOs. The
  adapter in `src/data/listings.ts` keeps actual values, null rates and stored units.
  `mockHomeData.ts` remains a historical fixture for tests, not a live data source.
- `src/components/dashboard` contains reusable header, product, navigation,
  seller, coordinator and section components. `HomeDashboard` accepts data as a
  prop supplied by the database adapter.
- Seller actions read the account's current database role from the page response.
  No coordinator/contact sample is substituted for missing live integration.
- Product cards and View All open live Marketplace/Product Details screens.
  Seller contact requests remain unconnected; no sample phone is offered.
- Seller creation/insights, services, transport, village information and activity
  destinations are labelled future-phase previews. Profile retains real language
  persistence, village change and server logout.
- Product thumbnails are local WebP assets (~190 KB total); provenance and exact
  prompts are in `assets/products/ARTWORK.md`. Ionicons is imported directly to
  avoid adding every vector-icon font to the bundle.

Photo URLs now render on listing cards/details with an error placeholder. Explicitly
seeded Narayangaon demo products show translated demo labels and sample imagery;
the records and photo keys are in MongoDB, image bytes are served by the backend.
Production uses the server `LISTING_PHOTO_BASE_URL` for public R2/S3/CDN objects.

Coordinator assignment/contact authorization, listing writes, interest history,
seller photo uploads, nearby village mappings and durable offline reads remain future
work. Database-empty states never seed sample data. Current APIs cover the confirmed
village only. Device checks should cover pagination/search, tabs/back navigation,
large Marathi text and offline recovery. Full contract and integration-test command:
`docs/03-api/MOBILE_MARKETPLACE.md` at the repository root.

## Run locally

Dependencies are installed from the repository root only when needed:
`npm install`. This is one npm workspace with one root lockfile.

From `E:\Gaavli`:

```powershell
npm run setup:mobile-auth --workspace=@gaavli/web
npm run dev:web
```

The setup command adds missing local development OTP settings to the ignored
`apps/web/.env.local`; existing values are preserved. Use the locally configured
`OTP_TEST_CODE` to verify: this provider does not send SMS. Restart Next.js after
environment changes. MongoDB Atlas/replica-set transactions are required.

Set `apps/mobile/.env.local` from `.env.example` if absent. Its public
`EXPO_PUBLIC_API_BASE_URL` must point to the backend's full `/api/v1` URL.
On a physical phone use your PC's LAN IP, for example
`http://192.168.1.6:3000/api/v1`, with both devices on the same Wi-Fi. Android
emulator uses `http://10.0.2.2:3000/api/v1`. `localhost` on a phone is the phone.
Allow Node's development ports on the Windows private network if needed.
Restart Metro after environment changes. Deployed builds require HTTPS.

For an Android phone connected by USB, use
`EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1`. Keep the backend running
with root `npm run dev:web`. Run `npm run mobile:usb` after reconnecting/restarting
the phone or adb: it restores API port 3000 and Metro port 8081 and checks API
health. `npm run dev:mobile:usb` performs those checks and starts Metro for the
native development client on localhost. It sets the local API URL for that Metro
process without modifying `.env.local`. Install the debug development build first;
open Gaavli rather than Expo Go. This supports native speech recognition and
React Native debugging. Shake the phone to open the developer menu and choose
Open DevTools for JavaScript breakpoints/console; Android Studio Logcat shows
native speech events. The Metro terminal's `j` shortcut also opens DevTools.
USB debugging must be accepted on the phone. If several devices are connected,
set `ANDROID_SERIAL` to the intended device. A port-8081 mapping alone allows the
bundle to load but cannot connect the app to the API on port 3000.

For a quick preview using a matching Expo Go Android app:

```powershell
cd E:\Gaavli
npm run dev:mobile:go
```

Scan the QR code in Expo Go.

If Metro reports `Unable to resolve "../../App"` from `expo/AppEntry.js`, stop the
old server with Ctrl+C and run the workspace command above. Plain `npx expo start`
from the repository root loads the root package instead of the mobile package.
The mobile entry is already `expo-router/entry`; no root `App.tsx` is needed.

For native acceptance, install/rebuild the development
client (requires Android SDK locally, or a separately configured EAS cloud build):

```powershell
npm run android --workspace=@gaavli/mobile -- --device
```

On this Windows workspace, use Java 17 and the existing E: Gradle cache when
building (the machine's older JAVA_HOME may otherwise select Java 15):

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'
$env:GRADLE_USER_HOME = 'E:\Gaavli\.gradle'
cd E:\Gaavli\apps\mobile\android
.\gradlew.bat app:assembleDebug -PreactNativeArchitectures=arm64-v8a
adb install -r app\build\outputs\apk\debug\app-debug.apk
cd E:\Gaavli
npm run dev:mobile:usb
```

The architecture above targets the connected arm64 phone. Keep the backend on
port 3000 running. After installation, root `npm run mobile` starts the regular
development-client Metro server; `npm run dev:mobile:usb` also configures USB.
Rebuild native clients
after adding Expo Location or changing permission configuration. No EAS project,
publishing, SMS subscription or paid service was configured by this work.

## Persistence and security

- SQLite stores the confirmed language. Registration drafts and OTP input stay
  in memory; back navigation from OTP preserves entered names/mobile.
- SecureStore stores one validated session value and the confirmed user/village
  snapshot. Successful storage precedes authenticated navigation.
- Startup resumes Select village for a verified user without one. Village
  confirmation saves on the server before updating the secure local snapshot.
- Server availability is required for sending/verifying OTP, searching/saving
  villages and logout. Network failures keep drafts and show retry states.
- Location is foreground-only, user-triggered, suggestions-only and not stored.
  Denied permission/timeouts/no coordinate matches leave manual search available.
- PIN codes and coordinates must be verified by an admin. Missing values are
  never fabricated. Admin Edit Village now includes an optional PIN field.
- Test OTP and its issued sessions are rejected outside development. A real SMS
  provider is required before public release. No general offline sync queue yet.

## Verification

From the root: `npm run typecheck`, `npm run lint`, `npm run test`,
`npm run build:web`, `npm run export:android`, and
`npm run check:dependencies --workspace=@gaavli/mobile`.

`npm run test:mobile-integration --workspace=@gaavli/web` exercises the backend
against a fresh temporary database on the configured MongoDB server and removes
that database afterward. App records are untouched. With Next.js running,
`node scripts/verify-mobile-http.mjs` checks HTTP validation and authorization.

Phone checks remain pending: cold launch, switching Marathi/English, inline form
errors, OTP incorrect/expiry/resend/back, secure-storage failures, restart before
and after village selection, location denial/timeouts, offline recovery and large
text/narrow screens. An Android bundle export alone does not verify native behavior.

See [the implemented API contract](../../docs/03-api/MOBILE_ONBOARDING.md) and
[implementation status](IMPLEMENTATION_STATUS.md).
