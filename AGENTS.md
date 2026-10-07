# Gaavli — Codex Instructions

Codex is the primary coding agent. This file is the authoritative global instruction source; app-specific instructions live in `apps/mobile/AGENTS.md` and `apps/web/AGENTS.md`.

## Product North Star

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
