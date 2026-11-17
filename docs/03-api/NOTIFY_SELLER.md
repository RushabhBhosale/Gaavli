## Firebase push delivery — 2026-11-17 (user approved)

New buyer requests still create the recipient-only in-app notice. Gaavli also
tries to send a Firebase Cloud Messaging (FCM) alert to the seller's opted-in
Android and iOS devices after the notice commits. Known notice IDs are claimed
once, including operation replays. A push failure leaves the in-app notice
available. Alerts contain a generic message in the device's selected Gaavli
language. Tapping one opens the signed-in notifications screen.

In **Settings → Notifications**, a signed-in user turns on **Buyer request
alerts** and grants OS permission. The authenticated
`/api/v1/notifications/push-device` endpoint reads consent (GET), opts in
(PUT), refreshes the token (PATCH), or opts out (DELETE). PUT and PATCH accept
`{token,language}`. Each method returns `{enabled}`. The server sends only to
active accounts with unexpired authenticated sessions. Logout revokes that
session's eligibility. Firebase's unregistered-token response removes the
saved token so it can be refreshed on the next app launch. Phone numbers,
buyer names and request notes remain in the protected in-app flow.

### Test push on the phone

In **Settings → Notifications**, enable **Buyer request alerts**, then tap
**Send test notification**. The app refreshes its own FCM registration and
calls `POST /api/v1/notifications/push-device/test` with the token for the
current signed-in session. The request sends one real FCM notification to
that phone. Firebase acceptance appears in Settings, and arrival appears as
an Android toast or an iOS notification while the app is open.

### Release setup

1. Build both native apps with the Firebase project for
   `com.peractoinfotech.gaavli`. The checked-in Android and iOS projects use
   the Firebase client configs supplied for that ID. Use the native projects
   when rebuilding. Their Firebase config files live inside the native folders.
2. Enable the Firebase Cloud Messaging API and set the backend secret
   `FCM_SERVICE_ACCOUNT_JSON` to a service account JSON authorized to send FCM
   messages for that project. The Android and iOS client config files are
   separate credentials from this backend key. [Firebase server setup](https://firebase.google.com/docs/cloud-messaging/send/v1-api)
3. Configure the Push Notifications capability and signing profile for the new
   Apple bundle ID. Upload its APNs authentication key to the Firebase project.
   [Firebase Apple setup](https://firebase.google.com/docs/cloud-messaging/ios/get-started)
4. Deploy the API, install the rebuilt apps, and opt in on a seller device.
   From a buyer account, send a new request for the seller's available listing.
   Check receipt with the app open and in the background, tap the alert, and
   confirm the request in the inbox. Repeat with alerts disabled.

The approved ID change makes these builds separate installs from
`com.gaavli.mobile`. Users sign in again on the new install using their
existing Gaavli account.

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

The in-app inbox notice is the durable delivery record. The UI
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
