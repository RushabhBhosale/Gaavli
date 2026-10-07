# Approved Runtime Boundary

MongoDB Atlas, Mongoose, and MongoDB Atlas Search remain approved. Database access is server-only and belongs behind repositories/application services. Mongoose models and connection code must not enter Client Components. Use Node.js runtime for Mongoose-backed Next.js Route Handlers unless another runtime is explicitly validated. Reuse connections appropriately in the Next.js runtime and map documents to explicit DTOs; raw Mongoose documents are not API responses. Mobile SQLite remains local/offline storage, not a replica or direct MongoDB client.


---

# `docs/04-database/DATABASE.md`

```md
# Gaavli – Database Specification

**Document:** DATABASE.md
**Purpose:** Authoritative server-side data model
**Status:** Authoritative
**Database:** MongoDB Atlas
**ODM:** Mongoose
**Audience:** AI coding agents, backend developers, mobile developers, database reviewers
**Last Updated:** YYYY-MM-DD

---

# 1. Purpose

This document defines Gaavli's server-side database architecture.

It defines:

- Collections
- Documents
- Fields
- Data types
- Required fields
- Relationships
- Ownership
- Statuses
- Indexes
- Uniqueness
- Audit requirements
- Soft deletion
- Versioning
- Idempotency
- Data retention
- API-to-database mapping

AI coding agents MUST read this document before:

- Creating collections
- Modifying schemas
- Adding fields
- Adding indexes
- Changing relationships
- Implementing API modules
- Implementing offline synchronization
- Writing migration scripts

---

# 2. Database Technology

Primary database:

```text
MongoDB Atlas
````

Application access:

```text
Mongoose
```

Database is server-side authoritative.

Mobile SQLite is NOT authoritative.

---

# 3. Database Philosophy

Gaavli uses MongoDB because the domain contains:

* Flexible listing information
* Village relationships
* Service provider data
* Evolving categories
* Simple document-oriented entities

However:

MongoDB flexibility MUST NOT become uncontrolled schema inconsistency.

Application-level schemas must remain explicit.

Use:

```text
TypeScript
+
Zod
+
Mongoose
```

---

# 4. Database Source of Truth

```text
MongoDB
    =
Authoritative server state
```

Client-side:

```text
SQLite
    =
Offline/cache/local state
```

TanStack Query:

```text
Server-state cache
```

Zustand:

```text
Client/UI state
```

---

# 5. Initial Collections

Recommended initial collections:

```text
users
villages
villageRelationships
categories
listings
services
interests
notificationPreferences
notificationSubscriptions
notifications
consents
otpRequests
sessions
idempotencyKeys
auditLogs
platformSettings
```

Additional collections may be introduced only when required.

---

# 6. Collection Ownership

| Collection                | Owning Module      |
| ------------------------- | ------------------ |
| users                     | users              |
| villages                  | villages           |
| villageRelationships      | villages/proximity |
| categories                | categories         |
| listings                  | listings           |
| services                  | services           |
| interests                 | interests          |
| notificationPreferences   | notifications      |
| notificationSubscriptions | notifications      |
| notifications             | notifications      |
| consents                  | consent            |
| otpRequests               | auth               |
| sessions                  | auth               |
| idempotencyKeys           | infrastructure/API |
| auditLogs                 | audit              |
| platformSettings          | platform-settings  |

Modules SHOULD access another module's data through its service/repository boundary rather than directly manipulating another module's collection.

---

# 7. Common Document Fields

Where applicable:

```text
_id
createdAt
updatedAt
```

Use Mongoose timestamps where appropriate.

MongoDB `_id` is server-generated.

---

# 8. ID Rules

Server entities use MongoDB ObjectId or the project's approved ID strategy.

Do not expose internal IDs unnecessarily.

Offline mobile may maintain:

```text
localId
operationId
serverId
```

These are different concepts.

---

# 9. Users Collection

Collection:

```text
users
```

Purpose:

Stores registered Gaavli users.

---

## 9.1 User Document

Conceptual schema:

```json
{
  "_id": "ObjectId",
  "mobile": "+91XXXXXXXXXX",
  "name": "Ramesh",
  "villageId": "ObjectId",
  "roles": [
    "USER"
  ],
  "sellerStatus": false,
  "serviceProviderStatus": false,
  "status": "ACTIVE",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

# 10. User Fields

| Field                   | Type     | Required | Notes                                     |
| ----------------------- | -------- | -------: | ----------------------------------------- |
| `_id`                   | ObjectId |      Yes | Server ID                                 |
| `mobile`                | string   |      Yes | Normalized                                |
| `name`                  | string   |       No | User display name                         |
| `villageId`             | ObjectId |       No | Authoritative village                     |
| `roles`                 | enum[]   |      Yes | USER/COORDINATOR/SUPER_ADMIN              |
| `sellerStatus`          | boolean  |      Yes | Earned when listing created               |
| `serviceProviderStatus` | boolean  |      Yes | Derived/approved based on service profile |
| `status`                | enum     |      Yes | ACTIVE/DEACTIVATED                        |
| `createdAt`             | Date     |      Yes |                                           |
| `updatedAt`             | Date     |      Yes |                                           |

---

# 11. User Role Rules

Primary administrative roles:

```text
USER
COORDINATOR
SUPER_ADMIN
```

Capabilities such as:

```text
BUYER
SELLER
SERVICE_PROVIDER
```

should not automatically be treated as mutually exclusive account roles.

A user can:

```text
Buy
+
Sell
+
Provide services
```

using one account.

---

# 12. Seller Status

A user becomes a seller when their first listing is successfully created.

The client MUST NOT set:

```text
sellerStatus = true
```

The server sets it.

---

# 13. User Status

Allowed:

```text
ACTIVE
DEACTIVATED
```

Deactivated users must not perform protected operations.

Existing data should generally be retained according to retention policy.

---

# 14. User Indexes

Recommended:

```text
mobile UNIQUE
villageId
status
roles
createdAt
```

Do not create unnecessary indexes.

---

# 15. Villages Collection

Collection:

```text
villages
```

Purpose:

Stores authoritative village information.

---

# 16. Village Document

Example:

```json
{
  "_id": "ObjectId",
  "name": "Nerle",
  "nameMr": "नेरले",
  "district": "Sindhudurg",
  "districtMr": "सिंधुदुर्ग",
  "taluka": "Vaibhavwadi",
  "talukaMr": "वैभववाडी",
  "state": "Maharashtra",
  "country": "India",
  "location": {
    "type": "Point",
    "coordinates": [
      73.45,
      16.12
    ]
  },
  "status": "ACTIVE",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

# 17. Village Fields

| Field        | Type          |    Required |
| ------------ | ------------- | ----------: |
| `_id`        | ObjectId      |         Yes |
| `name`       | string        |         Yes |
| `nameMr`     | string        | Recommended |
| `district`   | string        |         Yes |
| `districtMr` | string        | Recommended |
| `taluka`     | string        |         Yes |
| `talukaMr`   | string        | Recommended |
| `state`      | string        |         Yes |
| `country`    | string        |         Yes |
| `location`   | GeoJSON Point | Recommended |
| `status`     | enum          |         Yes |
| `createdAt`  | Date          |         Yes |
| `updatedAt`  | Date          |         Yes |

---

# 18. Village Geospatial Rule

Village coordinates are used for:

* Distance calculations
* Nearby suggestions
* Discovery

They do NOT automatically determine authoritative user-village membership.

---

# 19. Village Indexes

Recommended:

```text
name
district
taluka
status
2dsphere(location)
```

---

# 20. Village Relationships Collection

Collection:

```text
villageRelationships
```

Purpose:

Stores manually curated proximity/relationship information between villages.

Example:

```json
{
  "_id": "ObjectId",
  "sourceVillageId": "ObjectId",
  "targetVillageId": "ObjectId",
  "distanceKm": 4.2,
  "relationshipType": "NEARBY",
  "status": "ACTIVE",
  "createdBy": "ObjectId",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

# 21. Village Relationship Rules

GPS may suggest candidates.

Coordinator/Admin confirms authoritative relationships.

Do not automatically create authoritative relationships solely from GPS.

---

# 22. Categories Collection

Collection:

```text
categories
```

Example:

```json
{
  "_id": "ObjectId",
  "code": "PERISHABLE",
  "name": "Perishable",
  "nameMr": "नाशवंत",
  "status": "ACTIVE",
  "sortOrder": 1,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

# 23. Category Rules

Categories are controlled by the platform.

Users should not arbitrarily create top-level categories.

---

# 24. Listings Collection

Collection:

```text
listings
```

This is one of the primary Gaavli collections.

---

# 25. Listing Document

Example:

```json
{
  "_id": "ObjectId",
  "sellerId": "ObjectId",
  "villageId": "ObjectId",
  "categoryId": "ObjectId",

  "itemName": "Tomato",
  "itemNameMr": "टोमॅटो",

  "quantity": 10,
  "unit": "kg",
  "rate": 40,

  "photoObjectKey": "listings/abc.jpg",

  "status": "ACTIVE",

  "expiresAt": "Date",

  "version": 1,

  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

# 26. Listing Fields

| Field            | Type     |        Required | Notes                  |
| ---------------- | -------- | --------------: | ---------------------- |
| `_id`            | ObjectId |             Yes |                        |
| `sellerId`       | ObjectId |             Yes | User                   |
| `villageId`      | ObjectId |             Yes | Authoritative village  |
| `categoryId`     | ObjectId |             Yes |                        |
| `itemName`       | string   |             Yes |                        |
| `itemNameMr`     | string   |              No |                        |
| `quantity`       | number   |             Yes | > 0                    |
| `unit`           | string   |             Yes | kg, litre, dozen etc.  |
| `rate`           | number   |              No | Optional               |
| `photoObjectKey` | string   |              No | R2/S3                  |
| `status`         | enum     |             Yes |                        |
| `expiresAt`      | Date     | Yes/conditional |                        |
| `version`        | number   |             Yes | Optimistic concurrency |
| `createdAt`      | Date     |             Yes |                        |
| `updatedAt`      | Date     |             Yes |                        |

---

# 27. Listing Status

Allowed initial states:

```text
ACTIVE
SOLD_OUT
EXPIRED
DEACTIVATED
```

Optional internal states may include:

```text
DRAFT
```

but server-side drafts should only exist if explicitly required.

---

# 28. Listing State Rules

Examples:

```text
ACTIVE → SOLD_OUT
ACTIVE → EXPIRED
ACTIVE → DEACTIVATED

EXPIRED → RELIST
```

The server validates all transitions.

The client cannot arbitrarily change status.

---

# 29. Listing Ownership

`listing.sellerId` is authoritative.

The server MUST check:

```text
authenticatedUser.id === listing.sellerId
```

for normal seller edits.

---

# 30. Listing Indexes

Recommended:

```text
sellerId
villageId
categoryId
status
expiresAt
createdAt
updatedAt
```

Compound indexes should be created based on actual queries.

Example:

```text
{
  villageId: 1,
  status: 1,
  createdAt: -1
}
```

---

# 31. Listing Search

MongoDB Atlas Search may use:

```text
itemName
itemNameMr
searchable keywords
category
village
```

Search indexes are derived from authoritative MongoDB data.

Search is not a separate source of truth.

---

# 32. Listing Versioning

Every mutable listing should have:

```text
version
```

Example:

```text
version = 1

PATCH succeeds

version = 2
```

Client may submit the expected version.

If server version differs:

```text
409 STALE_VERSION
```

---

# 33. Services Collection

Collection:

```text
services
```

Purpose:

Self-declared village service directory.

---

# 34. Service Document

Example:

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "villageId": "ObjectId",
  "profession": "Electrician",
  "professionCode": "ELECTRICIAN",
  "description": "Home electrical work",
  "keywords": [
    "wiring",
    "fan",
    "switch"
  ],
  "status": "ACTIVE",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

# 35. Service Fields

| Field            | Type     |    Required |
| ---------------- | -------- | ----------: |
| `_id`            | ObjectId |         Yes |
| `userId`         | ObjectId |         Yes |
| `villageId`      | ObjectId |         Yes |
| `profession`     | string   |         Yes |
| `professionCode` | string   | Recommended |
| `description`    | string   |          No |
| `keywords`       | string[] |          No |
| `status`         | enum     |         Yes |
| `createdAt`      | Date     |         Yes |
| `updatedAt`      | Date     |         Yes |

---

# 36. Service Verification Rule

Services are self-declared.

Do not store or expose:

```text
verified = true
```

unless an actual verification mechanism exists.

If verification is introduced later, document it separately.

---

# 37. Service Indexes

Recommended:

```text
userId
villageId
professionCode
status
```

Search fields may be indexed through Atlas Search.

---

# 38. Interests Collection

Collection:

```text
interests
```

Purpose:

Records that a user expressed interest in a listing.

---

# 39. Interest Document

Example:

```json
{
  "_id": "ObjectId",
  "listingId": "ObjectId",
  "userId": "ObjectId",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

# 40. Interest Uniqueness

A user should not create duplicate interest for the same listing.

Recommended unique compound index:

```text
{
  listingId: 1,
  userId: 1
}
```

UNIQUE.

---

# 41. Interest Rules

Repeated request:

```text
POST /listings/:id/interested
```

must not create multiple interest records.

The API should behave idempotently.

---

# 42. Notification Preferences Collection

Collection:

```text
notificationPreferences
```

Example:

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "push": true,
  "sms": false,
  "whatsapp": true,
  "marketingSms": false,
  "marketingWhatsapp": true,
  "updatedAt": "Date"
}
```

---

# 43. Notification Preference Rules

Registration does NOT automatically imply marketing consent.

Consent fields should remain distinct from account creation.

---

# 44. Notification Subscriptions

Collection:

```text
notificationSubscriptions
```

Purpose:

Stores notify-me subscriptions.

Example:

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "itemQuery": "tomato",
  "villageId": "ObjectId",
  "status": "ACTIVE",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

# 45. Notification Subscription Indexes

Recommended:

```text
userId
villageId
status
itemQuery
```

Consider a compound uniqueness rule to prevent duplicate active subscriptions.

---

# 46. Notifications Collection

Collection:

```text
notifications
```

Example:

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "type": "LISTING_INTEREST",
  "title": "Someone is interested",
  "body": "A buyer is interested in your listing.",
  "data": {
    "listingId": "ObjectId"
  },
  "readAt": null,
  "createdAt": "Date"
}
```

---

# 47. Notification Rules

Notification records should not contain unnecessary sensitive data.

Do not store:

* OTP
* Access tokens
* Provider secrets
* Full private contact information

unless explicitly required.

---

# 48. Notification Status

A notification can be considered:

```text
UNREAD
READ
```

Read state can be represented by:

```text
readAt
```

rather than duplicating status fields.

---

# 49. Consent Collection

Collection:

```text
consents
```

Purpose:

Stores notification/marketing consent.

Example:

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "type": "MARKETING_WHATSAPP",
  "status": "GRANTED",
  "source": "APP",
  "grantedAt": "Date",
  "revokedAt": null,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

# 50. Consent History

Where legally/operationally required, do not overwrite historical consent without retaining the necessary history.

Possible events:

```text
GRANTED
REVOKED
```

---

# 51. OTP Requests Collection

Collection:

```text
otpRequests
```

Purpose:

Temporary OTP verification state.

Example:

```json
{
  "_id": "ObjectId",
  "mobile": "+91XXXXXXXXXX",
  "requestId": "otp_req_123",
  "attemptCount": 1,
  "status": "PENDING",
  "expiresAt": "Date",
  "createdAt": "Date"
}
```

---

# 52. OTP Security

OTP records must NOT store plaintext OTPs where avoidable.

Prefer a secure hash/verification mechanism.

OTP records should have TTL expiration.

Do not expose OTP information through APIs or logs.

---

# 53. Sessions Collection

Collection:

```text
sessions
```

Used if the selected authentication implementation requires server-side session/refresh-token tracking.

Example:

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "tokenHash": "...",
  "deviceId": "...",
  "expiresAt": "Date",
  "revokedAt": null,
  "createdAt": "Date"
}
```

Never store raw long-lived secrets unless explicitly required and approved.

---

# 54. Idempotency Keys Collection

Collection:

```text
idempotencyKeys
```

Purpose:

Protect retryable operations from duplicate side effects.

Example:

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "key": "operation-123",
  "operation": "CREATE_LISTING",
  "requestHash": "...",
  "status": "COMPLETED",
  "responseStatus": 201,
  "responseBody": {},
  "createdAt": "Date",
  "expiresAt": "Date"
}
```

---

# 55. Idempotency Rules

A key should represent exactly one logical operation.

If the same key is reused with a different request payload:

```text
409 IDEMPOTENCY_KEY_REUSED
```

Do not process the second request as a new operation.

---

# 56. Idempotency Index

Recommended unique index:

```text
{
  userId: 1,
  key: 1
}
```

UNIQUE.

TTL may be applied according to retention requirements.

---

# 57. Audit Logs Collection

Collection:

```text
auditLogs
```

Purpose:

Records important administrative/destructive actions.

Example:

```json
{
  "_id": "ObjectId",
  "actorUserId": "ObjectId",
  "action": "DEACTIVATE_LISTING",
  "entityType": "LISTING",
  "entityId": "ObjectId",
  "metadata": {},
  "createdAt": "Date"
}
```

---

# 58. Audit Rules

Audit important operations such as:

* User deactivation
* Coordinator assignment
* Coordinator removal
* Village mapping changes
* Listing administrative deactivation
* Platform settings changes
* Other sensitive admin actions

Do not log secrets.

---

# 59. Platform Settings

Collection:

```text
platformSettings
```

Purpose:

Stores controlled platform configuration.

Example:

```json
{
  "_id": "ObjectId",
  "key": "LISTING_DEFAULT_EXPIRY",
  "value": {},
  "updatedBy": "ObjectId",
  "updatedAt": "Date"
}
```

Settings must be validated and access-controlled.

---

# 60. Database Relationships

Conceptually:

```text
User
 ├── Village
 ├── Listings
 ├── Services
 ├── Interests
 ├── Notifications
 ├── Notification Preferences
 ├── Notification Subscriptions
 ├── Consents
 └── Sessions

Village
 ├── Users
 ├── Listings
 ├── Services
 └── Village Relationships

Listing
 ├── User/Seller
 ├── Village
 ├── Category
 └── Interests

Service
 ├── User
 └── Village
```

---

# 61. Referential Integrity

MongoDB does not automatically enforce foreign keys like a relational database.

Application services MUST validate referenced entities where necessary.

Example:

Creating listing:

```text
seller exists
+
seller active
+
village exists
+
village active
+
category exists
```

---

# 62. Ownership Rules

Important ownership relationships:

```text
Listing.sellerId → User._id
Service.userId → User._id
Interest.userId → User._id
Interest.listingId → Listing._id
```

Authorization MUST use these relationships.

---

# 63. Soft Delete / Deactivation

Prefer state-based deactivation for business entities where historical references matter.

Example:

```text
status = DEACTIVATED
```

rather than immediately deleting the document.

Hard deletion should be limited to cases where:

* Required by privacy/data policy
* No references are required
* Safe cleanup has been established

---

# 64. Deletion Rules

Before deleting an entity, check dependencies.

Example:

```text
Delete User
   ↓
Listings?
Services?
Interests?
Notifications?
Audit?
Consent?
```

Do not blindly cascade-delete data.

---

# 65. Listing Expiry

Listings may expire based on:

```text
expiresAt
```

The server determines whether a listing is expired.

Do not rely only on a client timer.

---

# 66. TTL Indexes

TTL indexes may be used for temporary data such as:

```text
otpRequests
temporary sessions
expired idempotency records
```

Do NOT use TTL indexes for important business history unless explicitly approved.

---

# 67. MongoDB Transactions

Transactions should be used only where multiple document changes must be atomic.

Do not introduce transactions unnecessarily.

Example where transaction may be useful:

```text
Create listing
+
Set sellerStatus = true
```

if both operations must succeed atomically.

However, the implementation should first evaluate whether the operation can safely be designed without a transaction.

---

# 68. Database Concurrency

Use:

```text
version
```

or equivalent concurrency control for important mutable entities.

Avoid generic last-write-wins where business rules require conflict detection.

---

# 69. Database Validation

Use multiple layers:

```text
API request
    ↓
Zod
    ↓
Service/business rules
    ↓
Mongoose schema
    ↓
MongoDB
```

No single layer should be considered sufficient for all integrity rules.

---

# 70. Mongoose Rules

Mongoose schemas should:

* Define field types
* Define required fields
* Define enums
* Define defaults
* Define timestamps
* Define indexes where appropriate

Do not hide major business rules only inside Mongoose hooks.

Business rules should remain visible in services.

---

# 71. Database and API Mapping

| API Resource                   | Primary Collection        |
| ------------------------------ | ------------------------- |
| `/users`                       | users                     |
| `/villages`                    | villages                  |
| `/categories`                  | categories                |
| `/listings`                    | listings                  |
| `/services`                    | services                  |
| `/interests`                   | interests                 |
| `/notifications`               | notifications             |
| `/notification-preferences`    | notificationPreferences   |
| `/notifications/subscriptions` | notificationSubscriptions |
| `/consent`                     | consents                  |
| `/auth`                        | otpRequests / sessions    |
| `/admin/audit`                 | auditLogs                 |
| `/admin/platform-settings`     | platformSettings          |

---

# 72. Offline Database vs Server Database

The mobile SQLite database is separate from MongoDB.

Do NOT copy the entire MongoDB schema into SQLite automatically.

SQLite should contain only data needed for:

* Offline reads
* Drafts
* Pending operations
* Sync
* Local user experience

Detailed rules are in:

```text
docs/OFFLINE_SYNC.md
```

---

# 73. Mobile SQLite Conceptual Tables

Possible tables:

```text
local_user
local_villages
local_categories
local_listings
local_services
local_drafts
sync_queue
sync_metadata
```

These are NOT MongoDB collections.

Their structure should be optimized for mobile/offline use.

---

# 74. Server vs Local Ownership

| Data                    | Server          | Mobile               |
| ----------------------- | --------------- | -------------------- |
| User account            | Authoritative   | Cached               |
| User role               | Authoritative   | Cached               |
| Village                 | Authoritative   | Cached               |
| Listing                 | Authoritative   | Cached/local pending |
| Listing status          | Authoritative   | Cached               |
| Draft                   | Optional server | Local                |
| Sync queue              | No              | Local                |
| Interest                | Authoritative   | Pending/cache        |
| Notification preference | Authoritative   | Local pending        |
| Consent                 | Authoritative   | Local pending/cache  |

---

# 75. Search Data

Search index is derived from MongoDB.

Flow:

```text
MongoDB
   ↓
Atlas Search Index
   ↓
Search API
```

Never treat the search index as authoritative.

---

# 76. Image Storage

MongoDB stores:

```text
photoObjectKey
```

or equivalent object-storage reference.

Actual image binary is stored in:

```text
Cloudflare R2
```

or approved S3 storage.

Do not store large images directly in MongoDB.

---

# 77. Data Privacy

Do not store unnecessary personal information.

Potential sensitive fields include:

* Mobile number
* Contact details
* Authentication/session information
* Consent information

Access should be minimized.

---

# 78. Database Logging

Never log:

```text
OTP
password
access token
refresh token
provider secret
raw authentication credentials
```

---

# 79. Database Performance

Before optimizing:

1. Identify slow query.
2. Inspect query pattern.
3. Check index.
4. Measure query.
5. Optimize schema/query.
6. Re-measure.

Do not add indexes blindly.

---

# 80. Index Review

Every new collection or major query must consider:

```text
[ ] Query frequency
[ ] Filter fields
[ ] Sort fields
[ ] Compound index
[ ] Index size
[ ] Write overhead
```

---

# 81. Database Migration Rules

Schema changes MUST be backward-conscious.

Before changing a field:

```text
[ ] Search API usage
[ ] Search mobile usage
[ ] Search admin usage
[ ] Search offline mapping
[ ] Check existing data
[ ] Define migration
[ ] Define rollback strategy where possible
```

AI agents MUST NOT casually rename/delete production fields.

---

# 82. AI Coding Agent Rules

Before changing database structure, the AI agent MUST:

1. Read `AGENTS.md`.
2. Read `docs/02-architecture/ARCHITECTURE.md`.
3. Read `docs/03-api/API_SPEC.md`.
4. Read this `docs/04-database/DATABASE.md`.
5. Read `docs/OFFLINE_SYNC.md` if mobile synchronization is affected.
6. Inspect current Mongoose schemas.
7. Inspect repository methods.
8. Inspect API consumers.
9. Determine backward compatibility.
10. Add/update tests.
11. Update documentation.

---

# 83. AI Agent Database Restrictions

AI agents MUST NOT:

* Create collections unnecessarily.
* Duplicate existing entities.
* Add arbitrary fields without requirements.
* Remove fields without impact analysis.
* Create unbounded arrays.
* Store image binaries in MongoDB.
* Store secrets in ordinary documents.
* Trust client authorization fields.
* Create indexes without query justification.
* Use database state as a substitute for business logic.
* Introduce another database without architectural approval.

---

# 84. New Collection Checklist

Before adding a collection:

```text
[ ] Is a new collection actually necessary?
[ ] Can an existing collection represent the data?
[ ] What module owns it?
[ ] What API exposes it?
[ ] What is the document lifecycle?
[ ] What is the source of truth?
[ ] What references it?
[ ] What indexes are required?
[ ] What uniqueness constraints are required?
[ ] What retention rules apply?
[ ] What privacy concerns exist?
[ ] Does offline functionality need it?
[ ] Does it require an ADR?
```

---

# 85. New Field Checklist

Before adding a field:

```text
[ ] Why is the field required?
[ ] Which module owns it?
[ ] Is it user-entered or server-generated?
[ ] Is it sensitive?
[ ] Is it required or optional?
[ ] Does it need an index?
[ ] Does API expose it?
[ ] Does mobile SQLite need it?
[ ] Does offline sync need it?
[ ] Does it affect search?
[ ] Does it require migration?
```

---

# 86. Database Testing

Important database tests should cover:

* Required fields
* Invalid enums
* Ownership
* Unique constraints
* Listing state transitions
* Version conflicts
* Duplicate interests
* Idempotency
* Deactivated users
* Expired listings
* Village relationships

---

# 87. Critical Database Acceptance Tests

## Duplicate Interest

```text
User A
+
Listing X

Interest request 1
→ record created

Interest request 2
→ no duplicate record
```

---

## Duplicate Listing Operation

```text
Idempotency-Key = ABC

Request 1
→ listing created

Request 2
→ original result

Database
→ exactly one listing
```

---

## Ownership

```text
User A owns Listing X

User B attempts update

→ API rejects
→ database unchanged
```

---

## Conflict

```text
Listing version = 5

Client sends version = 4

→ API returns 409
→ database remains version 5
```

---

# 88. Data Integrity Rules

The following are NON-NEGOTIABLE:

1. Server database is authoritative.
2. Ownership is server-controlled.
3. Roles are server-controlled.
4. Listing status is server-controlled.
5. Village authority is server-controlled.
6. Consent is server-controlled.
7. Duplicate operations must not create duplicate side effects.
8. Important uniqueness rules must be enforced at database level where possible.
9. Sensitive data must be minimized.
10. Images belong in object storage.
11. Temporary records should expire safely.
12. Historical/audit information should not be deleted casually.
13. Schema changes require impact analysis.

---

# 89. Final Collection Summary

| Collection                | Purpose                      | Important Indexes                      |
| ------------------------- | ---------------------------- | -------------------------------------- |
| users                     | Accounts                     | mobile, villageId, status              |
| villages                  | Villages                     | name, location                         |
| villageRelationships      | Curated village proximity    | sourceVillageId, targetVillageId       |
| categories                | Product categories           | code, status                           |
| listings                  | Farmer/seller listings       | sellerId, villageId, status, expiresAt |
| services                  | Service directory            | userId, villageId, profession          |
| interests                 | Buyer interest               | listingId + userId UNIQUE              |
| notificationPreferences   | Channel preferences          | userId UNIQUE                          |
| notificationSubscriptions | Notify-me                    | userId, villageId                      |
| notifications             | In-app notifications         | userId, createdAt                      |
| consents                  | Consent                      | userId, type                           |
| otpRequests               | Temporary OTP state          | requestId, expiresAt                   |
| sessions                  | Authentication sessions      | userId, expiresAt                      |
| idempotencyKeys           | Duplicate request protection | userId + key UNIQUE                    |
| auditLogs                 | Admin/security audit         | actorUserId, entityId, createdAt       |
| platformSettings          | Platform configuration       | key UNIQUE                             |

---

# 90. Definition of Database Done

A database change is complete only when:

* Schema is defined.
* TypeScript types are updated.
* Mongoose schema is updated.
* Validation is updated where required.
* Indexes are considered.
* API contract is updated.
* Offline mapping is considered.
* Existing data compatibility is considered.
* Tests are added.
* Documentation is updated.
* No unnecessary collection or field was introduced.

---

# 91. North Star

Gaavli's database should remain:

```text
Simple
Consistent
Secure
Query-efficient
Offline-compatible
Easy to understand
Easy for AI coding agents to work with
```

MongoDB should store the minimum authoritative information necessary to run Gaavli reliably.

Do not turn the database into an uncontrolled dump of application state.

````

---

## One important architectural relationship

With these three documents, the AI agent now has a very clear chain:

```text
PROJECT_REQUIREMENTS.md
        │
        │ What should Gaavli do?
        ▼
ARCHITECTURE.md
        │
        │ Where/how should it be implemented?
        ▼
API_SPEC.md
        │
        │ What contract does the module expose?
        ▼
DATABASE.md
        │
        │ How is the authoritative data stored?
        ▼
OFFLINE_SYNC.md
        │
        │ How does the mobile client behave
        │ when the server isn't reachable?
        ▼
IMPLEMENTATION
````

### Example: AI agent asked to build "Create Listing"

The agent should be able to reason:

```text
1. PROJECT_REQUIREMENTS
   → User can create a farmer listing.

2. ARCHITECTURE
   → Listing belongs to Listings module.
   → Next.js REST API.
   → MongoDB.
   → Mobile uses SQLite + SyncEngine.

3. API_SPEC
   → POST /api/v1/listings
   → Auth required
   → Idempotency required
   → Specific request/response contract.

4. DATABASE
   → listings collection
   → sellerId
   → villageId
   → categoryId
   → itemName
   → quantity
   → unit
   → status
   → expiresAt
   → version

5. OFFLINE_SYNC
   → Save locally
   → Create operationId
   → Queue
   → Retry
   → Server authoritative
   → Resolve conflicts.

6. IMPLEMENT
   → Mongoose schema
   → Repository
   → Service
   → Zod schema
   → Next.js Route Handler
   → Tests
   → Mobile mutation
   → SQLite mapping
   → Sync handler
```


