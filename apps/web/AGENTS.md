# Gaavli Web — Codex Instructions

Applies to `apps/web`, which contains the Next.js Admin UI and the REST API/backend. Read root `/AGENTS.md` and the relevant architecture, API, database, security, and implementation status documents before changes.

## Server Architecture

- Use Next.js Route Handlers for stable Mobile REST/HTTPS/JSON endpoints under `/api/v1`. Do not replace Mobile APIs with Server Actions.
- Keep Route Handlers thin. Preferred flow: Route Handler → authentication → authorization → Zod validation → reusable application service → repository/provider → MongoDB or external provider.
- Server Components, Admin flows, and Route Handlers must reuse the same application services, authorization, validation, and business rules. Server Actions may be used selectively for Admin-only flows and must not bypass these controls or audit requirements.
- Keep Mongoose, MongoDB connections, repositories, provider credentials, secrets, and server-only services out of Client Components. Use `server-only` or equivalent safeguards where useful.
- Use Node.js runtime for Mongoose-backed handlers unless another runtime has been explicitly validated. Handle connection reuse appropriately in the Next.js runtime.
- MongoDB Atlas is server-authoritative. Never return raw Mongoose documents as API DTOs; map to explicit safe DTOs.

## Security, Caching, and APIs

- Validate every Route Handler input with Zod or the approved shared schemas. Authenticate and authorize protected operations on the server; UI role checks are not security controls.
- Keep secrets out of client bundles and `NEXT_PUBLIC_*`; every `NEXT_PUBLIC_*` value is public. Apply deliberate CORS for Mobile API access, secure cookies for browser-session auth, and CSRF protection where applicable. Do not invent a new auth model.
- Do not publicly cache authenticated, private, Admin, contact, consent, notification, or authentication data. Cache public reference data deliberately; honor listing/search freshness. Next.js caching is separate from Mobile SQLite offline caching.
- Preserve REST, JSON, `/api/v1`, DTOs, pagination, stable errors, idempotency, and conflict behavior. Server Actions do not replace the Mobile API.
- Keep destructive Admin actions auditable and require appropriate server authorization and confirmation UX.

## UI and Shared Code

- Admin UI uses Next.js, TypeScript, shadcn/ui, and TanStack Table. Keep accessible loading, empty, error, and destructive-action states.
- Share only safe DTOs, API contracts, enums, Zod schemas, non-secret constants, and genuinely common utilities through `packages/*`. Shared packages must not import from apps; avoid cycles.
- Lovable is design-only. Codex implements production Next.js UI and business logic.
- Keep tests focused on web/API behavior when verification is needed. Report runtime or deployment behavior not exercised locally.
