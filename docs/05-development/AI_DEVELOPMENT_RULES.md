# AI Development Rules

These rules apply to Codex, the project's primary coding agent. The root [`AGENTS.md`](../../AGENTS.md) is the authoritative global instruction file; app-specific rules are in [`apps/mobile/AGENTS.md`](../../apps/mobile/AGENTS.md) and [`apps/web/AGENTS.md`](../../apps/web/AGENTS.md).

## Before changing code

1. Read root `AGENTS.md` and the documents in its reading order.
2. Read the applicable local `AGENTS.md` before working in an app.
3. Read `docs/IMPLEMENTATION_STATUS.md` and inspect the current implementation.
4. Trace the relevant data, API, database, and UI paths before editing.
5. Keep the change focused and preserve unrelated work.

## Approved architecture

- The target is an npm workspaces monorepo using `package-lock.json`. Use npm commands (`npm install`, `npm run dev`, `npm run build`, `npm run test`, `npm run lint`, `npm run typecheck`) only when those scripts exist. Examples may scope a script with `--workspace=apps/web` or `--workspace=apps/mobile`.
- Do not use pnpm or Yarn. Do not introduce Turborepo, Nx, Lerna, Rush, or another orchestrator without explicit approval.
- The app targets are `apps/mobile` (React Native + Expo + TypeScript + Expo Router) and `apps/web` (Next.js + TypeScript, Admin UI, REST API, and backend services).
- Mobile consumes stable REST/HTTPS/JSON APIs under `/api/v1`. Do not replace Mobile APIs with Server Actions.
- Next.js Route Handlers are thin transport adapters. Use reusable application services and repositories for business rules and data access.
- Server flow: Route Handler → authentication → authorization → Zod validation → application service → repository/provider → MongoDB Atlas or external provider.
- Mongoose, MongoDB connections, repositories, secrets, and server-only services must never enter Client Components. Use Node.js runtime for Mongoose-backed Route Handlers unless another runtime has been validated.
- Shared packages are `packages/types`, `packages/validation`, `packages/constants`, and `packages/utils`. Apps may import packages; packages must not import apps. Avoid cycles and secrets in shared packages.
- Preserve modular monolith, offline-first behavior, server authority, provider abstractions, and the approved product scope. Do not add unapproved infrastructure or runtime LLM dependencies.

## Product and design boundaries

Gaavli connects people and leaves transactions between them. Preserve guest browsing, protected contact information, approved roles, manually authoritative village proximity, self-declared services, consent-aware notifications, and Marathi-first offline UX. There are no payments, chat, delivery management, or ecommerce checkout in scope.

Lovable is UI/UX design-only. It may provide screen designs, navigation concepts, layouts, component designs, states, responsive behavior, prototypes, and a visual design system. It must not implement production application logic, APIs, database access, authentication, offline sync, notifications infrastructure, storage, or search. Codex implements production software.

## Implementation status and verification

- Update `docs/IMPLEMENTATION_STATUS.md` after significant implementation work. Record planned work, implementation, and verification accurately; never mark work complete without code and appropriate verification.
- Do not claim code migration based on a documentation decision. Record required migration work instead.
- Do not install packages or modify lockfiles unless the task explicitly requires implementation work and the dependency is needed.
- Run relevant verification when requested or required by the task. Report the exact checks performed and any limits; do not claim tests that were not run.
- Review the diff for scope, product changes, server/client boundaries, and accidental changes before reporting completion.
