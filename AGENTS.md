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
