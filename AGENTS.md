> Direct login/contact revision - 2026-10-27 (user approved): first Village
> Selection's Login clears prior browsing/product context, then uses the existing
> registered village and opens Home. Contact Seller auth preserves browsing and
> returns to the product. Authenticated seller contact/Call/Notify and consented
> request callbacks are listing-based, without buyer-village/connection gates.
> Listing availability, authentication, privacy, consent and rate checks remain;
> reporting/coordinator scopes are unchanged. See docs/03-api/BUYER_CONTACT.md.

> Single browsing village - 2026-10-26 (user approved): use one persisted mobile
> browsingVillage for guest/signed-in discovery, preserving it through login/OTP.
> Initialize from the registered profile only when no choice exists. Home and
> Marketplace filter to that village using existing APIs. Logout clears it and
> pending product context. This supersedes the earlier registered-village reset
> on login/restart and separate guest-village state; see BROWSING_VILLAGE.md.

> Temporary OTP request-limit bypass - 2026-10-26 (user approved): login and
> registration OTP issuance temporarily bypass phone/network request quotas and
> resend cooldown through OTP_REQUEST_LIMITS_ENABLED=false in server auth policy.
> Verification network/attempt limits, expiry, single use and account checks stay
> enabled. Restore the constant to true after testing. This supersedes older
> request-throttle requirements only; see docs/03-api/MOBILE_ONBOARDING.md.

> Product photo revision - 2026-10-25 (user approved): new optional listing
> uploads use Atlas GridFS in all environments, through the existing Node API and
> Mongo connection. Keep legacy references and originals. Profile photo storage
> is unchanged. See docs/03-api/PRODUCT_PHOTO_STORAGE.md at repository root.

> Logout revision - 2026-10-26 (user approved): logout clears secure/session/auth
> state and local guest/browsing villages, resets navigation to first village
> selection, and ignores login-history flags for signed-out startup routing.
> The village screen has Already Registered? Login below Continue with no village
> prerequisite. This supersedes the 2026-10-25 logout-to-Login rule.
> Login OTP requires an
> existing active account; mobile-only verification never creates an account. New
> devices retain guest village onboarding. See docs/03-api/MOBILE_ONBOARDING.md
> at repository root. This supersedes older mobile-only auto-registration rules.

> Temporary hosted OTP testing — 2026-10-23 (explicitly user approved):
> OTP_PROVIDER=test with OTP_TEST_CODE=123456 is allowed in production for shared
> APK testing, for all mobile numbers. Test sessions authenticate/refresh across
> environments. This supersedes the development-only OTP/session restrictions
> below, not expiry/throttling/account checks or the development-only photo
> provider. No real SMS delivery is implemented. See docs/03-api/MOBILE_ONBOARDING.md.

> Guest browsing revision — 2026-10-22: Get started asks for a village, then
> Home is available without an account. Seller phone numbers stay off guest
> responses. Contact seller opens registration and returns to that product.
> See `docs/03-api/MOBILE_ONBOARDING.md`.

> Returning-user revision — 2026-10-21: new accounts register with mobile + OTP
> only. First and last name are entered on the village screen and saved with
> the confirmed village. Existing named profiles stay unchanged. See
> `docs/03-api/MOBILE_ONBOARDING.md`.

> User-approved seller revision — 2026-10-14: Home's Become a Seller confirmation
> activates the existing seller capability before a first listing is published.
> Buyer capability and protected contacts remain intact. Sellers see My Listings
> instead of the Marketplace tab; marketplace browsing remains accessible on Home.
> See `docs/03-api/SELLER_ACTIVATION.md`. This supersedes first-listing-only activation.

> Current revision — 2026-10-13, mobile Phases 2–4: welcome language selection
> with Get started → required first/last name and Indian mobile → OTP →
> confirmed village. See `docs/03-api/MOBILE_ONBOARDING.md` (repository root)
> for the implemented API, session, model, offline and security contract.
> This supersedes earlier Phase-1-only/scaffold and mobile guest-first wording.
> Verified users may have no village; existing display names stay intact and
> unknown first/last names are not inferred. Test OTP and test sessions are
> development-only; production requires a real SMS provider.

# Gaavli — Codex Instructions

Codex is the primary coding agent. This file is the authoritative global instruction source; app-specific instructions live in `apps/mobile/AGENTS.md` and `apps/web/AGENTS.md`.

## Product North Star

User-approved mobile revision — 2026-10-22: guests choose a language and
village on Get started, then browse active listings. Registration is required
only to contact a seller, and a completed registration returns to that product.
This supersedes the 2026-10-13 registration-before-browsing rule for mobile.
Buyer, seller and coordinator capabilities are unchanged for signed-in accounts.

Gaavli connects villagers directly. It does not control transactions. Preserve guest browsing, protected contact details, buyer as the default capability, seller capability through listing creation, administratively granted coordinators, structurally separate Super Admin, manually authoritative village proximity, self-declared services, consent-aware notifications, Marathi-first UX, and offline-first behavior. The product has no payments, chat, delivery management, ecommerce checkout, or runtime LLM dependency for deterministic MVP features.

## Approved Architecture

- npm workspaces monorepo; npm is the only package manager. Use `package-lock.json`. Do not use pnpm, Yarn, or introduce Nx, Lerna, Rush, or Turborepo.
- Final application targets are `apps/mobile` (React Native, Expo, TypeScript, Expo Router) and `apps/web` (Next.js, TypeScript, REST API, Admin UI, server-side application layer).
- Mobile consumes stable REST/HTTPS/JSON endpoints under `/api/v1`. Next.js Route Handlers are transport adapters; reusable services own business rules.
- Server layering: Route Handler → authentication → authorization → Zod validation → application service → repository/provider → MongoDB or external provider.
- MongoDB Atlas, Mongoose, and Atlas Search remain server-only. Use Node.js runtime for Mongoose-backed routes unless another runtime is explicitly validated. Never import Mongoose, repositories, secrets, or server-only services into Client Components.
- Preserve shared packages `packages/types`, `packages/validation`, `packages/constants`, and `packages/utils` with dependency direction `apps → packages`.
- Keep offline queue, stable operation IDs, idempotency, retry, conflict handling, restart recovery, and server authority intact. Mobile SQLite is local/offline storage; it is separate from Next.js caching.
- Keep the architecture a modular monolith. Do not add infrastructure or technologies without an approved need. Preserve provider abstractions, Cloudflare R2/AWS S3, and Sentry.
- Lovable is for UI/UX design and prototypes only. Codex implements production code.

## Reading Order

1. `/AGENTS.md`
2. `/docs/01-product/PROJECT_REQUIREMENTS.md`
3. `/docs/02-architecture/ARCHITECTURE.md`
4. `/docs/03-api/API_SPEC.md`
5. `/docs/04-database/DATABASE.md`
6. `/docs/OFFLINE_SYNC.md`
7. `/docs/SECURITY_PRIVACY.md`
8. `/docs/06-ui/UI_UX_PRD.md`
9. `/docs/05-development/AI_DEVELOPMENT_RULES.md`
10. `/docs/IMPLEMENTATION_STATUS.md`
11. Applicable local `AGENTS.md`
12. Existing implementation
13. Current task

Before working under `apps/mobile`, read `apps/mobile/AGENTS.md`. Before working under `apps/web`, read `apps/web/AGENTS.md`.

## Workflow and Scope

- Inspect the existing implementation and relevant docs before changing anything. Keep changes focused and preserve unrelated work.
- Treat product requirements as authoritative for product behavior, architecture docs for system design, API and database specs for their contracts, and security/privacy rules for protection behavior.
- Do not implement an undocumented product change. Record required code migration or unfinished work in `docs/IMPLEMENTATION_STATUS.md` rather than claiming it is done.
- Validate only what is relevant to the task and report what was actually checked. Never claim an unrun test or an unverified implementation is complete.
- Update implementation status after significant implementation work. Keep documentation-only changes from implying application implementation.
- Do not install dependencies or add infrastructure without need and approval.

## Definition of Done

The requested change matches the approved product and architecture, respects server/client and privacy boundaries, preserves offline-first behavior, has relevant verification recorded honestly, and includes a concise report of files changed, checks performed, and remaining work.
