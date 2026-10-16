# Buyer and seller activity requests — 2026-10-15

This revision implements the user-approved Sent/Received layout and supersedes
the inbox-only/callback-pending milestone in NOTIFY_SELLER.md. Requests express
interest and do not reserve inventory, place orders or manage transactions.

## Mobile behavior

- My Activity has Sent and Received tabs for every account, since sellers retain
  buyer capability. Buyers initially see Sent; sellers initially see Received.
- Cards show the other person's saved name/village, product photo/name, requested
  quantity/unit, request date and New/Sent, Seen or Responded state. Existing theme
  and selected language are used; no distance or unavailable quantity is invented.
- Sent has Call again. Received has Call buyer and Mark seen; after Seen it offers
  Mark responded with explicit confirmation. Received Call buyer also records Seen.
  Responded is the seller's declaration that they replied, not detected call success.
  Fetching lists/contact does not itself mark Seen or Responded. Existing system
  notices remain accessible under Received without duplicate contact-notice cards.
- Focus/mount and successful actions refresh server data. Loading, pagination,
  empty lists, errors, retry and offline warnings remain explicit. Offline writes
  and new callback lookups are disabled, not falsely queued/reported successful.

Notify seller now requires a quantity in the product's existing unit, validated
against positive available stock and minimum purchase. Marathi decimal input is
accepted. The confirmation explicitly explains that name and phone will be shared
with this seller for callback. Submitting records callbackConsent:true for that
request only. It implies no marketing or SMS/WhatsApp consent. The success sheet
still has Call again, without Request Status or View Request sections.

## API contract

- `POST /listings/:id/notify-farmer` now accepts strict
  `{quantity,callbackConsent:true}`. Quantity is positive and bounded at 1e9,
  must not exceed available stock or fall below minimum purchase, and requires a
  known unit. The old empty body remains accepted for existing clients/replays;
  partial fields or injected recipient/status fields are rejected.
- Existing idempotency and 24-hour deduplication remain. A new key with a different
  quantity/permission for the same recent request returns REQUEST_ALREADY_SENT;
  it never silently accepts a different quantity. The original key with a changed
  body is IDEMPOTENCY_CONFLICT. No inventory is decremented.
- `GET /requests?direction=sent|received&page=1&limit=20`: bearer, no-store, strict
  bounded pagination. The server derives sender/recipient from the session, never
  a query-supplied user ID. Safe DTOs have id/listingId, product name/nameMr/photoUrl/
  unit, counterpart name/village, quantity, createdAt, seenAt, respondedAt, status
  and canCall. No phone, token or internal participant IDs are returned.
- `PATCH /requests/:id` with `{action:"seen"|"responded"}`: active recipient only.
  Missing/foreign/sent-only requests share a 404. Transitions are monotonic;
  first timestamps are authoritative and repeated actions preserve them.
  Responded implies Seen. Natural request/action identity makes restart retries
  idempotent without a new key. Status actions are capped at 120 per user/hour.
- `GET /requests/:id/contact`: participant only, no-store, 60 per user/hour.
  Returns `{requestId,name,mobile}` with validated Indian E.164 number. Sender
  gets seller contact; recipient gets buyer contact only with recorded callback
  consent. Current active participants, prior interest, buyer's confirmed village
  and eligible original seller/listing are rechecked. Expired, deactivated,
  out-of-scope or unavailable targets cannot reveal contact. Each Call action
  obtains fresh contact and opens the native dialer without caching the number.

## Database and recovery

The existing BUYER_TRIED_CONTACT notification is the request; no parallel request
collection or fabricated migration is introduced. Additional data stores requested
quantity, unit, callbackConsent, product name/Marathi name/photo reference and
participant name/village snapshots. readAt represents Seen; respondedAt is nullable
until explicit response confirmation. Phone numbers are never copied into records.
Snapshots preserve the requested unit/product when a listing changes later.

The data.buyerId/type/date/id index supports Sent; the existing recipient indexes
support Received. Legacy records have unknown quantity and no callback permission.
Their recipients cannot obtain buyer numbers through these historical notices.

SQLite pending sends now store the exact operation key and quantity/permission
body before networking. Unknown outcomes lock that body for retry after restart.
Definite API rejections permit correction. Legacy key-only pending sends replay
the original empty body, without inventing quantity or upgrading consent. Changed
pending bodies are rejected; confirmed cleanup failures keep a safely replayable
snapshot. Account/village changes cancel further UI/contact side effects.

## Verification and remaining work

Isolated listing integration covers both participant views, quantities/consent,
scope/input/auth rejection, protected callbacks, legacy privacy, stable replay,
different-quantity conflicts, first Seen/Responded timestamps and no downgrades,
current-village/availability rechecks and product snapshot preservation. Mobile
regressions cover Marathi quantities, limits and exact payload/key recovery.

Native visual, large-text, keyboard, tab, dialog and phone-dialer acceptance remains
device work. There is no background request queue, OS push/SMS/WhatsApp delivery,
call-answer detection, request editing, stock reservation or order management.
