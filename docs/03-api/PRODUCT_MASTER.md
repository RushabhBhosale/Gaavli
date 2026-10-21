# Product Master — 2026-10-21

User-approved scope: use the supplied `gaavli_product_master.json` as a shared
product reference for farmer/seller Add and Edit Listing. Preserve existing
listings, listing lifecycle, categories, styling and offline request recovery.

## Storage and import

`ProductMaster` uses MongoDB collection `productMasters`, with unique `code`,
`nameMr`, `nameEn`, `productGroup`, `defaultUnit`, `status` (ACTIVE/INACTIVE),
`sortOrder` and timestamps. API `productId` is the string form of MongoDB `_id`.
There are no category fields. Existing Admin categories PERISHABLE and
RECURRING_SUPPLY retain their independent shelf-life and notification behavior.

The supplied JSON is preserved verbatim in
`apps/web/data/gaavli_product_master.json`: 151 products, 12 groups and 7 units.
Raw group/unit values are retained, including `grains`, `leafy_vegetables`,
`piece`, `ton` and `bundle`; legacy `grain`, `homemade` and custom listing units
remain supported. Existing Marketplace group filters retain exact matching;
unfiltered Home browsing includes all eligible product groups.

Run from the repository root (Windows PowerShell uses `npm.cmd` to forward flags):

```powershell
npm.cmd run import:product-master --workspace=@gaavli/web
npm.cmd run import:product-master --workspace=@gaavli/web -- --apply
```

The first command only reports counts. `--apply` validates the entire source
before writes, creates the unique code index, and upserts using `$setOnInsert`.
Repeated imports preserve existing IDs, names, groups, units and activation
status. No listing or category is migrated, deleted or seeded. Optional
`--file=<path>` selects another file with the same validated shape. Database
connection uses the existing server environment; credentials are never logged.

Applied to the configured application database on 2026-10-21: 151 inserted,
151 source codes verified. A second apply inserted 0, matched 151 and verified 151. The checked-in source and supplied download have matching SHA-256 hashes.

## Read API

Authenticated `GET /api/v1/product-master` uses the existing mobile bearer
session, JSON envelope and `Cache-Control: no-store`. It returns all ACTIVE
products, ordered by `sortOrder`, then `code`:

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "productId": "0123456789abcdef01234567",
        "code": "TOMATO",
        "nameMr": "टोमॅटो",
        "nameEn": "Tomato",
        "productGroup": "vegetables",
        "defaultUnit": "kg",
        "status": "ACTIVE",
        "sortOrder": 1
      }
    ]
  }
}
```

Values above illustrate the DTO; the import file owns actual catalog values.
Optional `?search=` is bounded to 100 characters and matches literal,
case-insensitive whitespace terms against both names. Every term must match
either name. Regex characters are escaped. Unknown query fields are rejected.
The complete reference set is intentionally unpaginated, like listing categories.

## Listing linkage and compatibility

Existing create and PATCH endpoints accept optional `productId`; owner listing
DTOs return the ID or null. It references ProductMaster from the existing Listing
collection. With an ID, the server resolves an ACTIVE record inside the existing
listing transaction, supplies canonical `productName` (English), `productNameMr`
and raw `productGroup`, and retains the listing's independent category. Client
name/group overrides cannot forge linked product metadata.

Selecting a product in mobile sets its ID, both name snapshots, group and default
unit atomically. Unit remains editable using existing controls. A PATCH selecting
a different product without a unit uses that product's default; ordinary edits
retain the listing's unit. Names remain snapshots on the listing so later catalog
changes do not silently rewrite historical listings or request snapshots.

Missing/inactive references on new selection return 422 `PRODUCT_UNAVAILABLE`.
Existing linked listings still display and allow price/quantity-only edits when
their master is retired. Attempts to change linked identity fields revalidate
the master. Deactivation does not remove existing listings from browsing.

Legacy create callers, stored listings and already staged offline requests may
omit `productId`. No name-based linking is inferred. Editing a legacy listing
shows its saved name and allows ordinary edits; selecting a master explicitly
links it. Existing version checks, duplicate detection, expiry, ownership,
idempotency hashes, photos and protected contacts remain in force.

## Mobile and offline behavior

Add/Edit reuse the existing dropdown modal, fonts and theme, with a search input
matching Marathi or English regardless of the selected display language. Only
the selected language is displayed. Edit prefills from saved listing snapshots,
including when the referenced master is inactive or the catalog is unavailable.
New, unstaged mobile listings require a master selection. Previously staged
legacy creates can replay their original request unchanged.

Validated active reference data is cached in the existing SQLite settings table
under `reference:product-master:v1`. Offline/network failures use that cache with
an explicit cached-data message. Without a cache, loading/error/retry/empty states
are shown. Server validation remains authoritative when publishing. Drafts save
the product selection and both names, and survive restarts. No personal data or
credentials are added to the reference cache.

## Verification

- Isolated MongoDB Product Master integration: imports, repeated import, unique
  index, bilingual API search, active filtering, auth/no-store, canonical create,
  selection changes/default unit, owner prefilling, inactive references, legacy
  edits, foreign-owner rejection and unchanged Admin categories.
- Mobile tests: selection/draft/edit round trips, staged legacy request stability,
  bilingual literal search, validated offline fallback and cache-write failures.
- Existing listing CRUD and read integrations, workspace TypeScript and focused
  ESLint pass. Android export and web production build pass; the latter reports
  an existing filesystem tracing warning in the local photo provider. Native
  device visual/keyboard/accessibility acceptance is pending.
