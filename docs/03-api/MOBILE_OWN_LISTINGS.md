# Mobile My Listings — 2026-10-15

My Listings uses the existing mobile theme and selected language. Its compact
cards show photo, product name, rate/unit and available quantity. The header links
to Marketplace and Add Listing. Active and Sold out tabs query the authenticated
owner API; Drafts reads actual saved account/village-scoped SQLite drafts.
Expired listings are excluded from Active. No sample listings are inserted.

## Edit

The three-dot menu opens Edit and Delete actions. Edit reuses `/add-listing?id=…`
and loads `GET /api/v1/listings/mine/:id`. Only active, unexpired products in the
owner's current confirmed village are editable, matching the server contract.
The form preserves its existing validation and photo choices/upload support.

Each edit has a separate persisted draft, original version, initial form and input
language. Changes use `PATCH /api/v1/listings/:id` with the original version and a
stable Idempotency-Key. Only changed fields are sent. Rate/quantity changes retain
the existing photo, other-language name and exact expiry. A stale version requires
an explicit reload confirmation before replacing saved edits with server values.
Uncertain failures retain the exact staged request for safe retry after restart.

## Delete

Delete asks whether to delete the product. No closes the popup without a request;
Yes sends `DELETE /api/v1/listings/:id` with its version and Idempotency-Key.
The operation is saved before networking. Unknown failures retain it for retry;
confirmed deletion removes the card, clears that product's local edit draft/photo,
refreshes buyer/owner caches and shows selected-language success feedback.
The existing backend deactivates the listing and retains database history;
this is not a hard deletion of its database record or stored server photo.

Server authorization, version conflicts and replay behavior remain documented in
`LISTING_CRUD.md`. No backend model, dependency or endpoint change was needed.

## Verification and remaining work

Shared form regression tests cover minimal patches, preserved bilingual names,
expiry/photo retention, invalid quantities, draft isolation and delete snapshots.
The isolated database/API integration suite exercises the mobile edit payload,
stale versions, repeated edit/delete keys and buyer removal after deletion.
Native visual acceptance and phone interaction checks remain pending.
Mark-sold-out, relisting expired products and deleting unpublished drafts are
separate lifecycle UI work; the Sold out tab displays existing server records.
