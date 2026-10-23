# Mobile onboarding — implemented contract (2026-10-13)

## Guest browsing — 2026-10-22

This revision supersedes the registration-before-browsing startup rule below.
Signed-in registration, OTP, sessions and village updates are unchanged.

- Get started saves the language and one active village in SQLite, then opens
  Home. No account is created. A later sign-in still uses the secure session.
- `GET /villages` and `GET /product-master` accept a missing bearer token.
  A present bearer token is still validated. Village and product-master payloads
  stay public reference data.
- `GET /listings` and `GET /listings/:id` accept a guest when `sourceVillageId`
  is an active village. Results use that village's existing discovery scope.
  The 2026-10-23 browsing-village revision also lets authenticated public reads
  use a validated active `sourceVillageId`; omitting it uses the account village.
  This never changes registration or protected-contact scope. Guest pages report
  `isSeller: false`. See [BROWSING_VILLAGE.md](BROWSING_VILLAGE.md).
- Listing responses remain the existing public DTO: product, price, quantity,
  image, description and village. They do not include seller name, phone,
  address or account identifiers. Contact, interest, notify, listing writes and
  buyer activity stay bearer-authenticated.
- Contact seller opens Create account, which asks for first name, last name
  and mobile number before OTP. Sign-in stays mobile-only. After OTP, a new
  account keeps those names and the guest's saved village is confirmed on the
  server. The app then returns to the listing that opened registration, and the
  authenticated contact read shows the seller's phone. A buyer who is already
  signed in sees that phone directly. Back on Create account returns to Home.

This contract supersedes the historical mobile auth examples in API_SPEC.md for
Phases 2–4. All endpoints use `/api/v1`, JSON envelopes `{success:true,data}` /
`{success:false,error:{code,message},requestId}`, and `Cache-Control: no-store`.
Admin cookie authentication and CSRF/origin checks remain separate.

## Registration and verification

- Returning-user revision — 2026-10-21: registration and sign-in both send
  `{mobile,language}`. A verified new number creates an active buyer with no
  names and no village. First and last name are required on the village screen
  and are saved in the same village update. Accounts that already have both
  names keep the village-only update. Existing profile, village and
  capabilities are otherwise unchanged.
- `POST /auth/send-otp` still accepts the older `{firstName,lastName,mobile,language}`
  payload. Both names are trimmed, max 60 characters each (combined display name
  max 100), and accept Unicode letters/marks, spaces, apostrophes, periods and
  hyphens. Language is `mr` or `en`. The mobile app no longer collects names
  before OTP.
- Indian mobile input accepts 10 digits, `+91` or `91` prefix and common spaces,
  hyphens/parentheses. The canonical account key remains 10 digits starting 6–9,
  compatible with existing admin user writes and the unique mobile index.
- Success: `{challengeId,expiresAt,resendAt}`. Never returns or logs an OTP.
- `POST /auth/verify-otp`: `{challengeId,code}` where code is exactly six digits.
- Challenge validity: 5 minutes; resend delay: 60 seconds; max 5 verification
  attempts per challenge. Requests use persistent MongoDB limits: 5 sends per
  phone/hour, 30 sends per network/hour, 100 verifications per network/hour.
  Fixed hourly buckets count unsuccessful send attempts too.
- A unique phone challenge and transactional one-time consumption prevent replay.
  Names live on the temporary challenge until successful verification. New accounts
  are active buyers with `village:null`. No user is created by send-otp.
- Existing mobile identities resume the existing account; names, capabilities and
  village are preserved. Legacy prefixed mobile matches are canonicalized only
  after verification. Ambiguous duplicates fail with `ACCOUNT_CONFLICT`; there is
  no automatic merge or bulk record migration.

## Sessions

2026-10-14 addition: safe user/session DTOs include `isSeller`, derived from
the existing roles. Explicit seller activation and persistence are documented
in `SELLER_ACTIVATION.md`; profile reads, token refresh and village changes
preserve the server-confirmed capability.

Verification and `POST /auth/refresh` return
`{accessToken,refreshToken,accessExpiresAt,user}`. Refresh accepts `{refreshToken}`.
Access tokens are random opaque 256-bit credentials valid 15 minutes. Refresh
tokens are opaque 256-bit credentials with a sliding 90-day inactivity expiry.
Only SHA-256 hashes are stored server-side. Refresh renews the access token and
keeps the refresh secret stable so a response lost on a weak connection can be
retried. Logout revokes both tokens by deleting that session.

`POST /auth/logout` accepts `{refreshToken}` and is idempotent, returning
`{loggedOut:true}`. This endpoint authenticates by possession of the refresh
secret so it also works after access-token expiry. It ignores admin cookies.

`GET /users/me` requires `Authorization: Bearer <accessToken>`. The same bearer
requirement applies to village search and selection. Every authenticated request
checks token expiry, session existence and current active user status. Test-issued
sessions are explicitly tagged and rejected outside development.

The safe user DTO is `{id,name,firstName,lastName,language,village}`; no phone or
admin details. Unknown historical first/last names remain null. The village DTO
is `{id,name,nameMr,taluka,district,pinCode,distanceKm?}`. Inactive/missing saved
villages resolve to null so a refreshed session returns to selection.

## Village selection

- `GET /villages?search=...&page=1&limit=20`: case-insensitive literal search over
  English/Marathi village names, taluka and PIN metadata. Only active villages.
  Page max 10000; limit 1–50. Response `{villages,total,page,limit}`.
- Optional paired `latitude`/`longitude` query values suggest villages within
  50 km ordered by distance, using only existing GeoJSON coordinates and a
  `2dsphere` index. Missing coordinates are excluded from suggestions, remain in
  manual search, and are never invented. This does not create proximity mappings.
- `PATCH /users/me`: `{villageId}` for an account that already has both names.
  A new account must also send `{firstName,lastName}` using the same name rules
  as registration. The update saves the display name, both name fields and the
  confirmed village together. Transactionally rechecks active village
  and user and locks the village using the same version counter as admin writers.
  Saves the confirmed selection and returns the safe user DTO.
- Village selection is online-only in this phase. Repeating the same selection
  safely sets the same village. No offline queue is added to village selection.
  The separate user-approved My Profile flow is documented in
  [MOBILE_PROFILE.md](MOBILE_PROFILE.md); profile Save cannot alter registered
  names or primary mobile and does not change this onboarding contract.
- Admin create/edit accepts optional `pinCode` (six digits, starting 1–9). Empty
  string clears it; omission preserves it on edit. Admin edit may omit both
  coordinates and preserves existing coordinates, so PIN updates never require
  fabricated coordinates. A supplied pair must be valid. Administrators must
  verify all PIN and coordinate metadata independently.

## Errors and deployment

Input failures: `422 VALIDATION_ERROR`. Auth: `401 AUTH_REQUIRED`,
`403 ACCOUNT_UNAVAILABLE`, `409 ACCOUNT_CONFLICT`, `503 AUTH_UNAVAILABLE`.
OTP: `400 OTP_INVALID`, `400 OTP_EXPIRED`, `429 OTP_ATTEMPTS_EXCEEDED`,
`429 OTP_THROTTLED`, `429 RATE_LIMITED`, `503 OTP_DELIVERY_FAILED`.
Selection: `422 VILLAGE_UNAVAILABLE`.

The current provider is **local development only**. Set `OTP_PROVIDER=test`,
`OTP_TEST_CODE` to a six-digit local test value, and `MOBILE_AUTH_SECRET` to a
random server-only secret of at least 32 characters. `NODE_ENV` must equal
`development`. `npm run setup:mobile-auth --workspace=@gaavli/web` adds missing
values to the ignored `.env.local` without overwriting existing values. Restart
Next.js afterward. Test OTP is configured locally, never delivered by SMS.
Real SMS integration is a public-launch gate; production fails closed today.

Native clients use bearer headers and no cookies. Cross-origin browser requests
are rejected; no permissive CORS is added. `MOBILE_TRUST_PROXY=true` is allowed only
behind an edge that overwrites `x-forwarded-for`. Otherwise network throttling
uses one shared fallback identity. Configure request logs to redact location
query parameters; the application does not persist device coordinates.

MongoDB replica-set/Atlas transactions and unique/TTL/geo indexes are required.
Mongoose initialization ensures indexes before accepting mobile auth requests.
Challenge records expire from storage after one day; verification audit events
contain action/challenge ID only and expire after 30 days. TTL cleanup is not
used as the validity check: expiry is checked in every auth query.

## Mobile behavior

Native splash is followed by a cream/green interactive welcome screen with
Marathi/English selection, local lightweight countryside shapes and Get started.
Language is in SQLite. Registration drafts and entered OTPs are memory-only;
back from OTP preserves the mobile number, while successful sign-in/logout clears them.
Credentials and the small last-confirmed user snapshot are one atomic SecureStore
value, never SQLite or persisted Zustand. Failure to save credentials blocks
authenticated navigation and offers a local save retry.

Startup revalidates the saved account when connected and uses the secure snapshot
on a network outage. A verified account without a village resumes Select village.
The confirmed village is restored from the server/secure snapshot on restart.
Logout requires connectivity in this phase so server revocation finishes before
secure local data is cleared. Authenticated query cache is cleared on logout.

Returning-user UI revision — 2026-10-15: successful logout now opens Sign in
directly with only mobile number, Send OTP and a Create an account option. Existing
language preference stays saved. A cold launch with a saved language and no session
also offers Sign in; first welcome still opens registration. Sign in and
registration both ask only for the mobile number. After OTP, a new account
enters first name, last name and village on the village screen. Existing
accounts that already have names only confirm a village. Sign in/registration
can be switched explicitly, clearing any previous OTP challenge. Resend uses the
same mobile-only challenge. Account/profile/listing data remains in MongoDB after logout.

Location requests foreground permission only after the user taps Use current
location; denial, timeout, missing data and zero matches preserve manual village
selection. The mobile UI uses one searchable Village dropdown (user-approved
2026-10-23 revision) with a Marathi/English name search inside the picker,
20 results per page and automatic loading on scroll. Only village names are
shown, except taluka/district distinguish duplicate names in the loaded results.
The closed field shows only the selected name. No separate district/taluka
selectors are added; the existing backend search parameters remain unchanged.
Home, Marketplace and Product Details now use authenticated database listing
reads; see [MOBILE_MARKETPLACE.md](MOBILE_MARKETPLACE.md). No sample fallback exists.

## Verification commands

`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build:web`,
`npm run export:android`, `npm run check:dependencies --workspace=@gaavli/mobile`.
`npm run test:mobile-integration --workspace=@gaavli/web` creates and then removes
an isolated randomly named test database on the configured MongoDB server. It
never inserts test users or villages into the application's configured database.

Device acceptance remains separate: cold launch, Marathi/English, invalid form
fields, OTP retry/back/resend/expiry, secure-store failure, restart before/after
village selection, denied location, airplane-mode recovery, narrow screens and
large system text must be tested on an Android phone/development build.
