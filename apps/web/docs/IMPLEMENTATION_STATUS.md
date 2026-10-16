# Web implementation status — 2026-10-09

## Workspace/mobile foundation integration — 2026-10-13

Web now participates in the root npm workspace/lockfile. Original 578 web lock
entries were preserved during migration; shared safe validation/types packages
were added without changing admin APIs or authentication. Public Node.js
`GET /api/v1/health` returns only validated `{ success: true, data: { status: "ok" } }`
with no-store caching and no database query. Next transpiles shared TS packages.
Root TypeScript/lint, six existing tests and web production build PASS. Live
health/mobile client validation, GET-only behavior and unauthenticated rejection
on Admin categories PASS. Mobile device verification is pending; see
`apps/mobile/IMPLEMENTATION_STATUS.md`.

## Categories directory — 2026-10-13

Status: IMPLEMENTED — VERIFICATION PENDING (browser visual QA pending).
Added Categories navigation, `/categories`, a four-column sortable directory,
debounced English/Marathi search, server pagination and Add category dialog.
No send timing appears in the table or dialog. API GET/POST under
`/api/v1/admin/categories` reuse live Super Admin sessions, CSRF origin checks,
strict Zod schemas, no-store responses and server-only service/repository code.
Creation and audit commit atomically; unique codes reject duplicates.

Four approved default tiers initialized using `npx tsx scripts/seed-categories.ts`;
rerun preserved them. Active counts support canonical ObjectId/string categoryId
and legacy category codes, and exclude expired listings. Generic sample Produce
listings remain unmapped; no tier is inferred. Display shelf life and notify mode
are configuration metadata; expiry automation and notification delivery remain
pending. Edit/delete and complete listing schema migration remain pending.

Verification: TypeScript PASS; lint PASS; six tests PASS. Local authenticated
`node scripts/verify-categories.mjs` PASS for unauthenticated access, CSRF,
strict input validation, defaults, creation, duplicate codes, transactional audit,
literal regex search, pagination and active counts across all supported links.
Temporary category/listing fixtures removed; audit evidence retained.
Production build PASS, including `/categories` and its Admin API route.
Browser visual QA not run.

## Add Village without coordinates — 2026-10-12

Removed the coordinates field from Add Village at the user's request. Creation
validation accepts omitted coordinates as a pair; the service leaves location
unset, without fabricated coordinates. Edit retains its coordinate input and
required pair/version validation. Updated the API contract and focused validation
checks. TypeScript, ESLint and all 5 existing tests PASS; local API integration PASS for
coordinate-free creation with assignment, null listing coordinates, subsequent
edit and existing CRUD protections. Temporary fixtures were cleaned up; audit
evidence retained. Browser visual QA was not run.

## Explicit Karjat assignment repair — 2026-10-12

At the administrator's request, saved Karjat's coordinator assignment to Kavita
Patil. Verified her active coordinator role and Karjat home village, refused any
conflicting existing assignment, and committed the link, village/user version
locks, assignment audit and Marathi in-app notification atomically. No village
coordinates or profile fields were fabricated or changed. The idempotent local
repair script authenticates the administrator and verified the listing API
returns exactly one coordinator, Kavita Patil. TypeScript check PASS. Inspection
now includes coordinator home villages to distinguish membership from assignment.
This is an explicit assignment; other coordinator home villages are unchanged.

## Coordinator dropdown and missing-assignment diagnosis — 2026-10-12

Replaced the coordinator radio list with a labelled single-select dropdown shared
by Add/Edit Village. Existing assignments preselect the saved user; clearing the
selection unassigns. Inactive users cannot be newly selected. The form explains
that selecting and saving establishes the listing mapping.

Local database inspection found 3 coordinator-role users and 0 persisted village
assignments. Therefore Unassigned is accurate; the application does not infer a
coordinator assignment from a user's role or home village. No arbitrary village
assignments were created. Local API integration PASS for assigned-user listing
round-trip and existing village CRUD/dependency protections, with temporary test
fixtures cleaned up. TypeScript and ESLint checks PASS. Browser visual QA remains
unavailable.

## Single coordinator and village action menu — 2026-10-12

User-approved cardinality revision supersedes prior many-to-many village entries:
each village has at most one assigned coordinator; one user may coordinate
multiple villages. Add/Edit uses one selection and API validation rejects multiple
coordinators. Unique villageId index was provisioned after a conflict audit;
existing assignments were preserved. The Assigned Coordinator column resolves
the mapped user name, with Unassigned for an empty mapping. Actions now includes
Edit and Delete. Delete opens dependency confirmation with Deactivate alternative;
server-side transactional checks reject users, listings, assignments, mappings,
preferences, services and subscriptions. Empty villages can be deleted with
version checking and audit persistence. Future reference writers must lock the
village and extend dependency checks as their modules are implemented.

Verification: TypeScript and ESLint PASS. Local API integration PASS for single
coordinator validation, correct assigned-user listing, reassignment, blocked
deletion with assignment, deletion after clearing all dependencies, status,
version protection, audit/notice persistence and role-revocation cleanup. Test
fixtures were cleaned up; audit evidence retained. Browser QA, actual populated
proximity/preference/service/subscription fixtures and concurrent deletion races
remain unverified. Final production build and all 5 security/validation tests PASS.

## Village add/edit and coordinator assignments — 2026-10-12

Status: **IMPLEMENTED — VERIFICATION PENDING** (browser visual QA pending).

Added Add Village and village-name Edit actions with screenshot-inspired form:
English/Marathi names, decimal or degree/cardinal coordinate input, taluka,
district and multiple assigned coordinators. Real many-to-many assignments now
appear in the directory; home villages do not imply assignments. Added GeoJSON
village location, deactivation timestamp and version, plus an indexed assignment
collection. Existing records remain readable; no coordinates are fabricated.
POST creates, PUT edits, PATCH activates/deactivates with confirmation and existing
user/listing/assignment counts. Live Super Admin authorization, same-origin JSON,
Zod validation, version conflicts and atomic audit/assignment notice records are
preserved. Coordinator revocation cleans assignments; document locks prevent
concurrent assignment/revocation and active-village membership races.

Verification: TypeScript and ESLint PASS; 5 security/validation tests PASS.
Final production build and ESLint PASS after the multi-assignment insertion fix.
Local API checks PASS:
create, edit, GeoJSON round-trip, two coordinators for one village, one coordinator
for two villages, stale version 409, invalid assignee 422, dependency counts,
deactivate/reactivate, active-dropdown exclusion, atomic notice/audit persistence,
and coordinator-role revocation cleanup. A multi-document session insert initially
failed; ordered insertion fixed it and integration checks passed. Temporary test
villages, user, assignments and notices were cleaned up; audit evidence retained.
The local dev server was restarted to reload MongoDB schemas. Browser visual QA
was attempted but no browser surface is available. Browser rendering,
concurrent races, failed-transaction injection and notification delivery remain
unverified. Authoritative nearby mapping remains pending. Permanent Delete Village
is disabled until comprehensive dependency/reassignment protection is implemented.

## Local MongoDB transactions enabled — 2026-10-12

The local MongoDB 7.0 Windows service was converted from standalone to the
single-node replica set `rs0`, retaining the original data directory and
127.0.0.1 binding. Original mongod.cfg was backed up alongside the service config
before its update. `.env.local` and `.env.example` now use the local URI with
`?replicaSet=rs0`. No Atlas account or dependencies were added.

Verification: writable primary and transaction commit PASS; existing counts are
8 villages, 13 users and 10 listings. Against the existing local app on port 3000,
admin login, Coordinator filtering, PUT save of the Anjali Joshi sample with
unchanged profile/roles, optimistic version increment and stored user.updated
audit record PASS. Verification session was logged out. UI clicking and POST
creation, role-change notification atomicity and failure rollback were not
exercised in this task. Prior standalone-save blocker is resolved for this local
environment; other standalone environments still need a replica set.

Reproducible setup/verification scripts: `scripts/configure-local-mongo.ps1`
(Windows administrator, detected MongoDB 7.0 service path),
`scripts/initialize-local-mongo.mjs`, `scripts/verify-local-save.mjs`.

## User edit HTTP method — 2026-10-12

Edit User now sends `PUT /api/users/:id` with the complete editable field set
and optimistic version. The route exports PUT; Add User still uses POST and
status-only updates still use PATCH. Validation, Super Admin authorization,
origin checks and audited transaction behavior are unchanged. TypeScript and ESLint PASS;
runtime saves remain unverified and require a replica set/Atlas.

## Coordinator form roles and samples — 2026-10-12

Status: **IMPLEMENTED — VERIFICATION PENDING**.

Add/Edit User now exposes Seller, Buyer and Coordinator checkboxes; combinations
are supported, existing coordinator selections load on edit, buyer remains
universal, and unrelated service capabilities survive edits. Super Admin-only
routes accept coordinator role changes with existing version, origin and session
checks. Role grant/removal adds explicit audit entries and Marathi in-app
notification records atomically with the user mutation. Unchanged roles do not
emit role-change notices. No SMS, WhatsApp or push messages are sent.

Development sample seed adds Anjali Joshi, Santosh Chavan and Kavita Patil with
all three roles, using stable IDs and insert-only upserts. Dataset is now 8
villages, 13 users and 10 listings. Existing samples are preserved.

Verification: TypeScript, ESLint, production build and 4 tests PASS (schema/role overlap, role
removal, service capability preservation and existing security tests). Local
standalone sample insertion and rerun PASS. Rerun verified all three coordinator
sample IDs retain buyer/seller/coordinator together with no duplicate records.
UI and transactional admin role
changes were not manually exercised. The configured local database is standalone;
admin saves still require a replica set/Atlas. In-app notification retrieval,
delivery and read-state UI, plus many-to-many village assignments and assignment
cleanup remain pending. The stored notices do not establish end-user delivery.

## User listing roles — 2026-10-12

User role badges now appear in Seller, Buyer, Coordinator order for each user's
existing capabilities. Renamed Farmer/Farmers to Seller/Sellers in user listing
and its form. Added a Coordinators filter tab, validated coordinator query
filter, and database-derived coordinator count. Capability overlap is preserved;
coordinator grant/revoke and village assignment workflows remain pending.

Verification: TypeScript, ESLint and all 3 existing tests PASS; validation checks
cover coordinator filter acceptance, Super Admin filter rejection, and rejection
of coordinator injection through create/edit role input. Browser rendering and
database-backed coordinator filtering were not manually exercised.

## Village listing page — 2026-10-12

Status: **IMPLEMENTED — VERIFICATION PENDING**.

Replaced `/villages` placeholder with a responsive TanStack Table directory using
the existing admin shell. Columns: Village, Coordinator, Users, Nearby Mapped,
Status. Added debounced English/Marathi village/taluka/district search, district
and status filters, filter reset, six-row pagination, loading/empty/error states
and retry. Protected Node.js `/api/v1/admin/villages` validates queries with Zod,
reuses live Super Admin authorization, and returns safe, uncached DTOs through a
service/repository. User counts and village active states come from MongoDB.

Coordinator assignments and manually confirmed proximity storage remain pending;
the API returns null and the UI shows “Not configured” for these fields. No
assignments are inferred from a user's home village. Village creation, editing,
deactivation and deletion are outside this listing task and remain unimplemented.
No dependencies, seed data or database schemas were changed.

Verification: TypeScript, ESLint, production build and targeted Prettier check
PASS. `npm test` PASS (3 tests), including
village filter/pagination validation and existing authentication regressions.
The initial sandboxed test and build attempts failed with spawn EPERM; approved
reruns passed. Browser visual QA and authenticated MongoDB-backed directory
behavior were not exercised.

## Standalone sample seeding — 2026-10-09

The development sample seed now detects MongoDB topology. Standalone servers use
validated insert-only upserts with deterministic sample IDs; replica sets retain
transactional insertion. Unrelated records cause the seed to skip, and existing
sample records are never overwritten. Local standalone insertion succeeded with
8 villages, 10 users and 10 listings. Audited admin CRUD still requires a replica
set or Atlas; its transaction protections were not changed.

Verification: local standalone seed and rerun PASS; stored sample counts remained
8/10/10. TypeScript and lint PASS. Prettier formatting applied. Replica-set seed,
interrupted-run recovery and unrelated-record skip were not exercised in this run.

## Small sample dataset — 2026-10-09

Sample seed now creates 8 villages, 10 users and 10 listings instead of 60 users
and 80 listings. User dates still span six months, with active/blocked/pending
examples. Existing-data skip and transactional insertion are preserved.
Formatting and TypeScript checks passed. Running the seed against the configured
local database failed with MongoDB code 20 because transactions require a replica
set or Atlas. Sample record creation has not been verified or completed.

## Code formatting — 2026-10-09

Web source, scripts and configuration were formatted with Prettier. Added a
local Prettier configuration, ignore file, and `format` / `format:check` npm
commands. Formatting does not change implementation or verification status.

Status: **IMPLEMENTED — VERIFICATION PENDING**.

Initial login, dashboard and user management UI, browser admin APIs, separate admin credentials, live session authorization, account lockout, transactional audit writes, optimistic user versions, models and idempotent seed scripts are implemented. Requested future screens and OTP/password recovery remain intentional placeholders.

The repository-wide `docs/IMPLEMENTATION_STATUS.md` was not changed because this task restricts writes to `apps/web`. Its documentation-only snapshot now requires reconciliation with this app-local entry. Root npm workspace manifest and shared packages remain absent; this app has its own npm manifest and lockfile so it can run within the authorized scope. No file in `apps/mobile` was changed.

Verification:

- `npm run typecheck`: PASS.
- `npm run lint`: PASS, no errors or warnings.
- `npm run build`: PASS (production routes compiled and generated).
- `npm test`: PASS, two security tests covering input boundaries, privileged-role injection rejection, pagination limits, required mutation version, JWT signing/expiry/audience/role and requested session lifetime.
- `npm run smoke`: PASS against the local dev server; login HTML, two page redirects, six protected APIs, three foreign-origin mutations, login validation and forged-cookie rejection.
- `npm audit --omit=dev --json`: PASS, zero production advisories. Full audit reports five high-severity development-tool findings through ESLint/fast-glob/micromatch/braces; no compatible patch was offered. Do not run `npm audit fix --force` to downgrade the framework lint configuration.
- Browser visual QA: NOT RUN; no browser surface is available in this session. Login HTML was checked over HTTP; desktop/mobile rendered layouts still require visual QA.
- MongoDB-backed login, CRUD, five-attempt lockout, audit atomicity, seed reruns, and chart aggregate verification: NOT RUN; database credentials were not provided. Use a configured MongoDB replica set/Atlas connection.

No production readiness claim is made. Root status reconciliation, root npm workspaces/shared packages, canonical marketplace model migration, production abuse throttling and monitoring remain future work. App-specific contracts and deliberate task overrides are recorded in the adjacent API, database and security supplements.

## Seed configuration troubleshooting — 2026-10-09

Seed failures now identify invalid environment fields without printing their values. Local inspection found an empty JWT_SECRET and an ADMIN_PASSWORD outside the required 12–72 character range. A random JWT secret was generated in the ignored local file; the user must supply a valid password before administrator creation can proceed. No existing administrator credentials were reset.
