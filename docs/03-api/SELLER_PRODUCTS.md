# Seller Products header and search - 2026-10-21

User-requested reference layout: cream/soft-green/yellow header with localized
title/subtitle and right-side farm/crate artwork. The latest revision removes
the summary cards and Filter / Sort control; products use the default newest
order. Search and All, Active, Drafts, Low stock, Sold out tabs are functional. Tabs scroll
horizontally on smaller screens; text follows the selected language. Existing
Marketplace and Add actions remain available in a bottom action row.

## Existing owner API extended

Authenticated `GET /api/v1/listings/mine` retains existing ownership/no-store,
pagination and status behavior. It additionally accepts:

- `search`: trimmed, at most 100 characters. Literal case-insensitive whitespace
  terms match both `productName` and `productNameMr`; every term must match either
  name. Escaped regex input, filtering before pagination and total counting.
- `status=all`: all of this seller's non-deactivated products, including expired
  products. Omitted status retains historical API behavior.
- `status=low_stock`: currently active, unexpired positive stock at or below the
  listing's minimum purchase quantity; fallback threshold is one unit when no
  minimum is set.
- `sort=newest|price_asc|price_desc|stock_asc`: deterministic ordering with `_id`
  as tie-breaker; newest remains the default. Null historical values retain
  MongoDB's ordinary null sort position.

Responses add optional-compatible `summary` with non-deleted `total`, currently
`active`, `soldOut` and `lowStock` counts for this seller. Summary is independent
of the current search/status/page, so tab counts describe the inventory.
Response `total` continues to mean matching rows for the current query. Old
cached pages without summary remain valid and display unavailable counts as an
em dash. No placeholder sample counts or currency totals are used.

## Mobile

Search is debounced by 300 ms. Query keys include account, status, search and
sort; switching filters/search starts at page one. English and Marathi searches
work irrespective of display language. Clear restores the selected status list.
Draft search uses saved names in either language locally. Draft count is based
on this account/village's existing saved drafts; it is separate from published
inventory totals. Drafts retain their saved order. The search field has a
microphone icon matching Marketplace; tapping it shows the existing localized
voice-search-unavailable message. Speech recognition is not implemented.

Existing mutation/version/idempotency/contact handling remains unchanged. New
summary and read filters do not create orders, infer sales, change stock or expose
other sellers. Existing offline/loading/retry states remain. The decorative farm
asset is bundled locally; generation prompt/provenance is recorded in
`apps/mobile/assets/SELLER_HEADER_ARTWORK.md`.

## Verification

Isolated integration coverage exercises real owner API responses: summary counts,
all/active/low-stock states, bilingual literal search beyond the first page,
sorting, deleted/expired exclusion rules, invalid query/auth rejection and other
seller isolation. Workspace TypeScript, focused mobile/web ESLint, all 43 mobile
tests, the existing listing CRUD integration and Android export passed. Native
visual and large-text acceptance remains pending.
