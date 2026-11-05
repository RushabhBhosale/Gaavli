# Service Provider Master Management — Phase 1 (2026-11-04)

User-approved scope: reference dropdown management only. No provider profiles,
registration screens, approval flow, mobile integration or provider-category
collection. Existing ProductMaster and marketplace/service listings are unchanged.

## Fixed provider types and groups

The shared `ProviderType` enum is code-owned; there is no provider-type CRUD.

| Provider Type           | Master groups                               |
| ----------------------- | ------------------------------------------- |
| SHOP_BUSINESS           | SHOP_TYPE                                   |
| PROFESSIONAL_SERVICE    | PROFESSION                                  |
| HEALTHCARE_PROFESSIONAL | DOCTOR_SPECIALIZATION, DOCTOR_QUALIFICATION |
| MEDICAL_FACILITY        | FACILITY_TYPE                               |
| TRANSPORT_DRIVER        | TRANSPORT_TYPE, VEHICLE_TYPE                |
| OTHER_SERVICE           | OTHER_SERVICE_CATEGORY                      |

Shared constants include English/Marathi/Hindi provider labels. The current admin
shell is English-only, so this page uses English navigation/provider labels and
displays all three saved name columns. No new global admin locale system is added.

## Admin UI

`/provider-masters`, under **Service Providers → Master Management**, reuses the
existing Super Admin layout, buttons, Radix dialogs, confirmation dialog, TanStack
Query/Table, error/empty/loading states and theme. Doctor/Transport have group
tabs; other types show their one group directly. There is no Master Type dropdown.

Search matches multilingual names and code. Status supports All/Active/Inactive.
Headers sort names/code/status; initial sorting uses sort order. Pagination uses
10 rows. Total/Active/Inactive counts apply to the current group and search, before
the status filter; matching total/pagination use the status filter too.

Add/Edit requires nonblank English, Marathi and Hindi names. New records default
to active and sort order 0. New codes use the English-name slug plus a random
12-hex-character suffix, with a database unique index as authority. Codes and
provider/master identity cannot be changed after creation. Editing changes names
and sort order; table actions separately activate/deactivate, confirming before
deactivation. Success uses an accessible timed status notice; failures remain
visible. Existing references remain valid and there is no delete action/API.

## REST contracts

Uses the existing `/api/v1` convention rather than adding unversioned aliases.
All responses use existing JSON envelopes and `Cache-Control: no-store`.

| Method | Path                                        | Access / purpose                                      |
| ------ | ------------------------------------------- | ----------------------------------------------------- |
| GET    | `/api/v1/admin/provider-masters`            | Active Super Admin session; list                      |
| POST   | `/api/v1/admin/provider-masters`            | Active Super Admin session + same-origin; create      |
| PATCH  | `/api/v1/admin/provider-masters/:id`        | Active Super Admin session + same-origin; names/order |
| PATCH  | `/api/v1/admin/provider-masters/:id/status` | Active Super Admin session + same-origin; status      |
| GET    | `/api/v1/provider-masters`                  | Public read-only active reference options             |

All list/read requests require `providerType` and its valid `masterType`.
Admin list supports `search` (max 100), `status=all|active|inactive`, `page`
(1–10000), `limit` (1–100), `sort=sortOrder|name.en|name.mr|name.hi|code|isActive`
and `direction=asc|desc`. Unknown query/body fields are rejected.

Create body: `{ providerType, masterType, name: { en,mr,hi }, sortOrder?, isActive? }`.
Names are trimmed and bounded to 160 characters. Sort order is an integer 0–1000000.
Update body: `{ name:{en,mr,hi}, sortOrder, version }`.
Status body: `{ isActive, version }`.
Admin DTOs include `id, providerType, masterType, code, name, sortOrder, isActive,
version`. Versioned writes reject stale updates with 409; mutations record audit
events in the existing AuditLog transaction. Invalid IDs/inputs return 422,
missing masters 404, and duplicate names/codes 409.

Public query accepts only `providerType, masterType`; it returns
`{records:[{id,code,name:{en,mr,hi}}]}` for that group, active only, ordered by
sortOrder, English name, then ID. It exposes no normalized names, timestamps,
versions, statuses or mutation actions. No mobile integration was implemented.

## Database and uniqueness

New `providerMasters` collection: providerType, masterType, stable code, name
subdocument `{en,mr,hi}`, isActive, sortOrder, timestamps, version, and internal
normalizedName. Unique compound indexes scope code and each normalized language
name to providerType + masterType. Normalization uses NFC, trimming, collapsed
whitespace and lowercase. Database indexes handle concurrent duplicate creation.
No existing collection/references are migrated or rewritten.

## Supplied seed

The repository data file is a byte-for-byte copy of
`gaavli_provider_master_seed_simple_en_mr_hi.json` supplied by the user.
SHA-256: `96F73C1D8B8F34F536639146B32621808B2317F3E26A69E4FFC72004395E56A6`.

Actual validated source counts:

| Group                  | Records |
| ---------------------- | ------: |
| SHOP_TYPE              |      16 |
| PROFESSION             |      25 |
| DOCTOR_SPECIALIZATION  |      14 |
| DOCTOR_QUALIFICATION   |      11 |
| FACILITY_TYPE          |       7 |
| TRANSPORT_TYPE         |       3 |
| VEHICLE_TYPE           |      12 |
| OTHER_SERVICE_CATEGORY |      11 |
| Total                  |      99 |

Run from repository root:

```powershell
# Validate only; does not connect to MongoDB or insert records.
npm run seed:provider-masters --workspace=@gaavli/web

# Explicitly insert missing records into the configured web MONGODB_URI.
npm run seed:provider-masters --workspace=@gaavli/web -- --apply
```

Uses the existing web environment/connection setup. Every record is validated
before DB work; seed identities must be unique. Upserts match provider type +
master type + code and use `$setOnInsert` only (including timestamps). Reruns do
not overwrite names, activity, order, version or timestamps of existing records.
The final count is verified against the input length, never a hardcoded 99.
Index conflicts fail the run and can leave nonconflicting inserts saved; resolve
conflicts and rerun. It is never invoked on application startup.

The configured application database has not been seeded during implementation.
Integration testing seeds only an isolated randomly named database and removes
that exact database afterward with name/prefix guards.

## Verification

`npm run test:provider-masters --workspace=@gaavli/web` exercises actual handlers
with the pinned Next.js request storage for cookie authentication, and actual
MongoDB CRUD/indexes/transactions in an isolated database. It verifies all supplied
records/labels/groups, admin-only access, origin checks, IDs/validation, creation,
translation edits, stable codes, duplicate/concurrent create rejection, status
changes, active-only public DTOs, multilingual search, pagination and seed reruns
preserving admin edits/status/order/timestamps.

Web TypeScript, full web ESLint, shared-package TypeScript, existing 14 web tests,
82 mobile regression tests and the integration suite passed. Production compilation,
TypeScript and page generation succeeded, but the full build exited on an existing
Next.js dependency security advisory; the dependency was not upgraded in this phase.
The build also reported existing legacy-photo filesystem tracing. Browser review
stopped because Computer Use could not identify the browser URL confidently;
desktop/tablet visual acceptance and hosted deployment remain pending.
