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
