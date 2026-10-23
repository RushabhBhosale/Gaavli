> Temporary hosted OTP testing - 2026-10-23 (explicit user approval):
> configured test OTP and mobile sessions now work in production for APK testing.
> Set OTP_PROVIDER=test and OTP_TEST_CODE=123456 on the server, with a valid
> MOBILE_AUTH_SECRET. No allowlist or real SMS is added. See MOBILE_ONBOARDING.md.

> Browsing village - 2026-10-23: listing feed/detail GETs honor the optional
> sourceVillageId for guests and signed-in readers. Validate an active source;
> retain registered-account contact/write/coordinator authorization. Omitting
> it retains the registered-village default. See [BROWSING_VILLAGE.md](BROWSING_VILLAGE.md).

> My Profile - 2026-10-23: authenticated self-only GET/PATCH
> `/api/v1/users/me/profile`, POST `/users/me/profile/photo` and POST
> `/users/me/mobile/{send-otp,verify-otp}` reuse existing bearer sessions and
> no-store/origin protections. Save strictly excludes registered names and
> primary mobile. See [MOBILE_PROFILE.md](MOBILE_PROFILE.md) for contracts,
> optimistic conflicts, OTP protections and development provider limitations.

> Direct seller details - 2026-10-21: authenticated GET
> `/api/v1/listings/:id/contact` returns `{listingId,seller:{name,mobile}}`
> without creating interest or notifications. It reuses current contact eligibility
> and read rate limits, with no-store responses. Existing interested routes retain
> their contracts. See [BUYER_CONTACT.md](BUYER_CONTACT.md).

> Voice search - 2026-10-21: Marketplace uses native speech-to-text and the
> existing listing search API. Exact active Product Master names expand to paired
> Marathi/English names or productId; all existing visibility/pagination rules
> remain. No voice/audio API is added. See `VOICE_SEARCH.md`.
>
> Coordinator role visibility - 2026-10-21: mobile user/session DTOs expose
> `isCoordinator` separately from `coordinatorVillages`. An active admin-granted
> role selects coordinator navigation; protected coordinator endpoints still
> require an active village assignment. See `COORDINATOR_MOBILE.md`.
>
> Seller Products revision - 2026-10-21: existing GET `/api/v1/listings/mine`
> accepts bilingual literal `search`, deterministic `sort`, and additional all /
> low_stock status filters. Response adds owner-only inventory summary counts;
> existing page total remains search/status filtered. See `SELLER_PRODUCTS.md`.
>
> Product Master revision - 2026-10-21: authenticated GET
> `/api/v1/product-master?search=` returns all active master products, with literal
> bilingual search and existing no-store envelope. Listing create/PATCH accepts
> optional productId; owner DTOs return ID/null. Linked metadata is server-owned;
> legacy callers remain valid. See `docs/03-api/PRODUCT_MASTER.md`.

> Village-product filters — 2026-10-21: GET `/api/v1/listings` accepts optional
> `villageId`, restricted to the authenticated buyer's active selected village and
> directly connected active villages. Foreign/disconnected selection returns 403
> `VILLAGE_FILTER_UNAVAILABLE`. Listing pages add `villageCounts` with id/name/
> nameMr/count, respecting search/group/visibility before village selection and
> pagination. See `MOBILE_MARKETPLACE.md`.

> Marketplace category revision — 2026-10-19: listing productGroup queries,
> create/PATCH, owner DTOs and storage also support `homemade`. Marketplace now
> shows five illustrated categories with Vegetables selected initially and no
> All chip. Other/null legacy groups are unchanged; unfiltered API/Home still
> include eligible records. See `MOBILE_MARKETPLACE.md` and `ADD_LISTING.md`.

> Add Village filter-pill revision — 2026-10-19: candidate `area` also accepts
> `other_talukas`, matching other populated talukas in the assigned source
> district before pagination. Mobile shows source Taluka / Other Talukas /
> Nearby by GPS, with GPS using existing coordinate suggestions.

> Add Village picker revision — 2026-10-19: coordinator village candidate reads
> accept `area=all|taluka|district`, default all. Area filtering uses the assigned
> source village before pagination/counting. Multiple selections reuse existing
> individually idempotent connection writes. See `COORDINATOR_MOBILE.md`.

> Add Buyer village-list revision — 2026-10-19: POST `/api/v1/coordinator/buyers`
> accepts optional `targetVillageId` from the active `/api/v1/villages` list.
> Requires the actor's existing active coordinator assignment; the target selects
> only the new buyer's village and grants no management scope. Active target is
> rechecked on writes/replays. Omission keeps the assigned-village default.

> Coordinator revision — 2026-10-19: `/api/v1/coordinator` now provides dashboard,
> pre-registration, scoped directory/corrections, connections/candidates, activity,
> read-only listing detail and reports/moderation. Product complaint creation and
> Super Admin report reads are also available. Current route/DTO/authorization
> contracts are in `COORDINATOR_MOBILE.md`. Historical village-only discovery is
> superseded by active bidirectional manually confirmed connections.

> Listing revision — 2026-10-16: create/PATCH accept optional nullable description
> (trimmed plain text up to 2,000 characters); owner/buyer DTOs return string|null.
> Product search matches every whitespace-separated literal partial term across
> productName/productNameMr/description, case-insensitively. Category dropdowns
> display the API's actual name and defaultShelfLife. See LISTING_CRUD.md,
> ADD_LISTING.md and MOBILE_MARKETPLACE.md for the implemented contracts.

> Current revision — 2026-10-13, mobile Phases 2–4: welcome language selection
> with Get started → required first/last name and Indian mobile → OTP →
> confirmed village. See `docs/03-api/MOBILE_ONBOARDING.md` (repository root)
> for the implemented API, session, model, offline and security contract.
> This supersedes earlier Phase-1-only/scaffold and mobile guest-first wording.
> Verified users may have no village; existing display names stay intact and
> unknown first/last names are not inferred. Test OTP and test sessions are
> development-only; production requires a real SMS provider.

# Village creation coordinates — 2026-10-12

Mobile listing reads — 2026-10-14: authenticated database-only listing page and
detail endpoints are implemented. Their current contracts and compatibility
limits are in [MOBILE_MARKETPLACE.md](MOBILE_MARKETPLACE.md). Historical listing
mutation examples below remain target specifications, not implemented writes.

Admin `POST /api/v1/admin/villages` allows latitude and longitude to be omitted
together. Add Village does not request coordinates; omitted coordinates leave
location unset, and the listing DTO returns null latitude/longitude. Existing
clients may supply a valid coordinate pair. `PUT /api/v1/admin/villages/:id`
continues to require valid coordinates and a version. Nearby villages remain
manually mapped, independently of coordinates.

# Implementation Architecture Note

Listing CRUD implementation — 2026-10-14: bearer-authenticated create/edit/soft
delete, owned reads, sold-out/relist and active categories are implemented. Their
actual field names, retry/version rules and database additions are in
[LISTING_CRUD.md](LISTING_CRUD.md), superseding historical illustrative writes.

Phase 1 mobile foundation — 2026-10-13: `GET /api/v1/health` is public liveness
only. HTTP 200: `{ "success": true, "data": { "status": "ok" } }` with
`Cache-Control: no-store`. No DB query, credentials, versions or environment
details are exposed. It does not attest database readiness. No CORS wildcard or
admin authentication change was introduced; native clients call it over HTTPS
(local HTTP allowed only in development).

Mobile onboarding is now registration-first with no guest entry point and required
first name/last name/mobile before OTP, followed by village selection. Existing
mobile auth/reference contracts and nullable pre-village account support still
need implementation in later phases. Phase 1 does not issue tokens or accounts.

The API remains REST/JSON under `/api/v1`. Mobile requires stable network endpoints; Next.js Server Actions do not replace this API. In `apps/web`, Next.js Route Handlers are thin transport adapters that authenticate, authorize, validate with Zod, then call reusable server-side application services. Services use repositories/providers. Return explicit API DTOs, stable errors, pagination, idempotency, and conflict semantics. Keep MongoDB/Mongoose server-only.


# `docs/03-api/API_SPEC.md`

````md
# Gaavli – API Specification

**Document:** API_SPEC.md
**Purpose:** Authoritative API contract for Gaavli
**Status:** Authoritative
**Audience:** AI coding agents, backend developers, mobile developers, admin developers
**Last Updated:** YYYY-MM-DD

---

# 1. Purpose

This document defines the API contract between:

- Gaavli Mobile App
- Gaavli Admin App
- Gaavli Backend
- Approved external service adapters

This document defines:

- API endpoints
- HTTP methods
- Authentication
- Authorization
- Request parameters
- Request bodies
- Validation
- Response structures
- Error codes
- Pagination
- Filtering
- Sorting
- Idempotency
- Offline-compatible operations
- Conflict handling
- Side effects
- API security rules

AI coding agents MUST read this document before creating or modifying API endpoints.

---

# 2. API Architecture

Gaavli uses:

- REST
- HTTPS
- JSON
- Next.js Route Handlers
- TypeScript
- Zod
- MongoDB/Mongoose

Base path:

```text
/api/v1
````

Example:

```text
GET /api/v1/listings
```

Mobile communicates through REST endpoints. The Admin browser must not access MongoDB; its Next.js server-side flows use the same application services, authorization, validation, and business rules as API Route Handlers.

---

# 3. API Design Principles

The API MUST be:

* Simple
* Predictable
* Secure
* Versioned
* Validated
* Idempotent where required
* Offline-compatible where required
* Mobile-friendly
* Backward-compatible where practical

The API exposes **business capabilities**, not raw database operations.

---

# 4. API Source of Truth

The server is authoritative.

The API MUST NOT trust:

* Client roles
* Client ownership
* Client permissions
* Client village assignments
* Client listing status
* Client timestamps
* Client expiry calculations
* Client notification consent
* Client authorization decisions

The server determines the final result.

---

# 5. Base URL

Environment-specific URLs MUST be configured outside application source code.

Example:

```text
Development:
https://dev-api.example.com/api/v1

Staging:
https://staging-api.example.com/api/v1

Production:
https://api.example.com/api/v1
```

Do not hardcode environment URLs in business logic.

---

# 6. Common Request Headers

Recommended headers:

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <access-token>
X-Request-Id: <request-id>
```

For idempotent writes:

```http
Idempotency-Key: <operation-id>
```

---

# 7. Request ID

Every request should have a request identifier.

Example:

```http
X-Request-Id: 01JABC123
```

The server may generate one if the client does not provide it.

Request IDs are used for:

* Debugging
* Logging
* Monitoring
* Support

Request ID is NOT an idempotency mechanism.

---

# 8. Authentication

Primary authentication:

```text
Mobile Number + OTP
```

Authentication flow:

```text
POST /auth/send-otp
        ↓
OTP provider
        ↓
POST /auth/verify-otp
        ↓
Authenticated session
```

Sensitive authentication data MUST be stored securely on the client.

---

# 9. Authentication Header

Authenticated APIs use:

```http
Authorization: Bearer <access-token>
```

The server MUST validate:

* Token validity
* Expiry
* Session status
* User status

---

# 10. Authentication Endpoints

## API Matrix

| Method | Endpoint           | Auth          | Offline | Idempotency |
| ------ | ------------------ | ------------- | ------- | ----------- |
| POST   | `/auth/send-otp`   | No            | No      | No          |
| POST   | `/auth/verify-otp` | No            | No      | No          |
| POST   | `/auth/refresh`    | Refresh token | No      | No          |
| POST   | `/auth/logout`     | Yes           | No      | No          |
| GET    | `/users/me`        | Yes           | Cache   | No          |
| PATCH  | `/users/me`        | Yes           | Yes     | Yes         |

---

# 11. Send OTP

### Method

```http
POST /api/v1/auth/send-otp
```

### Authentication

None.

### Request

```json
{
  "mobile": "+91XXXXXXXXXX"
}
```

### Validation

* Mobile required
* Valid Indian mobile format
* Rate limited

### Success

```http
200 OK
```

```json
{
  "success": true,
  "data": {
    "otpRequestId": "otp_req_123",
    "expiresInSeconds": 300,
    "resendAfterSeconds": 30
  }
}
```

### Errors

```text
400 VALIDATION_ERROR
429 OTP_RATE_LIMITED
500 INTERNAL_ERROR
502 OTP_PROVIDER_ERROR
```

---

# 12. Verify OTP

### Method

```http
POST /api/v1/auth/verify-otp
```

### Authentication

None.

### Request

```json
{
  "otpRequestId": "otp_req_123",
  "mobile": "+91XXXXXXXXXX",
  "otp": "123456"
}
```

### Success

```http
200 OK
```

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": {
      "id": "user_123",
      "name": "Ramesh",
      "roles": ["BUYER"],
      "villageId": "village_123"
    }
  }
}
```

### Errors

```text
400 VALIDATION_ERROR
401 INVALID_OTP
401 OTP_EXPIRED
429 OTP_ATTEMPTS_EXCEEDED
```

---

# 13. Refresh Token

```http
POST /api/v1/auth/refresh
```

Returns a new access token/session according to the authentication implementation.

---

# 14. Logout

```http
POST /api/v1/auth/logout
```

Authentication required.

The server invalidates the applicable session where supported.

Client clears sensitive credentials.

---

# 15. Current User

```http
GET /api/v1/users/me
```

Authentication required.

Example response:

```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "mobile": "+91XXXXXXXXXX",
    "name": "Ramesh",
    "roles": [
      "BUYER"
    ],
    "village": {
      "id": "village_123",
      "name": "Nerle"
    },
    "sellerStatus": false
  }
}
```

---

# 16. Update Current User

```http
PATCH /api/v1/users/me
```

Authentication required.

Example:

```json
{
  "name": "Ramesh",
  "villageId": "village_123"
}
```

The server determines which fields may be changed.

---

# 17. Global API Endpoint Matrix

## Authentication / Users

| Method | Endpoint           | Auth    | Offline | Idempotency |
| ------ | ------------------ | ------- | ------- | ----------- |
| POST   | `/auth/send-otp`   | No      | No      | No          |
| POST   | `/auth/verify-otp` | No      | No      | No          |
| POST   | `/auth/refresh`    | Refresh | No      | No          |
| POST   | `/auth/logout`     | Yes     | No      | No          |
| GET    | `/users/me`        | Yes     | Cache   | No          |
| PATCH  | `/users/me`        | Yes     | Yes     | Yes         |

## Villages

| Method | Endpoint           | Auth     | Offline | Idempotency |
| ------ | ------------------ | -------- | ------- | ----------- |
| GET    | `/villages`        | Optional | Cache   | No          |
| GET    | `/villages/:id`    | Optional | Cache   | No          |
| GET    | `/villages/nearby` | Optional | Limited | No          |

## Categories

| Method | Endpoint          | Auth     | Offline | Idempotency |
| ------ | ----------------- | -------- | ------- | ----------- |
| GET    | `/categories`     | Optional | Cache   | No          |
| GET    | `/categories/:id` | Optional | Cache   | No          |

## Listings

| Method | Endpoint                      | Auth     | Offline | Idempotency |
| ------ | ----------------------------- | -------- | ------- | ----------- |
| GET    | `/listings`                   | Optional | Cache   | No          |
| GET    | `/listings/:id`               | Optional | Cache   | No          |
| POST   | `/listings`                   | Yes      | **Yes** | **Yes**     |
| PATCH  | `/listings/:id`               | Yes      | **Yes** | **Yes**     |
| POST   | `/listings/:id/sold-out`      | Yes      | **Yes** | **Yes**     |
| POST   | `/listings/:id/relist`        | Yes      | **Yes** | **Yes**     |
| POST   | `/listings/:id/deactivate`    | Yes      | Yes     | Yes         |
| POST   | `/listings/:id/interested`    | Yes      | **Yes** | **Yes**     |
| POST   | `/listings/:id/notify-farmer` | Yes      | Yes     | Yes         |

## Search

| Method | Endpoint  | Auth     | Offline     | Idempotency |
| ------ | --------- | -------- | ----------- | ----------- |
| GET    | `/search` | Optional | Cached only | No          |

## Services

| Method | Endpoint                   | Auth     | Offline | Idempotency |
| ------ | -------------------------- | -------- | ------- | ----------- |
| GET    | `/services`                | Optional | Cache   | No          |
| GET    | `/services/:id`            | Optional | Cache   | No          |
| POST   | `/services`                | Yes      | Yes     | Yes         |
| PATCH  | `/services/:id`            | Yes      | Yes     | Yes         |
| POST   | `/services/:id/deactivate` | Yes      | Yes     | Yes         |

## Notifications

| Method | Endpoint                           | Auth | Offline | Idempotency |
| ------ | ---------------------------------- | ---- | ------- | ----------- |
| GET    | `/notifications`                   | Yes  | Cache   | No          |
| POST   | `/notifications/:id/read`          | Yes  | Yes     | Yes         |
| GET    | `/notification-preferences`        | Yes  | Cache   | No          |
| PATCH  | `/notification-preferences`        | Yes  | Yes     | Yes         |
| POST   | `/notifications/subscriptions`     | Yes  | Yes     | Yes         |
| DELETE | `/notifications/subscriptions/:id` | Yes  | Yes     | Yes         |

## Consent

| Method | Endpoint   | Auth | Offline | Idempotency |
| ------ | ---------- | ---- | ------- | ----------- |
| GET    | `/consent` | Yes  | Cache   | No          |
| PATCH  | `/consent` | Yes  | Yes     | Yes         |

## Uploads

| Method | Endpoint           | Auth | Offline | Idempotency |
| ------ | ------------------ | ---- | ------- | ----------- |
| POST   | `/uploads/presign` | Yes  | No      | Yes         |

## Admin

| Method | Endpoint                         | Auth | Role        |
| ------ | -------------------------------- | ---- | ----------- |
| GET    | `/admin/users`                   | Yes  | Admin       |
| GET    | `/admin/listings`                | Yes  | Admin       |
| POST   | `/admin/listings/:id/deactivate` | Yes  | Admin       |
| GET    | `/admin/villages`                | Yes  | Admin       |
| PATCH  | `/admin/villages/:id`            | Yes  | Admin       |
| POST   | `/admin/coordinators`            | Yes  | Super Admin |
| DELETE | `/admin/coordinators/:id`        | Yes  | Super Admin |
| GET    | `/admin/audit`                   | Yes  | Admin       |
| GET    | `/admin/platform-settings`       | Yes  | Super Admin |
| PATCH  | `/admin/platform-settings`       | Yes  | Super Admin |

---

# 18. Standard Success Response

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

`meta` is optional.

---

# 19. Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please provide a valid item name.",
    "details": {}
  },
  "requestId": "01JABC123"
}
```

---

# 20. HTTP Status Codes

| Status | Usage                               |
| ------ | ----------------------------------- |
| 200    | Successful request                  |
| 201    | Resource created                    |
| 202    | Accepted                            |
| 204    | Successful with no body             |
| 400    | Invalid request                     |
| 401    | Authentication failure              |
| 403    | Authorization failure               |
| 404    | Resource not found                  |
| 409    | Business/data conflict              |
| 422    | Validation failure where applicable |
| 429    | Rate limited                        |
| 500    | Internal server error               |
| 502    | External provider failure           |
| 503    | Temporarily unavailable             |

---

# 21. Standard Error Codes

```text
AUTH_REQUIRED
INVALID_TOKEN
TOKEN_EXPIRED
INVALID_OTP
OTP_EXPIRED
OTP_RATE_LIMITED
OTP_ATTEMPTS_EXCEEDED

VALIDATION_ERROR
NOT_FOUND
FORBIDDEN
UNAUTHORIZED

LISTING_NOT_FOUND
LISTING_NOT_ACTIVE
LISTING_NOT_OWNED
LISTING_EXPIRED
DUPLICATE_LISTING

STALE_VERSION
CONFLICT
DUPLICATE_OPERATION

RATE_LIMITED

SYNC_RETRYABLE
SYNC_PERMANENT_FAILURE
SYNC_CONFLICT

PROVIDER_ERROR
INTERNAL_ERROR
```

Error codes are part of the API contract and should remain stable.

---

# 22. Pagination

Collection endpoints support:

```text
?page=1&limit=20
```

Maximum limit MUST be enforced.

Example:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "hasNextPage": true
  }
}
```

Large collections MUST NOT be returned without pagination.

---

# 23. Filtering

Example:

```text
GET /api/v1/listings
?villageId=village_123
&categoryId=vegetables
&status=ACTIVE
```

Only approved filter fields are accepted.

---

# 24. Sorting

Example:

```text
GET /api/v1/listings?sort=createdAt&order=desc
```

Only approved fields can be used for sorting.

Never allow arbitrary MongoDB field expressions.

---

# 25. Village APIs

## List Villages

```http
GET /api/v1/villages
```

Optional:

```text
?search=Nerle
?district=Sindhudurg
?taluka=Vaibhavwadi
```

---

## Village Detail

```http
GET /api/v1/villages/:id
```

---

## Nearby Villages

```http
GET /api/v1/villages/nearby
```

Parameters:

```text
lat
lng
radiusKm
```

Example:

```text
GET /api/v1/villages/nearby?lat=16.123&lng=73.456&radiusKm=10
```

IMPORTANT:

Nearby results are suggestions.

They do not automatically change authoritative village relationships.

---

# 26. Category APIs

## Implemented Admin category directory — 2026-10-13

`GET /api/v1/admin/categories` requires an active Super Admin browser session.
Query: `search` (literal English/Marathi name, max 100 characters), `page`
(default 1), `limit` (default 10, max 100), `sort` (`sortOrder` default, `name`,
`defaultShelfLife`, `notifyMode`, `activeListings`), `direction` (`asc`/`desc`).
Returns the existing success envelope with `{ categories, total, page, limit }`.
Each safe category DTO contains `id`, `code`, `name`, `nameMr`,
`defaultShelfLife`, `notifyMode`, `activeListings`. Text fields sort lexically;
counts sort numerically. Pages clamp to the last available page.

`POST /api/v1/admin/categories` requires the same session and same-origin JSON.
Body: `code` (2–40 uppercase letters/numbers/underscores, starting with a letter),
`name`, `nameMr` (2–100 characters), `defaultShelfLife` (1–100 characters),
`notifyMode` (`daily_digest`, `change_only`, `weekly_digest`). Unknown fields are
rejected. Returns `{ id }` with HTTP 201. Duplicate codes return 409 CONFLICT.
Creation and `CATEGORY_CREATED` audit commit together in a MongoDB transaction.
Both endpoints use `Cache-Control: no-store`. Send timing is omitted from this
admin interface. Notification scheduling, category edit/delete and the public
reference APIs below remain separate unfinished work.

Active counts include unexpired active listings linked by ObjectId/string
`categoryId` or legacy `category` matching the stable category code. Legacy generic
`Produce` listings are not assigned to a tier automatically.

## List

```http
GET /api/v1/categories
```

Categories are server-controlled.

Example categories:

```text
PERISHABLE
RECURRING_SUPPLY
MID_SHELF_LIFE
LONG_SHELF_LIFE
```

---

# 27. Listing APIs

## List Listings

```http
GET /api/v1/listings
```

Supported filters may include:

```text
villageId
categoryId
status
availableNow
search
page
limit
sort
order
```

---

## Get Listing

```http
GET /api/v1/listings/:id
```

---

## Create Listing

```http
POST /api/v1/listings
```

Authentication required.

Idempotency required.

Example:

```json
{
  "itemName": "Tomato",
  "categoryId": "perishable",
  "quantity": 10,
  "unit": "kg",
  "rate": 40,
  "villageId": "village_123",
  "expiresAt": "2026-10-10T12:00:00.000Z",
  "photoObjectKey": "listings/abc.jpg"
}
```

The server determines:

* Seller
* Ownership
* Allowed village
* Valid category
* Initial status
* Expiry validity
* Duplicate status
* Listing limits

---

# 28. Offline Listing Creation

The mobile app may create a local draft while offline.

The operation eventually becomes:

```http
POST /api/v1/listings
Idempotency-Key: operation-123
```

The server MUST ensure exactly one logical creation.

The API response is authoritative.

---

# 29. Update Listing

```http
PATCH /api/v1/listings/:id
```

Authentication required.

Idempotency required for offline-capable mutations.

Example:

```json
{
  "quantity": 15,
  "rate": 45,
  "version": 3
}
```

The server MUST verify ownership and current state.

---

# 30. Listing State Transitions

Important state transitions should be explicit business operations.

Example:

```http
POST /api/v1/listings/:id/sold-out
```

```http
POST /api/v1/listings/:id/relist
```

```http
POST /api/v1/listings/:id/deactivate
```

Do not allow arbitrary client-provided status changes such as:

```json
{
  "status": "ACTIVE"
}
```

unless specifically defined by the API contract.

---

# 31. Sold Out

```http
POST /api/v1/listings/:id/sold-out
```

Authentication required.

Idempotent.

If already SOLD_OUT, repeated request should not create a duplicate side effect.

---

# 32. Relist

```http
POST /api/v1/listings/:id/relist
```

Server validates:

* Ownership
* Current status
* Expiry
* Duplicate active listing
* Listing limits
* User status
* Village relationship

---

# 33. Deactivate

```http
POST /api/v1/listings/:id/deactivate
```

Server validates authorization.

Prefer deactivation over hard deletion where history or references matter.

---

# 34. Interested

Implemented buyer-contact revision — 2026-10-15: the explicit Interested/Call
action accepts a strict empty JSON body and returns protected seller name/mobile
in addition to listingId/interested after authorization. Normal browsing DTOs stay
contact-free. See `BUYER_CONTACT.md` for eligibility, natural-key idempotency,
throttling and the response contract; the earlier minimal example below remains
a subset of the response.

```http
POST /api/v1/listings/:id/interested
```

Authentication required.

Idempotent.

Repeated requests MUST NOT create duplicate interest records.

Response:

```json
{
  "success": true,
  "data": {
    "listingId": "listing_123",
    "interested": true
  }
}
```

---

# 35. Notify Farmer

Buyer/seller requests revision: quantity and callback permission, participant
Sent/Received lists, recipient Seen/Responded actions and protected callback APIs
are implemented in `ACTIVITY_REQUESTS.md`. Existing empty-body notification sends
remain supported for old clients/replays, without granting callback permission.

Implemented in-app fallback — 2026-10-15: authenticated strict empty body plus
Idempotency-Key, prior interest/current eligibility checks, durable replay and
24-hour deduplication now create an actual recipient inbox notice. Mobile uses
confirmation/success sheets with Call again. Recipient-only notifications reads
power My Activity. See `NOTIFY_SELLER.md`; SMS/WhatsApp/push are not delivered by
this implementation.

```http
POST /api/v1/listings/:id/notify-farmer
```

The server validates:

* Listing exists
* Listing is eligible
* User is authorized
* Notification consent
* Rate limits

This does not create an order.

---

# 36. Search

```http
GET /api/v1/search
```

Example:

```text
GET /api/v1/search?q=tomato&villageId=village_123
```

Search may use MongoDB Atlas Search.

Search should support:

* Marathi
* Hindi
* English
* Typo tolerance
* Item names
* Keywords
* Categories

---

# 37. Available Now

```text
GET /api/v1/search?availableNow=true
```

Availability is determined by server state.

Client cache MUST NOT be treated as guaranteed current availability.

---

# 38. Previously Available

```text
GET /api/v1/search?previouslyAvailable=true
```

Results must clearly indicate that the item is not guaranteed to be currently available.

---

# 39. Notify-Me Subscription

```http
POST /api/v1/notifications/subscriptions
```

Example:

```json
{
  "itemQuery": "tomato",
  "villageId": "village_123"
}
```

Idempotent where the same logical subscription already exists.

---

# 40. Services

## List Services

```http
GET /api/v1/services
```

Filters:

```text
profession
category
villageId
keyword
page
limit
```

---

## Get Service

```http
GET /api/v1/services/:id
```

---

## Create Service

```http
POST /api/v1/services
```

Authentication required.

Example:

```json
{
  "profession": "Electrician",
  "description": "Home electrical work",
  "villageId": "village_123",
  "keywords": [
    "wiring",
    "fan",
    "switch"
  ]
}
```

The provider is self-declared unless an approved verification system exists.

---

## Update Service

```http
PATCH /api/v1/services/:id
```

Only owner or authorized admin.

---

## Deactivate Service

```http
POST /api/v1/services/:id/deactivate
```

---

# 41. Notifications

## List Notifications

```http
GET /api/v1/notifications
```

---

## Mark Read

```http
POST /api/v1/notifications/:id/read
```

Idempotent.

---

## Notification Preferences

```http
GET /api/v1/notification-preferences
```

```http
PATCH /api/v1/notification-preferences
```

Example:

```json
{
  "push": true,
  "sms": false,
  "whatsapp": true
}
```

---

# 42. Consent

Registration is NOT marketing consent.

## Get Consent

```http
GET /api/v1/consent
```

## Update Consent

```http
PATCH /api/v1/consent
```

Example:

```json
{
  "marketingWhatsapp": true,
  "marketingSms": false
}
```

Consent history should be retained where required.

---

# 43. Uploads

```http
POST /api/v1/uploads/presign
```

Example:

```json
{
  "fileName": "tomato.jpg",
  "contentType": "image/jpeg",
  "purpose": "LISTING_PHOTO"
}
```

The server validates:

* User authorization
* File purpose
* File type
* File size
* Upload expiry

MongoDB stores metadata/reference.

Actual image bytes are stored in object storage.

---

# 44. Admin APIs

Implemented village admin transport update (2026-10-12):
`POST /api/v1/admin/villages` creates villages, `PUT /api/v1/admin/villages/:id`
replaces editable village details, `PATCH .../:id/status` activates/deactivates,
`GET .../:id/dependencies` reports linked records, and `DELETE .../:id` accepts
`{ version }` and deletes only unreferenced villages. All are Super Admin-only
with same-origin mutation protection and transactionally committed audit records.
Coordinator selection is optional with maximum one user ID per village, per the
user-approved product revision. Assigned coordinator DTOs contain user ID/name,
not contact information. Deletion requires a fresh server-side dependency check;
links or stale versions return 409. Detailed payloads and supported dependency
collections are documented in `apps/web/docs/API_SPEC.md`. Public/mobile reference
APIs and authoritative nearby mappings are not changed by these admin endpoints.

Admin endpoints require server-side authorization.

Examples:

```text
GET    /admin/users
GET    /admin/listings
POST   /admin/listings/:id/deactivate

GET    /admin/villages
PATCH  /admin/villages/:id

POST   /admin/coordinators
DELETE /admin/coordinators/:id

GET    /admin/audit

GET    /admin/platform-settings
PATCH  /admin/platform-settings
```

---

# 45. Authorization Model

Primary roles:

```text
USER
COORDINATOR
SUPER_ADMIN
```

User capabilities may include:

```text
BUYER
SELLER
SERVICE_PROVIDER
```

Seller status is earned when the first listing is successfully created.

Coordinator is administratively granted.

Super Admin is structurally separate.

---

# 46. Authorization Matrix

| Operation                | Guest | User | Seller | Coordinator | Super Admin |
| ------------------------ | ----: | ---: | -----: | ----------: | ----------: |
| Browse listings          |   Yes |  Yes |    Yes |         Yes |         Yes |
| Search                   |   Yes |  Yes |    Yes |         Yes |         Yes |
| View services            |   Yes |  Yes |    Yes |         Yes |         Yes |
| Create listing           |    No |  Yes |    Yes |         Yes |         Yes |
| Edit own listing         |    No |  Yes |    Yes |         Yes |         Yes |
| Edit another listing     |    No |   No |     No |     Limited |         Yes |
| Mark Interested          |    No |  Yes |    Yes |         Yes |         Yes |
| Create service           |    No |  Yes |    Yes |         Yes |         Yes |
| Manage assigned villages |    No |   No |     No |         Yes |         Yes |
| Manage all villages      |    No |   No |     No |          No |         Yes |
| Manage users             |    No |   No |     No |     Limited |         Yes |
| Manage platform settings |    No |   No |     No |          No |         Yes |

---

# 47. Offline API Rules

Offline-capable mutations MUST:

* Accept stable idempotency keys.
* Be safe to retry.
* Validate server-side.
* Return authoritative state.
* Return appropriate conflicts.
* Avoid duplicate side effects.

Detailed offline behavior is defined in:

```text
docs/OFFLINE_SYNC.md
```

---

# 48. Conflict Handling

Conflicts use:

```http
409 Conflict
```

Example:

```json
{
  "success": false,
  "error": {
    "code": "STALE_VERSION",
    "message": "This listing has changed. Please refresh before updating."
  },
  "data": {
    "entityType": "LISTING",
    "entityId": "listing_123",
    "serverState": {}
  }
}
```

The client must not blindly overwrite server state.

---

# 49. API Time Format

All timestamps:

```text
ISO 8601 UTC
```

Example:

```text
2026-10-06T12:30:00.000Z
```

Server owns authoritative timestamps.

---

# 50. API DTO Rule

Do NOT return raw Mongoose documents.

Use explicit DTOs:

```text
Mongo Document
      ↓
Mapper
      ↓
API DTO
      ↓
Client
```

This prevents accidental exposure of internal fields.

---

# 51. API Security

Every protected endpoint must consider:

```text
Authentication
Authorization
Input validation
Ownership
Village scope
Rate limiting
Idempotency
Privacy
Audit
```

---

# 52. API Performance

Collection APIs MUST use:

* Pagination
* Appropriate indexes
* Limited fields
* Efficient queries
* Reasonable response sizes

Do not return the entire database collection.

---

# 53. API Change Rules

Before changing an existing API:

1. Search mobile usage.
2. Search admin usage.
3. Search offline queue usage.
4. Check existing tests.
5. Check deployed-client compatibility.
6. Determine whether change is breaking.
7. Update API_SPEC.md.
8. Update tests.
9. Update implementation status.

---

# 54. AI Coding Agent Rules

Before implementing an API module, the AI agent MUST:

1. Read `AGENTS.md`.
2. Read `docs/02-architecture/ARCHITECTURE.md`.
3. Read this `docs/03-api/API_SPEC.md`.
4. Read `docs/04-database/DATABASE.md`.
5. Read `docs/OFFLINE_SYNC.md` if relevant.
6. Inspect existing implementation.
7. Reuse existing patterns.
8. Reuse existing validation.
9. Reuse existing authorization.
10. Add tests.
11. Update documentation when the contract changes.

AI agents MUST NOT invent API contracts when an approved contract already exists.

---

# 55. New Endpoint Checklist

Before adding an endpoint:

```text
[ ] Does an existing endpoint already solve this?
[ ] Is this a distinct business operation?
[ ] What module owns it?
[ ] Is authentication required?
[ ] What authorization is required?
[ ] What request fields are required?
[ ] What Zod schema validates it?
[ ] Is idempotency required?
[ ] Is it offline-capable?
[ ] What are success responses?
[ ] What are failure responses?
[ ] What database entities change?
[ ] What side effects occur?
[ ] Does it trigger notification?
[ ] Is audit required?
[ ] Are tests added?
[ ] Is API_SPEC.md updated?
```

---

# 56. Definition of API Done

An endpoint is complete only when:

* Contract is documented.
* Request validation exists.
* Authentication is implemented if required.
* Authorization is implemented if required.
* Business logic exists in the correct service.
* Repository/database access is implemented.
* Response DTO exists.
* Error mapping exists.
* Idempotency exists where required.
* Offline behavior is defined where applicable.
* Tests exist.
* API documentation is updated.

---

# 57. North Star

The Gaavli API should remain:

```text
Simple
Predictable
Secure
Idempotent
Offline-compatible
Mobile-friendly
Easy to test
Easy for AI agents to understand
```

The API exists to enforce Gaavli's business rules consistently across all clients.

````
