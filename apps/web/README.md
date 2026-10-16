# Gaavli Admin Portal

Listing backend: authenticated mobile create/edit/deactivate, owned reads,
sold-out/relist and active category APIs are implemented. Admin listing ceiling
settings use separate cookie/origin authentication and audited version checks.
CRUD contracts, JSON examples, database fields and isolated MongoDB tests are in
`docs/03-api/LISTING_CRUD.md` at the repository root. Transactions require a replica
set/Atlas. Mobile forms, uploads and admin listing moderation remain separate work.

Initial Next.js App Router admin application: login, dashboard, users management and placeholder future modules, styled from the supplied green Gaavli reference. All changes are inside `apps/web`; mobile is untouched.

## Run

Use Node.js 20.9+ and npm. From the repository root:

```powershell
cd apps/web
npm ci
```

`.env.local` has been created locally and is ignored by Git. For a fresh checkout:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local` before seeding:

- `MONGODB_URI`: a development MongoDB connection. Standalone local MongoDB supports login, dashboard reads and sample seeding. Creating/editing/blocking users requires Atlas or a replica set for audited transactions.
- `JWT_SECRET`: generate at least 32 random characters. For example: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `ADMIN_EMAIL`: your administrator email.
- `ADMIN_PASSWORD`: a unique password of 12–72 characters. No default password is shipped.
- `ADMIN_NAME`: displayed administrator name.

```powershell
npm run seed
npm run seed:sample
npm run dev
```

Open the URL printed by Next.js (normally `http://localhost:3000/login`) and log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. If port 3000 is occupied, Next.js chooses another port. Seed does not change existing administrator credentials; sample seed skips databases with unrelated marketplace records. Existing sample records are preserved on reruns, and interrupted sample inserts can resume. Sample data is development-only and its artificial numbers must never be contacted.

Local audited saves require a replica set. This machine's MongoDB 7.0 Windows
service is now configured as the single-node set `rs0`, with its original data
and localhost binding preserved. Use
`mongodb://127.0.0.1:27017/gaavli?replicaSet=rs0` in `.env.local`.
For the same Windows installation layout, run `scripts/configure-local-mongo.ps1`
from an Administrator PowerShell, then `node scripts/initialize-local-mongo.mjs`.
The PowerShell script backs up the configuration and restarts MongoDB. With the
app running on port 3000, `node scripts/verify-local-save.mjs` checks login and an
audited PUT save of the development sample without changing its profile or roles
(its optimistic version increments). See the
[MongoDB conversion guide](https://www.mongodb.com/docs/manual/tutorial/convert-standalone-to-replica-set/).

The sample seed creates 8 villages, 13 users (including three users with buyer,
seller and coordinator roles) and 10 listings, with mixed
capabilities/statuses and creation dates spread over the last six months.

For production: `npm run build`, then `npm start` with real environment configuration. This implementation has not yet been verified against MongoDB or in a browser; see [implementation status](docs/IMPLEMENTATION_STATUS.md) before deployment.

## Checks

Format the web app with `npm run format`, or verify formatting with
`npm run format:check`. Prettier uses two-space indentation and an 80-character
line width. Generated files, environment files and `AGENTS.md` are excluded.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Run the HTTP smoke check with the local server running. Its default is port 3001; override to your actual server URL:

```powershell
$env:SMOKE_URL = 'http://localhost:3000'
npm run smoke
```

## Structure

```text
apps/web/
├── AGENTS.md                       existing instructions, preserved
├── .env.example / .env.local       template / ignored local configuration
├── package.json / package-lock.json
├── components.json                shadcn/ui aliases
├── next.config.ts / next-env.d.ts / tsconfig.json
├── postcss.config.mjs / eslint.config.mjs / .gitignore
├── docs/
│   ├── API_SPEC.md
│   ├── DATABASE.md
│   ├── SECURITY_PRIVACY.md
│   └── IMPLEMENTATION_STATUS.md
├── scripts/
│   ├── seed.ts
│   ├── seed-sample.ts
│   └── smoke-http.mjs
├── tests/security.test.ts
└── src/
    ├── app/
    │   ├── (auth)/{login,forgot-password}/page.tsx
    │   ├── (dashboard)/layout.tsx / page.tsx
    │   ├── (dashboard)/{users,listings,villages,reports,notifications,settings}/page.tsx
    │   ├── api/auth/{login,logout,me}/route.ts
    │   ├── api/dashboard/{stats,user-growth}/route.ts
    │   ├── api/users/route.ts / counts/route.ts
    │   ├── api/users/[id]/route.ts / status/route.ts
    │   ├── api/villages/route.ts
    │   └── layout.tsx / providers.tsx / globals.css / error.tsx / not-found.tsx
    ├── components/
    │   ├── ui/{button,dialog,dropdown-menu}.tsx
    │   ├── layout/admin-shell.tsx
    │   └── shared/{brand,confirm-dialog,states}.tsx
    ├── features/
    │   ├── auth/login-form.tsx
    │   ├── dashboard/dashboard.tsx
    │   └── users/{users,user-form}.tsx
    ├── lib/{api,contracts,utils}.ts
    ├── schemas/index.ts
    ├── proxy.ts
    └── server/
        ├── auth/{session,token}.ts
        ├── db/connect.ts
        ├── models/index.ts
        ├── repositories/users.ts
        ├── services/{auth,dashboard,users}.ts
        └── utils/{errors,http}.ts
```

The full file inventory is in [CHANGES.md](CHANGES.md). No root workspace manifest or shared package was created because the request restricts writes to this app. This app can be added to the approved npm workspaces layout later. Existing root status and canonical database/API documents require reconciliation; app-local supplements record this initial admin scope.

Next.js 16 uses [`proxy.ts`](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) for the former middleware convention. Page checks validate the JWT initially; layouts and APIs independently check the live session and active Super Admin. Super Admin credentials are structurally separate from marketplace users.

## Exact dependency commands executed

```text
npm install next@latest react@latest react-dom@latest mongoose bcryptjs jose zod @tanstack/react-query @tanstack/react-table react-hook-form @hookform/resolvers recharts lucide-react @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-alert-dialog @radix-ui/react-slot class-variance-authority clsx tailwind-merge server-only
npm install -D typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss eslint eslint-config-next tsx
npm install @tanstack/react-table@8 mongoose@8
npm install @next/env@16.4.0
```

The first dependency command initially failed in the offline sandbox, then was authorized for network access. It was repeated to repair overlapping installs; the final manifest and lockfile include runtime and development dependencies. Table v8 and Mongoose v8 were pinned to the APIs used by this implementation. Full npm audit reports five development-tool advisories; production-only audit reports zero. The exact resolved versions are pinned by `package-lock.json`.
