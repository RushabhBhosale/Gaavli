# Seller activation — 2026-10-14

User-approved revision: verified buyers can become sellers before creating their
first listing. This extends the first-publication fallback in `LISTING_CRUD.md`.

- `POST /api/v1/users/me/seller`, bearer authentication, JSON body `{}`.
  Returns `{success:true,data:MobileUser}` and `Cache-Control: no-store`.
- Only the authenticated active account can activate itself. Strict validation
  rejects role, user ID, village and other injected fields; browser origin checks
  match the other mobile endpoints. Anonymous/blocked accounts receive 401.
- MongoDB's existing `User.roles` gains buyer and seller atomically, preserving
  coordinator/service-provider roles and all profile fields. There is no duplicate
  stored boolean, new account, listing, notification or contact disclosure.
- Repeated requests are naturally idempotent; an already active seller returns
  its current profile without another version increment. No operation key is
  needed for this one-way activation. Role removal is not exposed by this API.
- `MobileUser.isSeller` is derived from roles and returned by OTP verification,
  refresh, GET `/users/me`, village PATCH and activation. Older secure snapshots
  missing this field parse as false until the authenticated profile is refreshed.
- Mobile awaits API success and SecureStore persistence before changing state
  and navigating to My Listings. Offline confirmation is disabled; failures keep
  the popup retryable. A retry after local persistence failure is safe.
- Sellers retain buyer capability and Home's marketplace links. The second visible
  tab becomes My Listings, backed by GET `/listings/mine` with pagination and
  loading/error/refresh states. The illustrated empty state requires a successful
  empty owner response. Existing owned products render their actual saved fields.
- The Add first product button opens the existing `/add-listing` destination.
  Its write form, photo upload and persistent offline draft/queue are still pending.
  Activation does not implement these flows or protected seller contact access.

Verification: isolated MongoDB CRUD suite covers activation, injection/origin/auth
rejection, safe DTO, preserved capabilities, retry, profile and village persistence.
Mobile session tests cover secure snapshot restoration; Android/Hermes export
passed. Native visual acceptance on the USB phone remains pending.
