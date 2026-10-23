> Guest browsing revision — 2026-10-22: Get started saves a language and
> village locally, then opens Home without an account. Create account asks for
> first name, last name and mobile number, then OTP, confirms the saved
> village, and returns to the product that requested seller contact. Signed-in
> buyers see that phone directly. See `docs/03-api/MOBILE_ONBOARDING.md`.

> Returning-user revision — 2026-10-21: registration asks for the mobile number
> only. First and last name are collected on the village screen after OTP.
> Existing named profiles stay unchanged. See `docs/03-api/MOBILE_ONBOARDING.md`.

> Seller revision — 2026-10-14: explicit Home confirmation activates seller on
> the server, preserves buyer, and replaces the visible Marketplace tab with
> My Listings. See `docs/03-api/SELLER_ACTIVATION.md` at repository root.

> Current revision — 2026-10-13, mobile Phases 2–4: welcome language selection
> with Get started → required first/last name and Indian mobile → OTP →
> confirmed village. See `docs/03-api/MOBILE_ONBOARDING.md` (repository root)
> for the implemented API, session, model, offline and security contract.
> This supersedes earlier Phase-1-only/scaffold and mobile guest-first wording.
> Verified users may have no village; existing display names stay intact and
> unknown first/last names are not inferred. Test OTP and test sessions are
> development-only; production requires a real SMS provider.

# Gaavli Mobile — Codex Instructions

Applies to `apps/mobile`. Read the root `/AGENTS.md` and the relevant product, architecture, API, offline, security, UI, and implementation status documents first.

## Stack and Boundaries

- React Native, Expo, TypeScript, Expo Router, Zustand, TanStack Query, Expo SQLite, Expo SecureStore, NetInfo, and Expo Notifications.
- The mobile app is a villager-facing client for buyer, seller, coordinator service-provider,  It consumes the backend through REST/HTTPS/JSON contracts under `/api/v1`.
- Keep the app backend-framework-agnostic. Depend on API contracts, authentication, idempotency, stable error codes, and sync behavior; do not depend on server implementation details.
- SQLite is local/offline storage only. Never connect directly to MongoDB or include server credentials.

## Product and UX

- User-approved 2026-10-22 flow: Marathi/English selection (Marathi default)
  and a village on Get started, then Home without an account. Guests can browse
  active listings. Create account asks for first name, last name and mobile
  number, then OTP. The saved village is confirmed and the app returns to the
  product, where the seller's phone is shown. Signed-in buyers see that phone
  directly. Back from Create account returns to Home.

- Preserve Marathi-first UX, accessible language,  and the approved role/capability rules.
- Offline and low-connectivity states are normal product states. Clearly distinguish local drafts, queued/pending sync, synced, retryable failure, and conflict states.
- Keep user-created drafts recoverable. Sync operations need stable IDs, safe retries, idempotency, conflict handling, and restart recovery. Do not report a queued action as server-confirmed.
- Protect contact information until the approved flow allows access. Respect notification consent and do not use WhatsApp/SMS for automatic marketing.

## Implementation and Security

- Use SecureStore for appropriate credentials/secrets and avoid logging personal or sensitive data.
- Validate API data at boundaries and handle stable API errors explicitly. Preserve pagination and offline compatibility.
- Lovable may provide visual designs and prototypes; production React Native logic is implemented by Codex.
- Add or update focused mobile tests for behavior when the task calls for implementation verification. Report device/network limitations separately from code checks.
