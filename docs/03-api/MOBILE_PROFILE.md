# My Profile — 2026-10-23

User-approved scope: Settings → Update profile opens My Profile. Reuse existing
theme, input/button/card components and the current village-selection screen.
The reference image supplied the form layout; the repository previously had a
Settings placeholder, not an implemented profile form, OTP change or avatar flow.

## Identity and editable fields

- First Name and Last Name come directly from the existing User.firstName and
  User.lastName. Both are read-only, styled with a subtle tinted background.
  No Full Name input, duplicate name fields or inferred historical name parts.
- User.name remains the existing display-name authority for the account header,
  seller contacts and listings. Profile Save never changes any name field.
- Primary mobile is read-only. Only the separate authenticated OTP flow changes
  it. Registration, login and village-confirmation flows are unchanged.
- Save updates address (300 characters), alternativeMobile (optional normalized
  Indian number) and occupation (100 characters), plus a version precondition.
  Empty editable values clear them. Occupation grants no capability or role.
- Village changes reuse `/village`. Photo and mobile changes are separate actions,
  and preserve in-progress editable text while refreshing its profile version.
- All form, success, conflict and OTP text supports Marathi and English.

## Self-only REST API

All routes use Node runtime, require the existing mobile bearer session, enforce
the existing Origin policy and return no-store JSON. Clients cannot supply an
account ID. These fields are not added to public listing or mobile-session DTOs.

- `GET /api/v1/users/me/profile`: returns
  `{firstName,lastName,mobile,address,alternativeMobile,occupation,photoUrl,version}`.
  Missing fields are null; version is the existing User `__v` counter.
- `PATCH /api/v1/users/me/profile`:
  `{address,alternativeMobile,occupation,version}`. Strict schema rejects names,
  primary mobile, roles, IDs and photo keys. A conditional update increments
  `__v`. Stale updates return `409 PROFILE_CONFLICT`; inactive users fail closed.
  No profile record or duplicated registered name is created.
- Profile reads stay in account-scoped memory, with zero query retention after
  unmount. Addresses and phone numbers are not written to the profile-photo
  recovery store. Saves are online-only; failures preserve visible form edits.
  Conflict reload explicitly discards unsaved text. There is no background
  profile-write queue or persistent offline text draft in this implementation.

## Profile photo

The existing Expo camera/gallery picker, native File multipart upload, bounded
5 MB JPEG/PNG/WebP validation, Sharp conversion, immutable storage and photo URL
resolver are reused. No new upload provider, library or public contact fields.

1. Pick a photo with the existing picker. Camera permission remains explicit.
2. Persist its account/village-scoped local file reference and stable operation
   key before upload. Restart recovery offers Retry photo upload.
3. Upload through the existing authenticated `POST /listings/photos` endpoint.
4. `POST /users/me/profile/photo` with `{photoObjectKey,version}` attaches only
   an existing upload owned by this user to User.profilePhotoObjectKey.
   Missing/foreign/invalid keys fail closed. Replaying an already attached key
   is idempotent. A stale version conflicts instead of overwriting another edit.
5. Clear the pending reference/local file after confirmed attachment. Server
   objects use the existing immutable photo lifecycle; no existing listing photo
   is deleted when a profile photo is changed.

The current upload/storage provider is **development-only**, as for listing
photos. Production rejects new attachments/uploads with PHOTO_STORAGE_UNAVAILABLE
until a real approved object-storage provider is wired. Existing uploaded photo
URLs use the same shareable image-serving behavior as existing listing photos.

## Primary mobile change

- `POST /users/me/mobile/send-otp` with `{mobile}` sends a challenge to a different
  available number. Returns only `{challengeId,expiresAt,resendAt}`.
- `POST /users/me/mobile/verify-otp` with `{challengeId,code}` consumes the
  requesting user's challenge and returns the fresh self-profile DTO.
- The challenge is separate from registration challenges and bound to the
  authenticated user and the exact previous mobile. HMAC hashes, five-minute
  expiry, one-minute resend delay, five attempts and user/network rate limits
  reuse the existing authentication policy. Never log or return OTPs.
- A transaction rechecks an active current session, challenge expiry/consumption,
  account state, previous mobile and target-number uniqueness (including legacy
  +91/91 forms). It updates only mobile/mobileVerified and the version counter,
  invalidates login challenges for both numbers, and revokes other device
  sessions. Names, village, capabilities and current session remain intact.
- Replay, concurrent consumption, a foreign account's challenge, expired or
  exhausted attempts fail closed. Unknown verification outcomes are reconciled
  by a self-profile read rather than resubmitting a consumed code indefinitely.
- The existing test OTP provider is **development-only**. Production requires
  a real SMS provider and otherwise returns AUTH_UNAVAILABLE. No production
  OTP or SMS integration is claimed by this change.

## Verification

Focused mobile tests cover Save's field allowlist, normalization/clearing,
validation and localized errors. Isolated MongoDB route tests use a fresh random
database and temporary photo directory; never write to the configured app DB.
They exercise authentication/origin, name/primary-phone injection rejection,
legacy names, conflict/ownership, photo references and idempotent attachment,
OTP binding/attempt limits/expiry/concurrency/replay, session revocation and the
production test-provider gate. Phone layout, camera/gallery, dialer-independent
OTP interaction and restart recovery still require device verification.
