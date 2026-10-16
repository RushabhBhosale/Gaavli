# Gaavli

Gaavli is a Marathi-first, offline-first platform that connects villagers with nearby products and services. It helps people discover availability and contact one another directly; it does not control transactions.

## Approved technical direction

- **Mobile:** React Native, Expo, TypeScript, Expo Router, Zustand, TanStack Query, SQLite, SecureStore, NetInfo, and Expo Notifications.
- **Web, Admin, and backend:** Next.js and TypeScript in `apps/web`; REST APIs use Next.js Route Handlers and reusable server-side application services.
- **Data:** MongoDB Atlas, Mongoose, and MongoDB Atlas Search, accessed only on the server.
- **Shared code:** `packages/types`, `packages/validation`, `packages/constants`, and `packages/utils`.
- **Package manager:** npm with npm workspaces and `package-lock.json`.
- **AI workflow:** Codex implements production software. Lovable is limited to UI/UX design and prototypes.

The repository includes the Next.js Admin/backend and Phase 1 Expo mobile
foundation. See `docs/IMPLEMENTATION_STATUS.md` for verified behavior and pending
work. Mobile onboarding is registration-first, with Marathi/English language
selection; Phase 1 stops at a registration scaffold.

## Setup

Use Node.js 20.19.4 or newer and npm 10 or newer. Install from the repository root:

```bash
npm install
```

Start the applications in separate terminals:

```bash
npm run dev:web
npm run dev:mobile
```

Mobile native development-client setup and LAN/API configuration are documented
in [apps/mobile/README.md](apps/mobile/README.md). For Expo Go, run
`npm run dev:mobile:go` from the root; it starts the mobile workspace and clears
Metro's cache. Do not run plain `npx expo start` from the monorepo root.

Run `npm run typecheck`,
`npm run lint`, `npm run test`, `npm run build:web` and `npm run export:android`
from the root. There is one root lockfile; do not create per-app lockfiles.

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
