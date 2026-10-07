# Gaavli

Gaavli is a Marathi-first, offline-first platform that connects villagers with nearby products and services. It helps people discover availability and contact one another directly; it does not control transactions.

## Approved technical direction

- **Mobile:** React Native, Expo, TypeScript, Expo Router, Zustand, TanStack Query, SQLite, SecureStore, NetInfo, and Expo Notifications.
- **Web, Admin, and backend:** Next.js and TypeScript in `apps/web`; REST APIs use Next.js Route Handlers and reusable server-side application services.
- **Data:** MongoDB Atlas, Mongoose, and MongoDB Atlas Search, accessed only on the server.
- **Shared code:** `packages/types`, `packages/validation`, `packages/constants`, and `packages/utils`.
- **Package manager:** npm with npm workspaces and `package-lock.json`.
- **AI workflow:** Codex implements production software. Lovable is limited to UI/UX design and prototypes.

The repository documents the target architecture. See `docs/IMPLEMENTATION_STATUS.md` for what is actually present and what remains planned.

## Setup

The intended monorepo setup uses:

```bash
npm install
```

Workspace commands depend on the scripts defined by each app, for example:

```bash
npm run dev --workspace=apps/web
npm run start --workspace=apps/mobile
```

The current documentation checkout may not contain the application workspaces or package manifests yet. Do not infer that the apps are implemented from these target paths.

## Documentation map

- Product: `docs/01-product/PROJECT_REQUIREMENTS.md`
- Architecture: `docs/02-architecture/ARCHITECTURE.md`
- API: `docs/03-api/API_SPEC.md`
- Database: `docs/04-database/DATABASE.md`
- Development rules: `docs/05-development/AI_DEVELOPMENT_RULES.md`
- UI/UX design: `docs/06-ui/UI_UX_PRD.md`
- Offline sync: `docs/OFFLINE_SYNC.md`
- Security and privacy: `docs/SECURITY_PRIVACY.md`
- Implementation status: `docs/IMPLEMENTATION_STATUS.md`
- Global and app-specific Codex instructions: `AGENTS.md`, `apps/mobile/AGENTS.md`, `apps/web/AGENTS.md`
