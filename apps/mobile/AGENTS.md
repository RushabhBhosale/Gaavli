# Gaavli Mobile — Codex Instructions

Applies to `apps/mobile`. Read the root `/AGENTS.md` and the relevant product, architecture, API, offline, security, UI, and implementation status documents first.

## Stack and Boundaries

- React Native, Expo, TypeScript, Expo Router, Zustand, TanStack Query, Expo SQLite, Expo SecureStore, NetInfo, and Expo Notifications.
- The mobile app is a villager-facing client for buyer, seller, service-provider, and guest flows. It consumes the backend through REST/HTTPS/JSON contracts under `/api/v1`.
- Keep the app backend-framework-agnostic. Depend on API contracts, authentication, idempotency, stable error codes, and sync behavior; do not depend on server implementation details.
- SQLite is local/offline storage only. Never connect directly to MongoDB or include server credentials.

## Product and UX

- Preserve Marathi-first UX, accessible language, guest browsing, and the approved role/capability rules.
- Offline and low-connectivity states are normal product states. Clearly distinguish local drafts, queued/pending sync, synced, retryable failure, and conflict states.
- Keep user-created drafts recoverable. Sync operations need stable IDs, safe retries, idempotency, conflict handling, and restart recovery. Do not report a queued action as server-confirmed.
- Protect contact information until the approved flow allows access. Respect notification consent and do not use WhatsApp/SMS for automatic marketing.

## Implementation and Security

- Use SecureStore for appropriate credentials/secrets and avoid logging personal or sensitive data.
- Validate API data at boundaries and handle stable API errors explicitly. Preserve pagination and offline compatibility.
- Lovable may provide visual designs and prototypes; production React Native logic is implemented by Codex.
- Add or update focused mobile tests for behavior when the task calls for implementation verification. Report device/network limitations separately from code checks.
