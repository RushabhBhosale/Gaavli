# Current Approved Architecture (Authoritative)

The final target is an npm-workspaces monorepo with `apps/mobile`, `apps/web`, and shared packages under `packages/`. `apps/web` owns the Next.js Admin UI, REST API, and backend application layer; do not split the target into separate API and Admin apps. Mobile calls REST/HTTPS/JSON endpoints under `/api/v1`.

```text
Mobile → Next.js Route Handler → authentication → authorization → Zod validation
       → application service → repository/provider → MongoDB Atlas or provider
Admin Next.js server layer → same application services → repositories → MongoDB Atlas
```

Mongoose and database access are server-only. Use Node.js runtime for Mongoose-backed handlers unless an alternative is explicitly validated. Keep Route Handlers thin and use DTOs rather than raw Mongoose documents. Preserve modular monolith, offline-first mobile, shared-package direction (`apps → packages`), provider abstractions, Cloudflare R2/AWS S3, and Sentry. npm workspaces are sufficient; no separate API service or monorepo orchestrator is part of the target.

Next.js server caching must be deliberate and separate from Mobile SQLite caching. Never publicly cache authenticated or user-specific responses; public reference data may be cached appropriately, and listing/search freshness must be respected. Scheduled digests should use a hosting scheduler or cron to call a protected server job entry, then provider-independent, idempotent, consent-aware, language-aware application services that skip empty digests. Do not add Redis, BullMQ, Kafka, or RabbitMQ for this flow without an approved need. See `docs/IMPLEMENTATION_STATUS.md` for actual code status.


Below is a repo-ready version.

# `docs/02-architecture/ARCHITECTURE.md`

````md
# Gaavli – System Architecture

**Document:** ARCHITECTURE.md  
**Purpose:** Technical architecture and engineering blueprint for Gaavli  
**Status:** Authoritative architecture reference  
**Audience:** AI coding agents, developers, reviewers, technical leads  
**Last Updated:** YYYY-MM-DD

---

# 1. Purpose

This document defines the technical architecture of Gaavli.

AI coding agents and developers MUST read this document before making architectural changes.

This document defines:

- System boundaries
- Application structure
- Monorepo structure
- Mobile architecture
- Backend architecture
- Admin architecture
- Shared packages
- API architecture
- Database architecture
- Offline-first architecture
- Authentication architecture
- Search architecture
- Notification architecture
- File/photo storage
- Security boundaries
- Data flow
- Deployment architecture
- External integrations
- Architectural constraints
- Technology decisions
- Rules for introducing new infrastructure

This document describes **how Gaavli is technically built**.

Product requirements belong in:

`docs/01-product/PROJECT_REQUIREMENTS.md`

Offline behavior belongs in:

`docs/OFFLINE_SYNC.md`

API contracts belong in:

`docs/03-api/API_SPEC.md`

Database details belong in:

`docs/04-database/DATABASE.md`

Security and privacy rules belong in:

`docs/SECURITY_PRIVACY.md`

AI development rules belong in:

`docs/05-development/AI_DEVELOPMENT_RULES.md`

UI/UX rules belong in:

`docs/06-ui/UI_UX_PRD.md`

---

# 2. Architectural Philosophy

Gaavli is a lightweight, village-focused platform designed for real-world conditions in rural and semi-rural India.

The architecture MUST prioritize:

1. Reliability
2. Simplicity
3. Offline resilience
4. Data integrity
5. Low operational cost
6. Low infrastructure complexity
7. Maintainability
8. Mobile performance
9. Security and privacy
10. Easy AI-assisted development

Architecture MUST NOT become unnecessarily complex merely because a technology is available.

---

# 3. Core Architectural Principle

Gaavli connects people.

Gaavli does NOT become the intermediary controlling the transaction.

The architecture must therefore support:

```text
User
  ↓
Gaavli
  ↓
Discovery / Introduction
  ↓
Farmer / Seller / Service Provider
  ↓
Buyer / Resident
````

Gaavli does not own:

* Payments
* Delivery
* Negotiation
* Order fulfilment
* Chat
* Transaction settlement
* Customer relationship management

unless explicitly added in a future approved requirement.

---

# 4. Approved Technology Stack

## 4.1 Mobile

```text
React Native
Expo
TypeScript
Expo Router
Zustand
TanStack Query
Expo SQLite
Expo SecureStore
NetInfo
Expo Notifications
Device speech recognition
```

## 4.2 Backend

```text
Node.js
TypeScript
Next.js Route Handlers
Zod
Mongoose
MongoDB Atlas
MongoDB Atlas Search
```

## 4.3 Admin

```text
Next.js
TypeScript
shadcn/ui
TanStack Table
```

## 4.4 Monorepo

```text
npm
npm workspaces
```

## 4.5 Storage

Preferred:

```text
Cloudflare R2
```

Alternative:

```text
AWS S3
```

MongoDB MUST NOT be used for storing large image binaries.

## 4.6 Notifications

Push:

```text
Expo Notifications / FCM
```

SMS / WhatsApp:

```text
Provider abstraction
MSG91 / Gupshup / equivalent India-focused provider
```

The exact provider MUST NOT leak into business logic.

## 4.7 Hosting

Preferred:

```text
Vercel or another compatible Node.js host
```

Admin may use:

```text
Vercel
```

## 4.8 Monitoring

```text
Sentry
```

---

# 5. High-Level Architecture

```text
                         ┌──────────────────────┐
                         │      End Users       │
                         │ Farmers / Buyers /   │
                         │ Service Providers    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   React Native App   │
                         │       + Expo         │
                         └──────────┬───────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                     ▼                             ▼
              ┌──────────────┐             ┌──────────────┐
              │ Local SQLite │             │ TanStack      │
              │ Offline DB   │             │ Query Cache   │
              └──────┬───────┘             └──────┬───────┘
                     │                             │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │  Sync Engine  │
                            └───────┬───────┘
                                    │
                                    │ HTTPS
                                    ▼
                         ┌──────────────────────┐
                         │      apps/web            │
                         │ Next.js Route Handlers  │
                         │ Admin + services        │
                         └──────────┬───────────┘
                                    │
                ┌───────────────────┼────────────────────┐
                │                   │                    │
                ▼                   ▼                    ▼
        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │   MongoDB    │    │ Atlas Search │    │ Object Store │
        │    Atlas     │    │              │    │ R2 / S3      │
        └──────────────┘    └──────────────┘    └──────────────┘
                │
                │
                ▼
        ┌──────────────────────┐
        │ External Providers   │
        │ SMS / WhatsApp       │
        │ Push / FCM           │
        └──────────────────────┘


Admin UI is part of `apps/web` and calls the same server-side application services; the Admin browser does not connect to MongoDB.
```

---

# 6. Monorepo Architecture

Recommended repository:

```text
gaavli/
│
├── AGENTS.md
├── README.md
├── README.md
│
├── docs/
│   ├── 01-product/
│   │   └── PROJECT_REQUIREMENTS.md
│   │
│   ├── 02-architecture/
│   │   └── ARCHITECTURE.md
│   │
│   ├── 03-api/
│   │   └── API_SPEC.md
│   │
│   ├── 04-database/
│   │   └── DATABASE.md
│   │
│   ├── 05-development/
│   │   └── AI_DEVELOPMENT_RULES.md
│   │
│   ├── 06-ui/
│   │   └── UI_UX_PRD.md
│   │
│   ├── SECURITY_PRIVACY.md
│   ├── OFFLINE_SYNC.md
│   ├── IMPLEMENTATION_STATUS.md
│   │
│   └── decisions/
│       ├── ADR-001-modular-monolith.md
│       ├── ADR-002-offline-first.md
│       ├── ADR-003-mongodb.md
│       └── ...
│
├── apps/
│   │
│   ├── mobile/
│   │   ├── AGENTS.md
│   │   ├── app/
│   │   ├── src/
│   │   └── ...
│   │
│   └── web/
│       ├── AGENTS.md
│       └── src/
│
└── packages/
    ├── types/
    ├── validation/
    ├── constants/
    └── utils/
```

---

# 7. Application Boundaries

Gaavli contains three primary applications.

## 7.1 Mobile Application

Used by:

* Buyers
* Farmers
* Sellers
* Service providers
* Village residents
* Coordinators when applicable

Technology:

```text
React Native + Expo + TypeScript
```

The mobile application is the primary user-facing application.

---

## 7.2 Web Application, REST API, and Backend

`apps/web` is one Next.js + TypeScript application containing the Admin UI, REST API, and backend services. Mobile uses stable REST/HTTPS/JSON Route Handlers under `/api/v1`. Route Handlers remain thin transport adapters and call shared server-side application services.

Responsibilities include authentication, authorization, input validation, user and village operations, listings, services, search, interests, notifications, consent, Admin operations, audit logging, conflict resolution, idempotency, and server-side business rules.

The server-side application layer owns repository access and MongoDB connections. Client Components and the Admin browser must not access MongoDB directly.

## 7.3 Admin UI

The Admin UI is part of `apps/web` and uses Next.js + TypeScript, shadcn/ui, and TanStack Table. Admin server-side flows reuse the same application services, authorization, validation, audit rules, and business rules as the REST API. Server Actions may be used selectively for Admin-only operations but do not replace Mobile REST endpoints.

Responsibilities include user and village management, coordinator management, listing moderation, service directory management, reports, notification configuration, platform configuration, audit visibility, and operational dashboards.

---

# 8. Backend Architecture

Gaavli uses a:

**Modular Monolith**

not microservices.

Conceptually:

```text
Next.js REST API
│
├── auth
├── users
├── villages
├── proximity
├── categories
├── listings
├── search
├── services
├── interests
├── notifications
├── consent
├── reports
├── audit
├── admin
└── platform-settings
```

Each module should have clear responsibilities.

A module should generally contain:

```text
module/
├── controller / route
├── service
├── repository
├── schema
├── types
└── tests
```

Exact folder structure may evolve, but module boundaries MUST remain clear.

---

# 9. Modular Monolith Rules

Modules MAY communicate internally through service interfaces.

Modules SHOULD NOT directly manipulate another module's database implementation.

Prefer:

```text
ListingService
    ↓
ListingRepository
```

instead of:

```text
SearchModule → directly updates Listing MongoDB collection
```

Business rules belong in services/domain logic.

Routes/controllers should remain thin.

---

# 10. API Architecture

API style:

```text
REST
```

Base path:

```text
/api/v1
```

Examples:

```text
POST   /api/v1/auth/send-otp
POST   /api/v1/auth/verify-otp

GET    /api/v1/listings
POST   /api/v1/listings
GET    /api/v1/listings/:id
PATCH  /api/v1/listings/:id

POST   /api/v1/listings/:id/interested

GET    /api/v1/services
POST   /api/v1/services

GET    /api/v1/villages
```

API details belong in:

`docs/03-api/API_SPEC.md`

---

# 11. API Layering

Recommended request flow:

```text
HTTP Request
     ↓
Next.js Route Handler
     ↓
Authentication
     ↓
Authorization
     ↓
Zod Validation
     ↓
Controller
     ↓
Service
     ↓
Repository
     ↓
MongoDB / External Provider
     ↓
Service Result
     ↓
HTTP Response
```

Controllers MUST NOT contain large amounts of business logic.

---

# 12. Validation

Use:

```text
Zod
```

for API input validation.

Validation MUST happen at the API boundary.

The server MUST NOT trust:

* Client role
* Client village
* Client ownership
* Client timestamps
* Client status
* Client permissions
* Client pricing
* Client availability state

The server remains authoritative.

---

# 13. Database Architecture

Primary database:

```text
MongoDB Atlas
```

ODM:

```text
Mongoose
```

MongoDB is the authoritative server-side data store.

The mobile SQLite database is NOT a replacement for MongoDB.

---

# 14. Database Responsibility

MongoDB stores authoritative:

* Users
* User roles
* Villages
* Village relationships
* Categories
* Listings
* Services
* Interests
* Notification preferences
* Consent records
* Reports
* Audit records
* Platform settings

Exact schema belongs in:

`docs/04-database/DATABASE.md`

---

# 15. MongoDB Design Principles

Use MongoDB because Gaavli has:

* Flexible listing attributes
* Village-centric data
* Evolving service directory structures
* Simple document-oriented entities
* Low initial infrastructure complexity

Do not introduce additional databases without an architectural decision.

---

# 16. MongoDB Indexing

Every high-frequency query MUST have an appropriate index.

Examples:

```text
user.mobile
listing.sellerId
listing.villageId
listing.status
listing.categoryId
listing.createdAt
listing.expiresAt
service.villageId
service.categoryId
interest.listingId
```

Indexes MUST be based on actual query patterns.

Do not create indexes blindly.

---

# 17. Search Architecture

Search technology:

```text
MongoDB Atlas Search
```

Search should support:

* Item name
* Category
* Keywords
* Typo tolerance
* Marathi
* Hindi
* English
* Relevant service terms

Search is NOT an independent source of truth.

MongoDB remains authoritative.

---

# 18. Search Data Flow

```text
User Search
     ↓
Mobile
     ↓
API
     ↓
Search Service
     ↓
MongoDB Atlas Search
     ↓
Relevant Results
     ↓
API
     ↓
Mobile
```

The client MUST NOT implement authoritative global search logic.

---

# 19. Offline Architecture

Offline-first is a core architectural requirement.

Detailed rules are defined in:

`docs/OFFLINE_SYNC.md`

High-level architecture:

```text
React Native UI
      ↓
TanStack Query / Zustand
      ↓
Expo SQLite
      ↓
Persistent Sync Queue
      ↓
Sync Engine
      ↓
Next.js REST API
      ↓
MongoDB
```

Server is authoritative.

SQLite is a persistent local working store.

---

# 20. Offline Data Responsibilities

SQLite is used for:

* Cached listings
* Cached villages
* Cached categories
* Cached services
* User-local data required for offline behavior
* Drafts
* Pending operations
* Sync metadata

SQLite MUST NOT become an uncontrolled replica of MongoDB.

---

# 21. Sync Architecture

There MUST be one synchronization mechanism.

Preferred conceptual architecture:

```text
SyncEngine
    ↓
SyncQueue
    ↓
OperationHandler
    ↓
API
```

Do NOT create separate independent sync systems for:

* Listings
* Interests
* Notifications
* Relisting

unless there is a strong architectural reason.

---

# 22. Idempotency

All offline write operations that can be retried MUST support idempotency.

Each operation receives a stable:

```text
operationId
```

Example:

```text
operationId = deviceUUID + localSequence
```

or another collision-safe mechanism.

If the same request is sent twice, the server MUST NOT create duplicate side effects.

---

# 23. Server Authority

The server is always authoritative.

Examples:

```text
Mobile says:
ACTIVE

Server says:
SOLD_OUT
```

Server wins.

```text
Mobile says:
User owns listing

Server says:
Ownership changed
```

Server wins.

```text
Mobile says:
User is Coordinator

Server says:
User is not Coordinator
```

Server wins.

The client MUST never bypass server authorization.

---

# 24. Authentication Architecture

Primary authentication:

```text
Mobile number + OTP
```

OTP provider MUST be abstracted.

Example:

```text
OtpProvider
├── Msg91OtpProvider
├── GupshupOtpProvider
└── MockOtpProvider
```

Business logic MUST NOT depend directly on a specific provider.

---

# 25. Authentication Flow

```text
Enter Mobile
      ↓
Request OTP
      ↓
Provider
      ↓
Verify OTP
      ↓
API issues session/token
      ↓
SecureStore
      ↓
Authenticated App
```

Sensitive authentication information MUST use:

```text
Expo SecureStore
```

not ordinary application state.

---

# 26. Guest Architecture

Guest users may browse publicly available information where permitted.

Guest users do not receive authenticated capabilities.

Examples:

Allowed:

```text
Browse listings
Search
View village information
View services
```

Authenticated:

```text
Create listing
Interested
Notify farmer
Manage own listing
Manage notification preferences
```

Exact permissions are defined by product requirements.

---

# 27. Role Architecture

Gaavli uses a unified user account.

A user may act as:

```text
Buyer
Seller
Service Provider
```

These are not necessarily mutually exclusive accounts.

Seller status is earned when the user creates their first listing.

Coordinator is different.

```text
Coordinator = administrative assignment
```

Coordinator access MUST be granted by authorized administration.

---

# 28. Village Architecture

Village membership and proximity are important domain concepts.

Village relationships MUST NOT rely only on client GPS.

GPS may be used to:

```text
Suggest nearby villages
```

but authoritative village relationships should be:

```text
Manually curated / administratively confirmed
```

GPS is therefore:

```text
Recommendation signal
```

not:

```text
Authority
```

---

# 29. Proximity Architecture

Potential architecture:

```text
User / Village
      ↓
GPS / coordinates
      ↓
Distance calculation
      ↓
Candidate villages
      ↓
Coordinator/Admin confirmation
      ↓
Authoritative village mapping
```

Do not automatically change a user's authoritative village based only on GPS.

---

# 30. Listing Architecture

Listings are intentionally simple.

A listing generally contains:

```text
seller
village
category
item
quantity
unit
rate (optional)
photo (optional)
status
expiry
createdAt
updatedAt
```

The architecture MUST NOT turn listings into e-commerce orders.

---

# 31. Listing Lifecycle

Example:

```text
DRAFT
  ↓
PENDING_SYNC
  ↓
ACTIVE
  ↓
SOLD_OUT
```

Other states may include:

```text
EXPIRED
DEACTIVATED
DELETED
```

Exact lifecycle belongs in product/database/API documentation.

State transitions MUST be validated server-side.

---

# 32. Duplicate Detection

Duplicate detection should initially be deterministic.

Potential signals:

* Same seller
* Same active item
* Similar normalized item name
* Same village
* Existing active listing

Use fuzzy matching where useful.

Do NOT introduce an LLM solely for duplicate detection.

Deterministic logic is preferred.

---

# 33. Services Directory

Services are self-declared.

Examples:

```text
Electrician
Plumber
Carpenter
Tailor
Mechanic
Tutor
Doctor
Nurse
Driver
etc.
```

The architecture MUST NOT falsely label self-declared providers as verified professionals.

Medical-related services MUST display appropriate disclaimers where required.

---

# 34. Interest Architecture

Interested is a lightweight introduction mechanism.

Example:

```text
Buyer
   ↓
Interested
   ↓
Gaavli records interest
   ↓
Seller can be notified
```

Gaavli does not create:

```text
Order
Payment
Contract
Delivery
```

Interested operations MUST be idempotent.

---

# 35. Contact Privacy

Contact information should be exposed only when necessary.

Do not expose personal information in:

* Search indexes unnecessarily
* Public APIs unnecessarily
* Logs
* Analytics
* Error messages
* Notification payloads

The API should return only the minimum information required for the current action.

---

# 36. Notification Architecture

Notifications should use a provider abstraction.

```text
NotificationService
        ↓
NotificationProvider
        ├── PushProvider
        ├── SmsProvider
        └── WhatsAppProvider
```

Business modules should call:

```text
NotificationService
```

not directly call:

```text
MSG91
Gupshup
FCM
```

---

# 37. Notification Types

Potential notification channels:

```text
In-app
Push
SMS
WhatsApp
```

Channel selection depends on:

* User consent
* Notification type
* Provider availability
* Platform configuration
* Regulatory requirements

---

# 38. WhatsApp / SMS Architecture

External messaging providers MUST be isolated behind an abstraction.

Example:

```ts
interface MessagingProvider {
  sendTemplateMessage(...)
  sendOtp(...)
  sendNotification(...)
}
```

The rest of the application should not know which provider is being used.

This allows provider replacement without rewriting business modules.

---

# 39. Consent Architecture

Consent is separate from registration.

Examples:

```text
Account registration
≠
Marketing consent
```

Notification consent MUST be stored separately.

Opt-out must be respected.

Example:

```text
STOP
NO
```

must be processed according to the configured provider and consent model.

---

# 40. Scheduled Notifications

The initial architecture should avoid heavy queue infrastructure.

For scheduled/batched notifications, use the simplest reliable mechanism supported by the hosting environment.

Example:

```text
Scheduled Job
      ↓
Notification Service
      ↓
Find eligible users
      ↓
Apply consent
      ↓
Build digest
      ↓
Send
```

A 6 AM digest should not be sent if there is nothing meaningful to send.

---

# 41. Photo Architecture

Photos are stored in:

```text
Cloudflare R2
```

or:

```text
AWS S3
```

MongoDB stores metadata/reference, not image binaries.

Example:

```text
Listing
  photoKey
  photoUrl / object reference
```

The client should upload through an approved secure flow.

---

# 42. Photo Upload Flow

Preferred architecture:

```text
Mobile
  ↓
API requests upload authorization
  ↓
Secure upload URL / controlled upload
  ↓
Object Storage
  ↓
API confirms / stores metadata
  ↓
Listing references photo
```

For offline creation:

```text
Local Photo
    ↓
Draft
    ↓
Sync Queue
    ↓
Upload
    ↓
Server confirmation
```

A local photo MUST NOT be treated as successfully uploaded until server confirmation exists.

---

# 43. State Management Architecture

Use different tools for different purposes.

## Zustand

Use for:

* UI state
* Session-related client state where appropriate
* Temporary local interaction state
* Small cross-screen client state

## TanStack Query

Use for:

* Server state
* API data
* Cache
* Fetching
* Revalidation
* Mutation lifecycle

## SQLite

Use for:

* Persistent offline data
* Drafts
* Pending operations
* Offline cache

Do not put all application state into Zustand.

Do not use TanStack Query as the persistent offline database.

---

# 44. Mobile Data Flow

Online read:

```text
Screen
 ↓
TanStack Query
 ↓
API
 ↓
MongoDB
 ↓
Response
 ↓
Query Cache
 ↓
SQLite/cache update where required
```

Offline read:

```text
Screen
 ↓
SQLite
 ↓
Cached data
 ↓
Freshness indicator
```

Offline write:

```text
Screen
 ↓
SQLite local state
 ↓
Sync Queue
 ↓
Pending
 ↓
Network returns
 ↓
Sync Engine
 ↓
API
 ↓
Server
 ↓
Authoritative response
 ↓
SQLite update
```

---

# 45. App Startup

Preferred startup sequence:

```text
1. Load local session
2. Load essential cached data
3. Render usable UI
4. Check connectivity
5. Refresh server data
6. Process pending sync queue
7. Update local state
```

The application should not unnecessarily block startup waiting for the network.

---

# 46. Network Architecture

Network state is advisory.

NetInfo can indicate:

```text
Connected
Disconnected
Unknown
```

But:

```text
Connected
```

does NOT guarantee the API is reachable.

Actual API response determines whether synchronization succeeded.

---

# 47. Error Handling

Errors should be classified.

Recommended categories:

```text
NETWORK
TIMEOUT
SERVER_5XX
AUTHENTICATION
AUTHORIZATION
VALIDATION
CONFLICT
NOT_FOUND
RATE_LIMIT
PERMANENT
UNKNOWN
```

Retry behavior must depend on error category.

---

# 48. Retry Architecture

Transient errors may be retried.

Permanent errors must not retry forever.

Conceptually:

```text
NETWORK
TIMEOUT
5XX
    ↓
Retry

VALIDATION
AUTHORIZATION
CONFLICT
    ↓
Resolve / Stop
```

Retry strategy belongs to `docs/OFFLINE_SYNC.md`.

---

# 49. Security Architecture

Security is enforced at the API.

The mobile application is an untrusted client.

Never trust:

```text
Client role
Client ownership
Client village
Client permissions
Client prices
Client status
Client timestamps
```

Sensitive secrets MUST NOT be committed to Git.

Use environment variables / secret management.

---

# 50. Authorization

Authorization should be checked server-side.

Example:

```text
User A attempts to edit User B's listing
        ↓
API verifies ownership
        ↓
Reject
```

Do not rely on hidden UI buttons as authorization.

---

# 51. Admin Security

Admin endpoints MUST have stronger authorization.

Potential controls:

* Role-based authorization
* Session security
* Audit logging
* Rate limiting
* Sensitive action confirmation
* Account deactivation controls

Exact admin security requirements belong in:

`docs/SECURITY_PRIVACY.md`

---

# 52. Audit Architecture

Important administrative and destructive actions should be auditable.

Examples:

```text
Coordinator assigned
Coordinator removed
Listing deactivated
User deactivated
Village mapping changed
Notification configuration changed
Admin action performed
```

Audit records should include:

```text
actor
action
target
timestamp
relevant metadata
```

Do not store unnecessary secrets or sensitive payloads in audit logs.

---

# 53. API Security Boundaries

The API is responsible for:

```text
Authentication
Authorization
Validation
Rate limiting
Idempotency
Business rules
Data integrity
Audit
```

The mobile app is responsible for:

```text
User experience
Local persistence
Offline interaction
Input assistance
Caching
```

The mobile app is NOT responsible for enforcing security policy.

---

# 54. Caching Architecture

Use caching selectively.

Client cache:

```text
TanStack Query
SQLite
```

Server-side cache infrastructure should NOT be introduced initially unless actual performance requirements justify it.

Do not add Redis simply because caching exists.

---

# 55. Performance Architecture

Priority:

```text
Simple queries
Correct indexes
Pagination
Selective fields
Efficient API responses
Client caching
Offline cache
Image optimization
```

Avoid premature optimization.

---

# 56. Pagination

Large datasets MUST NOT be downloaded entirely.

Use pagination for:

* Listings
* Services
* Users
* Admin tables
* Reports
* Search results

Mobile should request only the data needed for the current screen.

---

# 57. API Response Design

Responses should be:

* Predictable
* Small
* Versioned
* Validated
* Consistent

Avoid returning entire MongoDB documents when the client only needs a subset.

---

# 58. Localization Architecture

Gaavli is Marathi-first.

The architecture should support:

```text
Marathi
Hindi
English
```

User-visible strings MUST NOT be hardcoded throughout components.

Use a centralized localization mechanism.

Do not store translated UI text directly inside business logic.

---

# 59. Marathi Search

Search architecture should account for:

* Marathi text
* English transliteration
* Hindi where applicable
* Common spelling variations
* Typographical mistakes

Search should be designed so that a villager does not need perfect spelling.

---

# 60. Voice Search

Voice search uses device/platform speech recognition where supported.

Architecture:

```text
Microphone
   ↓
Device Speech Recognition
   ↓
Recognized Text
   ↓
Normal Search Pipeline
```

Voice recognition MUST NOT create a separate search backend.

---

# 61. Admin Architecture

Admin UI communicates only with:

```text
Next.js REST API
```

Admin tables should support:

* Pagination
* Filtering
* Sorting
* Search
* Appropriate bulk operations

Bulk operations MUST be protected and auditable where destructive.

---

# 62. External Integration Architecture

All external services should be wrapped behind interfaces/adapters.

Examples:

```text
OtpProvider
MessagingProvider
StorageProvider
PushProvider
```

Application code should depend on interfaces, not vendor SDKs where practical.

Example:

```text
Business Logic
      ↓
StorageService
      ↓
StorageProvider
      ↓
R2Provider
```

This prevents vendor lock-in.

---

# 63. Provider Failure

External providers can fail.

The system MUST distinguish:

```text
Gaavli business operation succeeded
```

from:

```text
External notification failed
```

Do not roll back a valid listing merely because a WhatsApp message failed.

Business state and notification delivery should be separated.

---

# 64. Infrastructure Philosophy

Initial infrastructure should remain small.

Approved initial architecture:

```text
Mobile
    ↓
Next.js REST API
    ↓
MongoDB Atlas

Object Storage
    ↓
R2 / S3

Admin
    ↓
Next.js REST API

Notifications
    ↓
Provider
```

Do not introduce:

```text
Kubernetes
Kafka
Redis
BullMQ
Elasticsearch
OpenSearch
GraphQL
Microservices
Service mesh
Event bus
```

unless a documented requirement justifies the complexity.

---

# 65. Why No Microservices Initially?

Gaavli is initially a small-to-medium product.

A modular monolith provides:

* Faster development
* Easier debugging
* Lower infrastructure cost
* Easier AI-assisted coding
* Simpler deployments
* Easier local development
* Stronger transactional consistency

Modules can be separated later if real scale or organizational requirements justify it.

---

# 66. Why No Redis Initially?

Redis should not be added merely for:

* Caching
* Sessions
* Offline sync
* Rate limiting

Use simpler mechanisms first.

Introduce Redis only if measured requirements demonstrate a need.

---

# 67. Why No Queue Infrastructure Initially?

Do not introduce Kafka/BullMQ/etc. for every asynchronous task.

Initial background processing can use:

* Scheduled jobs
* Lightweight application workers where necessary
* Provider APIs
* Database-driven state

If queue requirements become significant, create an ADR before introducing infrastructure.

---

# 68. Architecture Decision Records

Significant architectural changes should be documented under:

```text
docs/decisions/
```

Example:

```text
ADR-001-modular-monolith.md
ADR-002-offline-first.md
ADR-003-mongodb.md
ADR-004-r2-storage.md
```

An ADR should explain:

```text
Context
Decision
Alternatives
Reason
Consequences
```

AI agents MUST read relevant ADRs before changing an established architectural decision.

---

# 69. Deployment Architecture

Initial production architecture:

```text
                    Internet
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
          Mobile             Admin
              │                 │
              └────────┬────────┘
                       │
                       ▼
                 Next.js REST API
                       │
             ┌─────────┼─────────┐
             │         │         │
             ▼         ▼         ▼
          MongoDB     R2/S3   Providers
```

---

# 70. Environment Separation

At minimum:

```text
Development
Staging
Production
```

Each environment should have separate:

* Database
* Secrets
* Provider credentials
* Storage configuration
* API configuration

Production data MUST NOT be casually used in development.

---

# 71. Configuration

Configuration must come from environment/configuration mechanisms.

Examples:

```text
DATABASE_URL
JWT_SECRET
OTP_PROVIDER_KEY
WHATSAPP_PROVIDER_KEY
R2_ACCESS_KEY
R2_SECRET_KEY
SENTRY_DSN
```

Never hardcode secrets.

Never commit `.env` files containing secrets.

---

# 72. Logging

Logs should be useful for debugging but privacy-conscious.

Allowed examples:

```text
requestId
route
duration
statusCode
operationType
errorCategory
```

Never log:

```text
OTP
password
access token
refresh token
API secret
full private contact information
```

---

# 73. Observability

Use Sentry and lightweight application logging.

Important signals:

```text
API errors
Authentication failures
Sync failures
Conflict rates
Notification failures
Provider failures
Slow APIs
Queue age
```

Monitoring should remain proportionate to product scale.

---

# 74. Testing Architecture

Tests should exist at appropriate levels.

## Unit Tests

For:

* Business rules
* Validation
* State transitions
* Duplicate detection
* Permission logic

## Integration Tests

For:

* API + database
* Authentication
* Listing creation
* Offline sync endpoints
* Idempotency
* Conflict handling

## Mobile Tests

For:

* Offline drafts
* Queue persistence
* Restart recovery
* Sync state
* Important UI states

## End-to-End Tests

For critical user journeys.

---

# 75. Critical Architecture Test

The following scenario MUST work:

```text
User opens Gaavli
      ↓
Network disappears
      ↓
User creates listing
      ↓
Listing is saved locally
      ↓
App is closed
      ↓
App is reopened
      ↓
Listing still exists as pending
      ↓
Network returns
      ↓
Sync occurs
      ↓
Server creates exactly one listing
      ↓
Client receives authoritative response
      ↓
Listing becomes Published
```

---

# 76. Dependency Rules

Before adding a dependency, ask:

1. Is it actually required?
2. Does Expo/React Native already provide the capability?
3. Does an existing dependency already solve it?
4. Does it increase bundle size?
5. Does it complicate native builds?
6. Does it work with Expo?
7. Is it actively maintained?
8. Does it introduce security/privacy concerns?

AI agents MUST NOT add dependencies casually.

---

# 77. No Duplicate Infrastructure

Before implementing a capability, inspect the repository.

Do not create:

```text
Second API client
Second auth manager
Second sync engine
Second notification service
Second storage abstraction
Second state management system
```

Reuse existing architecture.

---

# 78. AI Coding Agent Architecture Rules

Before changing architecture, the AI agent MUST:

1. Read `AGENTS.md`
2. Read this `docs/02-architecture/ARCHITECTURE.md`
3. Read relevant product requirements
4. Read relevant module `AGENTS.md`
5. Read relevant ADRs
6. Inspect the existing implementation
7. Identify existing abstractions
8. Plan the smallest compatible change
9. Implement incrementally
10. Run relevant tests
11. Update documentation if architecture changed

The agent MUST NOT redesign architecture simply because it prefers another stack.

---

# 79. Existing Code vs Architecture Document

If the repository contains an implementation that differs from this document:

The AI agent MUST NOT silently rewrite the implementation.

Instead:

1. Identify the difference.
2. Determine whether it is intentional.
3. Check `docs/IMPLEMENTATION_STATUS.md`.
4. Check relevant ADRs.
5. If necessary, ask for clarification.
6. If the architecture is intentionally changing, update the documentation.

Do not create architectural drift silently.

---

# 80. Architectural Change Rules

An architectural change is any change affecting:

* Database technology
* Authentication model
* API style
* Offline synchronization
* Storage provider
* Search engine
* Messaging provider architecture
* Application boundaries
* Major dependencies
* Infrastructure
* Security boundaries
* Data ownership
* Role architecture

Such changes require explicit review.

---

# 81. Smallest-Change Principle

When implementing a feature:

```text
Prefer:
Small change
+
Existing architecture
+
Existing abstractions
```

over:

```text
New framework
+
New infrastructure
+
New abstraction
+
Large refactor
```

Do not refactor unrelated code merely because it is not ideal.

---

# 82. Architecture Anti-Patterns

The following are prohibited unless explicitly approved:

### Direct database access from mobile

```text
Mobile → MongoDB
```

### Direct database access from admin

```text
Admin → MongoDB
```

### Business logic inside UI components

```text
Screen → huge business rules
```

### Provider-specific business logic

```text
ListingService → Gupshup SDK
```

### Multiple sync systems

```text
ListingSync
InterestSync
NotificationSync
RelistSync
```

without a common synchronization architecture.

### Runtime LLM for deterministic rules

Do not use LLMs for:

* Authorization
* Duplicate detection
* Sync
* Validation
* State transitions
* Permissions

when deterministic logic is sufficient.

---

# 83. Runtime AI Philosophy

AI is primarily a development accelerator for Gaavli.

AI coding tools may be used to:

* Generate code
* Generate tests
* Refactor safely
* Generate documentation
* Review implementation
* Find bugs
* Improve development speed

Runtime AI is NOT required for the core MVP.

The application MUST continue to function without an LLM runtime dependency.

---

# 84. Data Flow Principle

Every important piece of data should have a clear owner.

Example:

```text
MongoDB
    = authoritative server data

SQLite
    = local/offline working data

TanStack Query
    = server-state cache

Zustand
    = client/UI state

R2/S3
    = image binaries

SecureStore
    = sensitive local credentials/session information
```

Do not create ambiguous ownership.

---

# 85. Source of Truth Matrix

| Data                    | Authoritative Source |
| ----------------------- | -------------------- |
| User account            | MongoDB              |
| User role               | MongoDB              |
| Village mapping         | MongoDB              |
| Listing status          | MongoDB              |
| Listing ownership       | MongoDB              |
| Service provider record | MongoDB              |
| Interest                | MongoDB              |
| Notification consent    | MongoDB              |
| Cached listings         | SQLite               |
| Offline draft           | SQLite               |
| Pending operation       | SQLite               |
| API cache               | TanStack Query       |
| UI state                | Zustand              |
| Authentication secret   | SecureStore          |
| Photos                  | R2/S3                |

---

# 86. Data Ownership Rule

Whenever two layers contain the same information:

```text
Server data
>
Local cache
>
UI state
```

The higher-authority layer wins.

Never allow stale client data to overwrite authoritative server state without validation.

---

# 87. Failure Philosophy

The architecture must assume failure.

Possible failures:

```text
Network unavailable
API unavailable
Database unavailable
Provider unavailable
App terminated
Device restarted
Upload interrupted
OTP delayed
Notification failed
User changes account
Data changes on another device
```

The system should fail safely and preserve user data wherever possible.

---

# 88. User Experience During Failure

Technical failures should be translated into understandable messages.

Bad:

```text
HTTP 409
ETag mismatch
Mongo duplicate key
```

Good:

```text
This listing has already been marked as sold out.
Please refresh and try again.
```

Users should not see internal implementation details.

---

# 89. Architectural Priorities

When trade-offs are necessary, prioritize:

```text
1. Data integrity
2. User data safety
3. Security/privacy
4. Offline reliability
5. Correct business behavior
6. Simplicity
7. Performance
8. Cost optimization
9. Developer convenience
```

Do not sacrifice data integrity for speed of implementation.

---

# 90. Future Scaling

The initial architecture should support growth without prematurely implementing large-scale infrastructure.

Potential future evolution:

```text
Modular Monolith
      ↓
Measure bottlenecks
      ↓
Identify actual scaling boundary
      ↓
Extract only necessary component
```

Possible future extractions:

```text
Notification service
Search service
Media processing
Analytics
```

But only when justified by actual scale.

---

# 91. Future Features

The architecture should leave room for:

* Transport module
* Additional village modules
* More notification channels
* Advanced analytics
* More admin capabilities
* Larger geographic coverage
* Additional service categories

However, future possibilities MUST NOT complicate the current MVP unnecessarily.

---

# 92. Explicitly Deferred Architecture

The following are intentionally deferred:

```text
Microservices
Kafka
Redis
BullMQ
Elasticsearch
OpenSearch
GraphQL
Kubernetes
Service mesh
Real-time chat infrastructure
Payment gateway
Order management
Delivery management
Live transport tracking
Runtime LLM dependency
```

These may be reconsidered later through an ADR.

---

# 93. Definition of Architectural Done

A feature affecting architecture is complete only when:

* Existing architecture was inspected.
* Correct module boundary is used.
* API boundary is respected.
* Database ownership is clear.
* Offline behavior is handled where applicable.
* Authentication/authorization is enforced.
* Validation exists.
* Errors are handled.
* Idempotency exists where required.
* Tests are added.
* No duplicate infrastructure was introduced.
* No unnecessary dependency was added.
* Documentation is updated if architecture changed.
* Relevant ADR is created/updated when required.

---

# 94. AI Agent Pre-Implementation Checklist

Before coding, the agent should answer internally:

```text
[ ] What application am I modifying?
[ ] What module owns this feature?
[ ] What is the authoritative source of this data?
[ ] Does this feature work offline?
[ ] Does it create a sync operation?
[ ] Does the operation require idempotency?
[ ] What API endpoint is responsible?
[ ] What validation is required?
[ ] What authorization is required?
[ ] What database changes are required?
[ ] What existing abstraction should be reused?
[ ] Does this require a new dependency?
[ ] Does this require an ADR?
[ ] What tests are required?
```

---

# 95. Final Architectural Rules

The following rules are NON-NEGOTIABLE unless explicitly changed through an approved architectural decision.

1. Mobile never accesses MongoDB directly.
2. Admin never accesses MongoDB directly.
3. API is the security and business-rule boundary.
4. MongoDB is the server-side source of truth.
5. SQLite is for persistent local/offline data.
6. Offline writes use a persistent sync queue.
7. Offline writes require stable idempotency.
8. Server responses are authoritative.
9. Stale client data must never silently resurrect invalid server state.
10. External providers are accessed through abstractions.
11. Secrets are never hardcoded.
12. User consent is separate from registration.
13. Self-declared services must not be falsely presented as verified.
14. GPS is a suggestion mechanism, not authoritative village membership.
15. Search is not a separate source of truth.
16. Photos are stored in object storage, not MongoDB binaries.
17. No unnecessary infrastructure.
18. No unnecessary dependencies.
19. No duplicate architectural mechanisms.
20. No runtime LLM dependency for deterministic core functionality.
21. No architectural rewrite without understanding the existing code.
22. No silent architectural drift.
23. Important architectural decisions must be documented.
24. Data integrity takes priority over implementation convenience.

---

# 96. North Star

Gaavli's architecture should feel:

```text
Simple
Reliable
Offline-friendly
Secure
Affordable
Maintainable
AI-developer-friendly
```

The goal is not to build the most sophisticated architecture.

The goal is to build the **simplest architecture that reliably serves real villagers under real network, device, and operational constraints.**

When in doubt:

> Prefer the smallest reliable solution that preserves data integrity, security, offline reliability, and future maintainability.
