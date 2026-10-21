# Marketplace voice search

Marketplace uses `expo-speech-recognition` 57.x with Expo SDK 57. The native
module wraps the device's Android/iOS speech service. No paid AI API, new search
endpoint, account role change or audio upload endpoint is introduced.
Native API and plugin setup follow the
[package's installation and API documentation](https://github.com/jamsch/expo-speech-recognition).

## Flow

The existing microphone requests microphone/speech permission, listens in
`mr-IN` or `en-IN` according to the selected app language, and accepts one final
transcript. While active, the search bar shows a stop icon and a localized
listening/progress row with cancel. Interim results never issue listing queries.
Manual typing or explicit text search cancels recognition. Existing manual
debounce, search styles, empty/error states and village filtering remain.

The existing active Product Master endpoint and validated SQLite reference cache
provide Marathi/English names and contextual hints. A small fallback covers
Tomato/टोमॅटो, Onion/कांदा, Potato/बटाटा and Mango/आंबा if reference data is missing.
Matching uses normalized Unicode text, whole names and simple English plural
forms; the longest named product wins (Sweet Potato before Potato). Common
English/Marathi conversational words are removed for unknown products. This is
deterministic matching, not general language understanding or a translator.

Examples:

- `मला टोमॅटो पाहिजे` → `टोमॅटो` in Marathi, `Tomato` in English.
- `Show me onions` → `Onion` / `कांदा`.
- `बटाटा` → `Potato` / `बटाटा`.
- `आंबा` / `I want mangoes` → `Mango` / `आंबा` and Fruits.

The canonical name populates the same input and immediately sets the existing
search query. A recognized product selects its existing Marketplace group;
groups without a displayed icon use the existing unfiltered group scope. Village
selection is retained. Unknown products keep the current group and use the
cleaned text. The existing no-matching-listings state handles zero results.

## Existing API behavior

`GET /api/v1/listings?search=...` retains its existing literal case-insensitive
AND-of-terms match across productName/productNameMr/description. An exact active
Product Master name adds equivalent matches for the paired English/Marathi
names or saved productId. This permits older single-language listings to match
the other language where an active mapping exists. No historical names or
product IDs are rewritten; unmatched names retain literal behavior.

Mapping happens before pagination, counts and village facets. Existing active
stock, seller, village, category, productGroup, selected-village and own-offer
exclusion rules apply to all alternatives. Inactive catalog mappings do not
expand searches. No private contact/owner fields are added to results.

## Native setup and lifecycle

`apps/mobile/app.json` configures the speech plugin's microphone/speech purpose
strings and Android service visibility. Image Picker's former microphone block
is removed so it cannot override speech access. The checked-in Android manifest
also declares RECORD_AUDIO, the RecognitionService intent and Google service
package visibility. iOS configuration is applied when generating its project.

From the repository root, install dependencies with `npm install`, then build:

```powershell
npm run android --workspace=@gaavli/mobile
```

On this Windows workspace, C: ran out of space during the first native build.
The Gradle 9.3.1 cache created by that build was moved to the ignored repository
`.gradle` folder on E:, with copies of existing wrapper/dependency downloads.
`apps/mobile/metro.config.js` preserves Expo's defaults and excludes `.gradle`
directories so Metro does not crawl native build caches. Keep build caches there when
rebuilding (run from the repository root, with JDK 17 and Android SDK configured):

```powershell
$env:GRADLE_USER_HOME = Join-Path (Get-Location) ".gradle"
npm run android --workspace=@gaavli/mobile
```

For iOS on macOS:

```sh
npm run ios --workspace=@gaavli/mobile
```

Then start Metro with `npm run mobile`. A fresh native development build is
required after this dependency/configuration change. Expo Go and older clients
retain manual search and show a localized build-required message when tapped;
optional module loading avoids a startup crash. No EAS account or cloud build is
required or configured. The device must have an enabled recognizer supporting
the requested locale; network availability/offline language models depend on
that service. Unsupported language/service/network errors offer manual search.

Navigation blur/unmount, backgrounding, language/account/village changes and
manual input invalidate the session, abort recognition and remove listeners.
Pending permission responses and late events cannot submit after cancellation.
New sessions wait for native abort completion, with a bounded fallback if the
service never emits end. Recording is limited to 15 seconds, then up to 5 seconds
for a final result; silent/stuck services return a localized retry message.
Permission errors provide an Open phone settings action. User cancellation is
silent and leaves the prior manual query intact.

## Privacy and verification

Gaavli does not persist recordings (`persist:false`), log raw transcripts, or add
transcript/audio storage. Only the extracted search text reaches the existing
listing API. Recognition itself is managed by the OS-selected speech provider
and may use its network service; offline recognition is not guaranteed. The
existing offline reference cache/listing behavior remains unchanged.

Automated mobile tests exercise the real Product Master vocabulary, normalization,
locale selection, final-only submission, cancellation during permission, ignored
late callbacks, cleanup, restart serialization, bounded timeouts, missing module,
service/permission/error/no-speech cases and localized copy. Listing integration
checks bilingual single-name/linked rows, inactive mappings, pagination and
unchanged visibility/group restrictions in an isolated temporary database.

Verification on 2026-10-21: all 53 mobile tests, listing/Product Master integration,
workspace TypeScript, focused ESLint, Android JS export, Expo permission
introspection and the actual merged manifest passed. The arm64 Android debug
build succeeded; APK: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
The initial C: disk-space failure was recovered using E: build caches as above.
The SDK still reports pre-existing corrupted emulator metadata and Gradle/native
deprecation warnings. Expo dependency checking recommends existing patch upgrades
for expo, expo-constants, expo-linking and expo-router; this feature does not
upgrade those packages. These warnings did not prevent the native build.

Physical-device acceptance must cover both locales, device recognition-service
availability, allow/deny/permanently denied permissions, conversational and direct
product names, no matches, silence, network loss, manual editing, cancellation,
navigation/background changes and large Marathi text. JS export and automated
tests do not establish device recognition accuracy or iOS native build success.
