> Direct seller details revision - 2026-10-21: Product Details displays eligible
> seller contact without an Interested tap. Confirming Notify Seller records
> interest through the existing POST before sending the existing durable request.
> Merely viewing the product or canceling confirmation sends nothing. Quantity,
> callback consent, idempotency, rate limits and delivery channels are unchanged.

# Notify seller fallback — 2026-10-15

Request revision: My Activity now provides buyer Sent and seller Received cards,
quantity, explicit callback permission and Seen/Responded actions. See
`ACTIVITY_REQUESTS.md`; the original empty-body/inbox-only/callback-pending text
below describes the earlier compatible milestone.

After contact reveal, Could not reach? Notify seller opens a themed confirmation
sheet with the actual seller/product names. Confirmation explains that an in-app
notice includes the buyer's name. Cancel/close makes no request. Success appears
only after the API confirms a committed notice. It has a green tick, close control
and Call again, which revalidates contact and opens the native dialer. There is no
Request Status section, View Request or Back to Listings action. Marathi/English
copy follows the selected language and existing theme tokens.

## API and authorization

`POST /api/v1/listings/:id/notify-farmer`: bearer auth, strict JSON `{}` and a valid
Idempotency-Key. The existing listing-operation mechanism checks active sender,
serializes operations by user, hashes the target scope/request and commits the
result atomically with the notice. The first send requires a current confirmed
active village, eligible visible non-demo listing, active different seller and an
existing buyer/listing interest. Unauthorized bodies/targets cannot choose a
recipient. Each buyer is limited to 20 attempts per hourly bucket.

Response data is `{listingId,notificationId,notified:true,channel:"in_app",createdAt}`.
No phone number is stored in operation replay data. Same-key retry replays the
original committed result, even if the product later expires; it does not send a
new notice. A different target with the same key is an idempotency conflict.
Different keys from the same buyer for the same seller/listing within 24 hours
return the existing notice instead of creating duplicates.

`GET /api/v1/notifications?page=1&limit=20&language=mr`: bearer-authenticated,
no-store, strict bounded pagination and mr/en. It returns only the current
recipient's notification id/type/title/body/createdAt, plus total/page/limit.
Another user ID cannot be selected through the request. My Activity displays this
inbox, refetches on focus and supports loading, errors, retry, offline warnings
and Load more. New contact notices have both English and Marathi copy; historical
role notices without translated fields retain their stored text.

## Persistence and channels

The existing notifications collection adds BUYER_TRIED_CONTACT, optional Marathi
title/body and data containing buyerId/listingId. Notices contain buyer name and
product name, never phone numbers, OTPs or credentials. An indexed recipient/type/
listing/buyer/time query supports deduplication. Existing role notices are preserved.

Mobile saves an account/product-scoped operation key in ordered SQLite storage
before sending. Unknown outcomes retain it across restart. Success clears it;
cleanup failure retains the confirmed key for safe replay. Account switches stop
pending sends/UI updates. Offline confirmation is disabled and never reports a
queued request as sent. No general background notification queue is claimed.

This delivery is an in-app inbox notice, not SMS, WhatsApp or OS push. The UI
does not claim external delivery or provide the buyer's phone for a callback.
Paid-channel providers/consent integration and any seller callback/contact flow
remain separate work. No marketing consent is inferred or changed.

## Verification

The isolated listing integration tests cover existing interest, auth/origin/input
validation, recipient ownership, concurrent retry replay, 24-hour deduplication,
rate limits, no-store localized inbox, missing/blocked/expired targets and no raw
phone/token data in notifications. Mobile regression tests cover restart retry,
durable-write failure, cleanup failure and account switches. Native sheet, cancel,
success and Call again interactions remain device acceptance checks.
