# Notification badge revision - 2026-10-28 (user approved)

Reuse Notification.userId/readAt and the existing Notify Seller/request record.
Authenticated headers share a red unread-count badge (hidden at zero, 99+ cap).
The existing bell route opens My Requests → Received Requests for sellers and
Notifications for buyers; role-specific request tabs remain read-only. Counts poll
every 15 seconds while active/online and refresh on focus/foreground/reconnect.
Received/notification cards use light-green unread styling. Cards at least 60%
visible for 800ms are read via the existing notifications endpoint's PATCH method;
only the recipient may mark them read. Failed updates show Retry and retain
unread styling. Fetching a page, viewing Sent Requests or opening the bell alone
does not mark all records read. Read timestamps persist across accounts/devices
in MongoDB. See API_SPEC.md for count/read contracts. This supersedes the older
no-read-mutation-on-view instructions below; coordinator management is unchanged.

# Remove mobile request message field - 2026-10-28 (user approved)

Notify Seller no longer offers a message input; new mobile requests send quantity
and callback consent only. My Requests no longer opts into message fields or
renders notes. Existing saved pending requests retain their exact payload for safe
idempotent retries. Server message compatibility and historical data are retained.
This supersedes the mobile message input/display requirements below.

# Reusable My Requests - 2026-10-27 (user approved)

One mobile screen shows Sent Requests and Notifications for buyers, plus Received
Requests for sellers. Sellers retain Sent Requests as buyers. The notification
header icon opens the Notifications tab. Requests are read-only: no Call, Seen,
Responded or other management controls. Existing request-creation logic and server
mutation endpoints are unchanged. Coordinator management screens are unchanged.

Request cards show product image/placeholder, product, participant, village,
timestamp, quantity and optional message. GET /requests accepts optional
includeBuyerMobile=true: only received requests include person.mobile (10-digit
Indian number or null). Phone release requires callback consent, existing listing
interest, active buyer/seller and accessible non-demo listing, matching seller,
active listing village/category, stock, expiry and valid buyer phone. Sent lists
never return this field. Missing permission/availability displays contact
unavailable. Participant/recipient scoping and newest-first pagination remain.

GET /notifications accepts includeReadState=true to return existing readAt as an
ISO timestamp or null. Show title, short body, timestamp, notification icon and
read/unread styling without changing stored state on viewing. All recipient
notifications are included, including contact notices backed by the same request
record; no duplicate records are created. Both extensions are opt-in so older
strict clients retain their response shape. No collection or migration is added.
Deploy backend before updating mobile. Phone data stays in account-scoped memory
queries, never public/offline listing caches. Existing logout clears the queries.

# Optional seller-request message - 2026-10-27 (user approved)

Notify Seller confirmation includes an optional multiline Message / संदेश field
using the existing Input style. Messages are plain text, trimmed, limited to 500
characters and omitted when blank. Quantity and callback consent retain their
current rules. The note is stored in the existing notification data/body and shown
in My Requests; no new conversation, channel or messaging endpoint is introduced.

The message is part of the durable pending request and idempotency payload.
Retries preserve the exact staged note; pending fields remain read-only. An
existing request with a different message conflicts instead of silently replacing
the earlier notification. Old requests without messages remain valid.

Updated request-list clients use includeMessages=true to receive optional message
fields; older clients retain their strict response shape. Notes are only exposed
through existing authenticated recipient notification/participant request APIs,
never public listings. Deploy backend before updating the mobile app.

# Cross-village seller contact and direct login - 2026-10-27 (user approved)

This revision supersedes older buyer registered-village/connection requirements
for seller contact only. Authenticated active accounts may view contact details
and contact sellers of any active, accessible listing by its ID, regardless of
the buyer's registered village. No browsing village or village connection is
required by contact APIs. The listing's own village must still be active.

- GET `/listings/:id/contact`, GET/POST `/listings/:id/interested`, and POST
  `/listings/:id/notify-farmer` share listing-based contact eligibility. Call
  reuses interested; existing contact consumers use the same phone DTO.
- Preserve listing stock/status/expiry/category, seller active status, demo
  exclusion, self-contact rejection, valid phone, auth, no-store, read/write
  quotas, quantity validation, explicit interest/consent and notification
  idempotency. Viewing contact sends no notification and records no interest.
- Request histories/callbacks retain participant-only access and callback consent.
  `canCall` and callback authorization no longer depend on the buyer's registered
  village or its connections. Inactive listings/sellers/listing villages still
  disable contact. Changing buyer village does not revoke an otherwise valid call.
- The scoped report helper and coordinator/admin discovery, mapping, reporting
  and mutation authorization remain unchanged. Guest feed/detail DTOs remain
  contact-free and guests cannot call the protected contact APIs.

First Village Selection's Already Registered? Login discards previous browsing
and product-return context before login; existing auth mode opens Login and OTP
publishes the current registered village as the initial browsing choice. Buyers
and sellers open Home with exact registered-village listings; coordinators keep
their existing landing. Contact Seller auth instead retains the browsing choice
and `contactReturnListingId`, which takes precedence over the normal landing.
No additional login-source flag or auth screen is introduced. Subsequent manual
browsing remains synchronized without updating the registered village. Logout
still clears auth, browsing and navigation context and opens first village selection.
Guest Contact Seller uses the existing native popup with Login, Create account
and Not now actions, using existing Marathi/English labels and auth form modes.

# Product return and seller actions - 2026-10-23 (user approved)

Registration from Contact seller returns to the same product after the existing
guest village is confirmed. Keep the pending product destination while OTP and
village confirmation are in progress; consume it only when that signed-in product
screen is focused. OTP does not redirect on the intermediate session update.

The existing Seller Information card loads authorized name/mobile automatically
using GET /contact. Show the phone as text, then equal-width outlined Call and
Notify buttons side by side, with phone/bell icons, thin borders, transparent
backgrounds and the existing corner radius/fonts. Call reuses POST /interested
and opens the phone dialer; Notify opens the existing quantity/consent request
confirmation. Loading, offline, authorization and error handling remain intact.
No changes to the product content, backend contracts or contact persistence.

# Guest contact confirmation - 2026-10-23 (user approved)

For a guest, Contact seller on Product Details opens a native popup saying
"You need to sign in first", with Sign in and Not now actions (Marathi/English).
Sign in opens Create your account and saves the product return destination.
Not now, back or dismissal keeps the product open without changing that
destination or starting registration. Completed registration still returns to
the selected product. Signed-in seller-contact behavior is unchanged.

# Direct seller details - 2026-10-21 (user approved)

Product Details shows seller name, phone, the listing village, Call Seller and
Notify Seller directly below Description. The Report Product button and
Interested-first reveal step are removed from this screen. The historical
Interested-first UX below is superseded; reporting APIs and existing routes remain.

GET /api/v1/listings/:id/contact returns
{listingId,seller:{name,mobile}} for an eligible authenticated mobile user.
It shares the existing transaction-based active-account/village, confirmed nearby
scope, listing/seller/category/expiry, demo, self-contact and valid-phone checks.
It shares the 120/user/hour contact-read limit, is no-store, and creates neither
interest nor notification. Normal listing/feed DTOs remain contact-free.

Call still records interest through POST /interested, rechecks eligibility and
opens the dialer. Notify confirmation records interest before submitting the
existing durable, idempotent quantity/callback-consent request. Viewing details
or opening/canceling the confirmation sends no notice. Existing GET /interested
retains its old restore-only contract for compatibility.

Contacts remain only in account/village/product-scoped memory with zero cache
retention after unmount; no phone is written to SQLite. Cold offline reads show
reconnect guidance; loading and failure/retry are distinct. Call and notification
submission require connectivity. Marathi/English labels and large-text wrapping
use the existing components. No seller photo is fabricated.

# Buyer seller-contact action — 2026-10-15

Product Details now uses a larger contained photo and larger bold seller-name and
phone text. Contact is revealed only after the verified buyer explicitly selects
Interested. Call seller and Notify seller appear only after that reveal.
Call seller revalidates the existing interest and opens the native
dialer with the server-returned number; it does not place an automatic call.
Existing theme and selected-language UI are retained. Actual seller names are
not automatically translated. Notify seller is now implemented through the
confirmation/success flow and in-app inbox in `NOTIFY_SELLER.md`. Earlier disabled
milestone notes are superseded; external SMS/WhatsApp/push remain separate work.

Reopening revision: the app now reads the current buyer's saved interest when
Product Details opens. Once interested, the same account sees seller details and
Call/Notify controls again without a second Interested tap, including after app
restart or a new sign-in. Loading or failed restoration shows loading/retry rather
than prematurely showing Interested. Offline cold restoration requires reconnecting.

## API

`POST /api/v1/listings/:id/interested`, bearer authentication, JSON body `{}`.
Unknown input fields and invalid IDs are rejected. Admin cookies do not authorize
this action; cross-origin browser requests are rejected. Responses are `no-store`.

Successful data:

```json
{
  "listingId": "<24-character MongoDB ID>",
  "interested": true,
  "seller": { "name": "<saved name>", "mobile": "+91<10 Indian digits>" }
}
```

`GET /api/v1/listings/:id/interested` restores only the authenticated buyer's
interest. It uses the same current eligibility checks and returns the protected
DTO above if an interest already exists. Otherwise it returns only
`{listingId,interested:false}`, without seller fields. It never creates/updates an
interest. It is no-store and limited separately to 120 reads per user/hour.

The service rechecks active buyer, confirmed active village, and the same listing
visibility rules used for browsing, inside a transaction. Hidden, expired,
out-of-village, blocked/missing-seller, inactive-category and demo products do not
reveal contact. Own-listing interest is rejected. Missing/invalid seller mobile
returns `422 CONTACT_UNAVAILABLE`; own products return `403 OWN_LISTING_CONTACT`.
Other unavailable listings return the existing 404. The endpoint limits each user
to 60 contact requests per hourly bucket, including retries.

## Persistence and recovery

`interests` contains only listingId, userId and timestamps, with a unique compound
listingId/userId index. Creating interest and returning protected contact use one
transaction. Concurrent requests and retries reuse this natural identity; no
duplicate interest or stored contact response is created. Every retry rechecks
current eligibility rather than replaying obsolete private contact data.

Normal listing GET responses still omit seller identity/contact and never create an
interest. Mobile uses an account/village/product-scoped in-memory contact query,
with zero retention after unmount and no SQLite or persisted query cache. The
server's interest record restores authorized contact on reopening, with current
eligibility rechecked. Scope changes remount the component.
Returning from the dialer preserves the current screen's revealed
details and does not show Interested again. Call revalidates through the server
each time. Phone dialer and transient network failures retain already revealed
details and show a localized error; an authorization/unavailable rejection clears
the contact. Unknown network outcomes
show failure and can be safely retried, including after restart. New contact
actions require connectivity; no background interest queue is claimed.

## Verification

The isolated listing-route integration suite covers no contact/interest on normal
browsing, bearer/origin/body checks, concurrent idempotency, real protected DTOs,
demo/visibility/self restrictions, invalid/missing contact, throttling and rejecting
previous interests after listing expiry. Mobile regression coverage rejects unsafe
phone strings and additional private fields. Native dialer and visual acceptance
remain device checks.
