# Current Repository Snapshot — 2026-10-07

This checkout contains project documentation only. At inspection time it had no `package.json`, `package-lock.json`, or application source. The `apps/mobile` and `apps/web` directories contain only their `AGENTS.md` instruction documents, not app implementations. No application migration has been performed.

| Area | Approved target | Current status |
| --- | --- | --- |
| AI development | Codex; root and app `AGENTS.md` instructions | Documentation updated |
| Package management | npm workspaces, `package-lock.json` | NOT STARTED; no manifests/lockfile present |
| Mobile | `apps/mobile`, React Native + Expo | NOT STARTED; no app implementation present |
| Web/API/Admin | `apps/web`, Next.js Route Handlers and shared server services | NOT STARTED; no app implementation present |
| Database | MongoDB Atlas + Mongoose, server-only | PLANNED; no integration present |
| Shared packages | `packages/types`, `validation`, `constants`, `utils` | NOT STARTED; no packages present |

This snapshot describes the checkout inspected for the documentation migration. Update it when implementation files are added and verified.

## Documentation Architecture Decision Log — 2026-10-07

| Area | Previous documentation direction | Current approved direction | Status |
| --- | --- | --- | --- |
| AI development | Mixed Claude Code/Codex guidance with root `CLAUDE.md` authority (historical; superseded) | Codex primary; root `/AGENTS.md` and app-local instructions | Documentation updated; no code migration |
| Backend | Node.js + Fastify API (historical; superseded) | Next.js Route Handlers in `apps/web`, with shared server-side services | Documentation updated; backend NOT STARTED |
| Applications | Separate `apps/api` and `apps/admin` targets (historical; superseded) | `apps/mobile` and `apps/web` | Documentation updated; app code NOT STARTED |
| Package management | pnpm + Turborepo (historical; superseded) | npm workspaces and `package-lock.json` | Documentation updated; package manifests NOT STARTED |
| UI/UX design | Mixed design and implementation agent responsibilities | Lovable design-only; Codex production implementation | Documentation updated |

These are documentation decisions only. They do not indicate that applications, workspaces, APIs, or database integrations have been migrated or implemented.

---


# `docs/IMPLEMENTATION_STATUS.md`

````md
# Gaavli — Implementation Status

## 1. Purpose

This document tracks the current implementation status of the Gaavli application.

It is a living project-status document and must reflect the actual state of the codebase, not the intended architecture or future requirements.

The purpose of this document is to allow AI coding agents and developers to quickly understand:

- What has been implemented
- What is partially implemented
- What has not yet been implemented
- What is blocked
- What has been verified
- What still requires testing or verification
- Which features are MVP-critical
- Which features are intentionally deferred

This document must remain synchronized with the actual repository.

---

# 2. AI Coding Agent Instructions

## Mandatory Reading

AI coding agents MUST read this file before starting implementation work.

This includes:

- Codex
- Developers continuing an incomplete feature

Read this file together with the applicable source-of-truth documents defined in `AGENTS.md`.

---

## Status Update Rules

AI coding agents MUST update this file after:

- Completing a feature
- Completing a significant implementation task
- Changing an existing feature
- Completing a major bug fix
- Completing a database/schema migration
- Completing an API contract change
- Completing an offline-sync workflow
- Completing an authentication/authorization workflow
- Completing an infrastructure/provider integration
- Changing implementation status from blocked/deferred to active
- Discovering that a previously marked feature is not actually complete

Do not update this file merely to make the project appear more complete.

---

## Completion Rule

NEVER mark a feature as `COMPLETE` unless:

1. The feature has actually been implemented.
2. The relevant code exists in the repository.
3. The implementation follows the applicable requirements and architecture documents.
4. The implementation has been tested at the appropriate level.
5. Important error/edge cases have been considered.
6. No known critical blocker remains.
7. The feature has been verified in the actual application or appropriate automated tests.

If implementation exists but verification is incomplete, use:

`IMPLEMENTED — VERIFICATION PENDING`

Do not use `COMPLETE`.

---

## Preserve History

When updating this document:

- Preserve existing status history where applicable.
- Do not silently rewrite previous implementation history.
- Add a new entry when a significant status change occurs.
- Do not delete historical information merely because the current status changed.
- Keep historical entries concise and factual.

---

# 3. Status Definitions

Use only the following primary statuses unless there is a strong reason to introduce another status.

| Status | Meaning |
|---|---|
| `NOT STARTED` | No implementation work has started |
| `PLANNED` | Planned but implementation has not started |
| `IN PROGRESS` | Active implementation is underway |
| `IMPLEMENTED — VERIFICATION PENDING` | Implementation exists but required verification is incomplete |
| `COMPLETE` | Implemented and appropriately verified |
| `BLOCKED` | Cannot proceed because of a known dependency/blocker |
| `DEFERRED` | Intentionally postponed to a later phase |
| `REWORK REQUIRED` | Existing implementation does not satisfy current requirements |

Do not mark work as complete simply because:

- The UI exists
- The API endpoint exists
- The code compiles
- A happy-path test passes
- A mock implementation exists
- A placeholder is present
- An AI coding agent generated the code

---

# 4. Verification Levels

Where useful, record the verification level.

### `V0 — Not verified`

No meaningful verification has been performed.

### `V1 — Static verification`

Examples:

- TypeScript compilation
- Lint
- Formatting
- Static checks

### `V2 — Automated verification`

Examples:

- Unit tests
- Integration tests
- API tests
- Component tests

### `V3 — Feature verification`

Feature tested through the relevant application workflow.

### `V4 — End-to-end verification`

Complete workflow verified across the relevant components.

Example:

```text
Mobile → API → MongoDB → Notification/Provider
````

### `V5 — Production-like verification`

Feature verified under realistic conditions such as:

* Slow network
* Intermittent network
* Offline → online transition
* Low-end Android device
* Production-like configuration
* Real external provider sandbox/test environment

Not every feature requires V5.

---

# 5. Project Phase

Current project phase:

**Phase:** `MVP DEVELOPMENT`

Update this when the project moves to another major phase.

Possible phases:

1. FOUNDATION
2. MVP DEVELOPMENT
3. MVP VERIFICATION
4. PILOT
5. PILOT FEEDBACK / HARDENING
6. PRODUCTION RELEASE
7. POST-MVP DEVELOPMENT

---

# 6. Overall Status

| Area                       | Status      | Verification | Notes |
| -------------------------- | ----------- | ------------ | ----- |
| Repository / Monorepo      | NOT STARTED | V0           |       |
| Shared Types               | NOT STARTED | V0           |       |
| Mobile Application         | NOT STARTED | V0           |       |
| Backend API                | NOT STARTED | V0           |       |
| Admin Application          | NOT STARTED | V0           |       |
| Authentication / OTP       | NOT STARTED | V0           |       |
| User / Roles               | NOT STARTED | V0           |       |
| Villages / Proximity       | NOT STARTED | V0           |       |
| Marketplace / Listings     | NOT STARTED | V0           |       |
| Search                     | NOT STARTED | V0           |       |
| Services Directory         | NOT STARTED | V0           |       |
| Interested / Contact Flow  | NOT STARTED | V0           |       |
| Notifications              | NOT STARTED | V0           |       |
| WhatsApp / SMS             | NOT STARTED | V0           |       |
| Offline / Sync             | NOT STARTED | V0           |       |
| Photo Upload               | NOT STARTED | V0           |       |
| Admin Operations           | NOT STARTED | V0           |       |
| Security / Audit           | NOT STARTED | V0           |       |
| Testing                    | NOT STARTED | V0           |       |
| Monitoring / Observability | NOT STARTED | V0           |       |
| Deployment                 | NOT STARTED | V0           |       |

> These values must be updated based on the actual repository. They are not claims that the features are currently implemented.

---

# 7. MVP Feature Status

## 7.1 Project Foundation

| Feature / Task                  | Status      | Verification | Notes |
| ------------------------------- | ----------- | ------------ | ----- |
| npm workspace root configuration | NOT STARTED | V0           | No package manifest present |
| npm workspaces                   | NOT STARTED | V0           | No package manifest or lockfile present |
| Root configuration              | NOT STARTED | V0           |       |
| Shared TypeScript configuration | NOT STARTED | V0           |       |
| Shared types package            | NOT STARTED | V0           |       |
| Shared validation package       | NOT STARTED | V0           |       |
| Shared constants package        | NOT STARTED | V0           |       |
| Shared utilities package        | NOT STARTED | V0           |       |
| Environment configuration       | NOT STARTED | V0           |       |
| Development scripts             | NOT STARTED | V0           |       |
| CI checks                       | NOT STARTED | V0           |       |

---

# 8. Mobile Application

## 8.1 Application Foundation

| Feature                  | Status      | Verification | Notes |
| ------------------------ | ----------- | ------------ | ----- |
| Expo application         | NOT STARTED | V0           |       |
| TypeScript               | NOT STARTED | V0           |       |
| Expo Router              | NOT STARTED | V0           |       |
| Navigation structure     | NOT STARTED | V0           |       |
| Zustand setup            | NOT STARTED | V0           |       |
| TanStack Query setup     | NOT STARTED | V0           |       |
| API client               | NOT STARTED | V0           |       |
| Error handling           | NOT STARTED | V0           |       |
| Localization framework   | NOT STARTED | V0           |       |
| Marathi language support | NOT STARTED | V0           |       |
| Hindi language support   | NOT STARTED | V0           |       |
| English language support | NOT STARTED | V0           |       |

---

# 9. Authentication

| Feature                       | Status      | Verification | Notes |
| ----------------------------- | ----------- | ------------ | ----- |
| Mobile number entry           | NOT STARTED | V0           |       |
| OTP request                   | NOT STARTED | V0           |       |
| OTP verification              | NOT STARTED | V0           |       |
| OTP expiry                    | NOT STARTED | V0           |       |
| OTP attempt limits            | NOT STARTED | V0           |       |
| Resend cooldown               | NOT STARTED | V0           |       |
| Authentication rate limiting  | NOT STARTED | V0           |       |
| Secure token storage          | NOT STARTED | V0           |       |
| Session restoration           | NOT STARTED | V0           |       |
| Logout                        | NOT STARTED | V0           |       |
| Account deactivation handling | NOT STARTED | V0           |       |
| Guest browsing                | NOT STARTED | V0           |       |

---

# 10. User and Roles

| Feature                           | Status      | Verification | Notes |
| --------------------------------- | ----------- | ------------ | ----- |
| User profile                      | NOT STARTED | V0           |       |
| Unified user account              | NOT STARTED | V0           |       |
| Buyer capability                  | NOT STARTED | V0           |       |
| Seller capability                 | NOT STARTED | V0           |       |
| Seller status after first listing | NOT STARTED | V0           |       |
| Service provider capability       | NOT STARTED | V0           |       |
| Coordinator role                  | NOT STARTED | V0           |       |
| Super Admin role                  | NOT STARTED | V0           |       |
| Role authorization                | NOT STARTED | V0           |       |
| Ownership checks                  | NOT STARTED | V0           |       |

---

# 11. Village and Proximity

| Feature                          | Status      | Verification | Notes |
| -------------------------------- | ----------- | ------------ | ----- |
| Village master data              | NOT STARTED | V0           |       |
| Village selection                | NOT STARTED | V0           |       |
| User village association         | NOT STARTED | V0           |       |
| Coordinator village management   | NOT STARTED | V0           |       |
| Manual village proximity mapping | NOT STARTED | V0           |       |
| GPS candidate suggestion         | NOT STARTED | V0           |       |
| Haversine calculation            | NOT STARTED | V0           |       |
| Server-side proximity validation | NOT STARTED | V0           |       |
| Authoritative manual mapping     | NOT STARTED | V0           |       |

**Important rule:**

GPS must only suggest proximity.

GPS/Haversine must never silently become the authoritative village relationship when manual administrative mapping is required.

---

# 12. Marketplace / Listings

| Feature                     | Status      | Verification | Notes |
| --------------------------- | ----------- | ------------ | ----- |
| Category structure          | NOT STARTED | V0           |       |
| Create listing              | NOT STARTED | V0           |       |
| Edit listing                | NOT STARTED | V0           |       |
| Delete/deactivate listing   | NOT STARTED | V0           |       |
| Listing expiry              | NOT STARTED | V0           |       |
| Quantity/unit               | NOT STARTED | V0           |       |
| Optional rate               | NOT STARTED | V0           |       |
| Photo attachment            | NOT STARTED | V0           |       |
| Perishable category         | NOT STARTED | V0           |       |
| Recurring supply category   | NOT STARTED | V0           |       |
| Mid shelf-life category     | NOT STARTED | V0           |       |
| Long shelf-life category    | NOT STARTED | V0           |       |
| Available Now               | NOT STARTED | V0           |       |
| Previously Available        | NOT STARTED | V0           |       |
| Relist                      | NOT STARTED | V0           |       |
| Duplicate listing detection | NOT STARTED | V0           |       |
| Seller ownership validation | NOT STARTED | V0           |       |
| Listing state transitions   | NOT STARTED | V0           |       |

---

# 13. Search

| Feature                   | Status      | Verification | Notes |
| ------------------------- | ----------- | ------------ | ----- |
| Basic search              | NOT STARTED | V0           |       |
| Typeahead                 | NOT STARTED | V0           |       |
| Typo tolerance            | NOT STARTED | V0           |       |
| Marathi search            | NOT STARTED | V0           |       |
| Hindi search              | NOT STARTED | V0           |       |
| English search            | NOT STARTED | V0           |       |
| Category filtering        | NOT STARTED | V0           |       |
| Village filtering         | NOT STARTED | V0           |       |
| Available Now filtering   | NOT STARTED | V0           |       |
| Previously Available      | NOT STARTED | V0           |       |
| MongoDB Atlas Search      | NOT STARTED | V0           |       |
| Device speech recognition | NOT STARTED | V0           |       |

Offline search must only operate on cached data and must clearly communicate its limited scope.

---

# 14. Services Directory

| Feature                | Status      | Verification | Notes |
| ---------------------- | ----------- | ------------ | ----- |
| Service categories     | NOT STARTED | V0           |       |
| Create service profile | NOT STARTED | V0           |       |
| Edit service profile   | NOT STARTED | V0           |       |
| Search services        | NOT STARTED | V0           |       |
| Profession search      | NOT STARTED | V0           |       |
| Keyword search         | NOT STARTED | V0           |       |
| Village filtering      | NOT STARTED | V0           |       |
| Self-declared status   | NOT STARTED | V0           |       |
| Verification status    | NOT STARTED | V0           |       |
| Medical disclaimer     | NOT STARTED | V0           |       |

Service providers must not be presented as verified unless verification actually exists.

---

# 15. Interested / Contact Flow

| Feature                       | Status      | Verification | Notes |
| ----------------------------- | ----------- | ------------ | ----- |
| Interested action             | NOT STARTED | V0           |       |
| Interested offline queue      | NOT STARTED | V0           |       |
| Idempotent Interested request | NOT STARTED | V0           |       |
| Seller notification           | NOT STARTED | V0           |       |
| Notify Farmer fallback        | NOT STARTED | V0           |       |
| Contact privacy               | NOT STARTED | V0           |       |
| Contact disclosure rules      | NOT STARTED | V0           |       |

Gaavli does not control the transaction after connecting the parties.

---

# 16. Notifications

| Feature                       | Status      | Verification | Notes |
| ----------------------------- | ----------- | ------------ | ----- |
| In-app notifications          | NOT STARTED | V0           |       |
| Push notifications            | NOT STARTED | V0           |       |
| Notification preferences      | NOT STARTED | V0           |       |
| Notification consent          | NOT STARTED | V0           |       |
| WhatsApp provider abstraction | NOT STARTED | V0           |       |
| SMS provider abstraction      | NOT STARTED | V0           |       |
| WhatsApp consent              | NOT STARTED | V0           |       |
| SMS consent                   | NOT STARTED | V0           |       |
| STOP/opt-out handling         | NOT STARTED | V0           |       |
| 6 AM digest                   | NOT STARTED | V0           |       |
| Skip empty digest             | NOT STARTED | V0           |       |
| Language-specific templates   | NOT STARTED | V0           |       |

Registration must never automatically imply marketing consent.

---

# 17. Offline-First / Synchronization

Refer to:

`docs/OFFLINE_SYNC.md`

| Feature                    | Status      | Verification | Notes |
| -------------------------- | ----------- | ------------ | ----- |
| Expo SQLite                | NOT STARTED | V0           |       |
| Local schema               | NOT STARTED | V0           |       |
| SQLite migrations          | NOT STARTED | V0           |       |
| Cached reads               | NOT STARTED | V0           |       |
| Local drafts               | NOT STARTED | V0           |       |
| Persistent sync queue      | NOT STARTED | V0           |       |
| Sync engine                | NOT STARTED | V0           |       |
| Stable operationId         | NOT STARTED | V0           |       |
| API idempotency            | NOT STARTED | V0           |       |
| Retry policy               | NOT STARTED | V0           |       |
| Permanent failure handling | NOT STARTED | V0           |       |
| Conflict handling          | NOT STARTED | V0           |       |
| Pending sync UI            | NOT STARTED | V0           |       |
| Manual retry               | NOT STARTED | V0           |       |
| Manual Sync Now            | NOT STARTED | V0           |       |
| Offline listing creation   | NOT STARTED | V0           |       |
| Offline listing editing    | NOT STARTED | V0           |       |
| Offline Interested         | NOT STARTED | V0           |       |
| Offline opt-in             | NOT STARTED | V0           |       |
| Offline relist             | NOT STARTED | V0           |       |
| Offline photo handling     | NOT STARTED | V0           |       |
| Restart recovery           | NOT STARTED | V0           |       |

### Critical Offline Verification

The following workflow must eventually be verified:

```text
Create listing
    ↓
Network unavailable
    ↓
Listing saved locally
    ↓
App closed
    ↓
App restarted
    ↓
Listing still present
    ↓
Network restored
    ↓
Sync occurs
    ↓
Server accepts request
    ↓
Local state updated
    ↓
No duplicate listing created
```

This is a critical MVP acceptance test.

---

# 18. Photo Handling

| Feature                         | Status      | Verification | Notes |
| ------------------------------- | ----------- | ------------ | ----- |
| Photo selection                 | NOT STARTED | V0           |       |
| Image compression               | NOT STARTED | V0           |       |
| Local temporary storage         | NOT STARTED | V0           |       |
| R2/S3 upload                    | NOT STARTED | V0           |       |
| Upload retry                    | NOT STARTED | V0           |       |
| Upload failure handling         | NOT STARTED | V0           |       |
| Server confirmation             | NOT STARTED | V0           |       |
| Cleanup after successful upload | NOT STARTED | V0           |       |

Do not store image binaries directly inside MongoDB unless explicitly approved.

---

# 19. Backend API

| Feature                   | Status      | Verification | Notes |
| ------------------------- | ----------- | ------------ | ----- |
| Next.js application       | NOT STARTED | V0           |       |
| `/api/v1` routing         | NOT STARTED | V0           |       |
| Authentication middleware | NOT STARTED | V0           |       |
| Authorization middleware  | NOT STARTED | V0           |       |
| Zod validation            | NOT STARTED | V0           |       |
| Error handling            | NOT STARTED | V0           |       |
| API pagination            | NOT STARTED | V0           |       |
| Idempotency handling      | NOT STARTED | V0           |       |
| Conflict handling         | NOT STARTED | V0           |       |
| Rate limiting             | NOT STARTED | V0           |       |
| Audit logging             | NOT STARTED | V0           |       |
| Health check              | NOT STARTED | V0           |       |
| API tests                 | NOT STARTED | V0           |       |

---

# 20. Database

Refer to:

`docs/04-database/DATABASE.md`

| Area                 | Status      | Verification | Notes |
| -------------------- | ----------- | ------------ | ----- |
| MongoDB Atlas        | NOT STARTED | V0           |       |
| Mongoose setup       | NOT STARTED | V0           |       |
| User model           | NOT STARTED | V0           |       |
| Village model        | NOT STARTED | V0           |       |
| Listing model        | NOT STARTED | V0           |       |
| Category model       | NOT STARTED | V0           |       |
| Service model        | NOT STARTED | V0           |       |
| Interest model       | NOT STARTED | V0           |       |
| Notification model   | NOT STARTED | V0           |       |
| Consent model        | NOT STARTED | V0           |       |
| Audit model          | NOT STARTED | V0           |       |
| Idempotency records  | NOT STARTED | V0           |       |
| Required indexes     | NOT STARTED | V0           |       |
| Atlas Search indexes | NOT STARTED | V0           |       |

Database implementation must follow `docs/04-database/DATABASE.md`.

---

# 21. Admin Application

| Feature                       | Status      | Verification | Notes |
| ----------------------------- | ----------- | ------------ | ----- |
| Next.js application           | NOT STARTED | V0           |       |
| Admin authentication          | NOT STARTED | V0           |       |
| Coordinator role              | NOT STARTED | V0           |       |
| Super Admin role              | NOT STARTED | V0           |       |
| Village management            | NOT STARTED | V0           |       |
| Proximity management          | NOT STARTED | V0           |       |
| Listing management            | NOT STARTED | V0           |       |
| User management               | NOT STARTED | V0           |       |
| Service management            | NOT STARTED | V0           |       |
| Notification management       | NOT STARTED | V0           |       |
| Platform settings             | NOT STARTED | V0           |       |
| Audit log view                | NOT STARTED | V0           |       |
| Server-side pagination        | NOT STARTED | V0           |       |
| Filtering                     | NOT STARTED | V0           |       |
| Search                        | NOT STARTED | V0           |       |
| Destructive action protection | NOT STARTED | V0           |       |
| Conflict handling             | NOT STARTED | V0           |       |

Admin application must never bypass backend authorization.

---

# 22. Security and Privacy

| Feature                 | Status      | Verification | Notes |
| ----------------------- | ----------- | ------------ | ----- |
| Authentication security | NOT STARTED | V0           |       |
| Authorization           | NOT STARTED | V0           |       |
| OTP rate limiting       | NOT STARTED | V0           |       |
| API rate limiting       | NOT STARTED | V0           |       |
| Input validation        | NOT STARTED | V0           |       |
| Mongo query safety      | NOT STARTED | V0           |       |
| Contact privacy         | NOT STARTED | V0           |       |
| Location privacy        | NOT STARTED | V0           |       |
| Notification privacy    | NOT STARTED | V0           |       |
| Local data minimization | NOT STARTED | V0           |       |
| Secure token storage    | NOT STARTED | V0           |       |
| Admin audit logging     | NOT STARTED | V0           |       |
| Deactivation handling   | NOT STARTED | V0           |       |

Refer to:

`docs/SECURITY_PRIVACY.md`

---

# 23. Testing Status

| Test Area              | Status      | Verification | Notes |
| ---------------------- | ----------- | ------------ | ----- |
| TypeScript checks      | NOT STARTED | V0           |       |
| Lint                   | NOT STARTED | V0           |       |
| Formatting             | NOT STARTED | V0           |       |
| Unit tests             | NOT STARTED | V0           |       |
| API integration tests  | NOT STARTED | V0           |       |
| Mobile tests           | NOT STARTED | V0           |       |
| Admin tests            | NOT STARTED | V0           |       |
| Authentication tests   | NOT STARTED | V0           |       |
| Authorization tests    | NOT STARTED | V0           |       |
| Idempotency tests      | NOT STARTED | V0           |       |
| Conflict tests         | NOT STARTED | V0           |       |
| Offline tests          | NOT STARTED | V0           |       |
| Restart/recovery tests | NOT STARTED | V0           |       |
| Notification tests     | NOT STARTED | V0           |       |
| Security tests         | NOT STARTED | V0           |       |
| End-to-end tests       | NOT STARTED | V0           |       |

---

# 24. Observability and Monitoring

| Feature                         | Status      | Verification | Notes |
| ------------------------------- | ----------- | ------------ | ----- |
| Application logging             | NOT STARTED | V0           |       |
| API error logging               | NOT STARTED | V0           |       |
| Sentry                          | NOT STARTED | V0           |       |
| Sync metrics                    | NOT STARTED | V0           |       |
| API performance monitoring      | NOT STARTED | V0           |       |
| Notification failure monitoring | NOT STARTED | V0           |       |
| Provider failure monitoring     | NOT STARTED | V0           |       |
| Health endpoint                 | NOT STARTED | V0           |       |

Do not log:

* OTPs
* Authentication tokens
* Passwords
* Sensitive personal information
* Full contact information unless necessary
* Sensitive request payloads

---

# 25. Deployment

| Area                             | Status      | Verification | Notes |
| -------------------------------- | ----------- | ------------ | ----- |
| API deployment                   | NOT STARTED | V0           |       |
| Admin deployment                 | NOT STARTED | V0           |       |
| MongoDB production configuration | NOT STARTED | V0           |       |
| R2/S3 production configuration   | NOT STARTED | V0           |       |
| Mobile build configuration       | NOT STARTED | V0           |       |
| Android build                    | NOT STARTED | V0           |       |
| iOS build                        | NOT STARTED | V0           |       |
| Environment secrets              | NOT STARTED | V0           |       |
| Production monitoring            | NOT STARTED | V0           |       |
| Backup/recovery process          | NOT STARTED | V0           |       |

---

# 26. Intentionally Deferred / Future Features

The following features are intentionally outside the current MVP unless explicitly re-approved.

| Feature                     | Status   | Reason                                 |
| --------------------------- | -------- | -------------------------------------- |
| In-app chat                 | DEFERRED | Not required for MVP                   |
| Payments                    | DEFERRED | Gaavli does not control transactions   |
| Delivery management         | DEFERRED | Not required for MVP                   |
| Ratings/reviews             | DEFERRED | Not required for MVP                   |
| CRM                         | DEFERRED | Not required for MVP                   |
| Live transport coordination | DEFERRED | Future module                          |
| Complex transport tracking  | DEFERRED | Future module                          |
| Microservices               | DEFERRED | Modular monolith preferred             |
| Redis/BullMQ                | DEFERRED | Add only when required                 |
| Kafka                       | DEFERRED | Not required for MVP                   |
| Elasticsearch/OpenSearch    | DEFERRED | MongoDB Atlas Search sufficient        |
| Runtime LLM dependency      | DEFERRED | Deterministic implementation preferred |
| Kubernetes                  | DEFERRED | Not required                           |
| GraphQL                     | DEFERRED | REST sufficient                        |

AI coding agents must not implement deferred features unless explicitly instructed.

---

# 27. Known Issues / Blockers

Use this section for currently known blockers or significant implementation issues.

| ID | Issue | Area | Severity | Status | Owner | Notes |
| -- | ----- | ---- | -------- | ------ | ----- | ----- |
|    |       |      |          |        |       |       |

Severity:

* `CRITICAL`
* `HIGH`
* `MEDIUM`
* `LOW`

Do not hide known blockers by changing the feature status to complete.

---

# 28. Technical Debt

Record meaningful technical debt here.

| ID | Area | Technical Debt | Impact | Priority | Status |
| -- | ---- | -------------- | ------ | -------- | ------ |
|    |      |                |        |          |        |

Only record actionable technical debt.

Do not use this section as a general TODO list.

---

# 29. Current Sprint / Active Work

## Current Focus

**Feature / Task:**
**Status:**
**Started:**
**Expected scope:**

### Current Tasks

* [ ]
* [ ]
* [ ]

### Verification Required

* [ ]
* [ ]
* [ ]

### Dependencies / Blockers

*

---

# 30. Recently Completed

Record significant recently completed work.

| Date | Feature / Task | Status   | Verification | Notes |
| ---- | -------------- | -------- | ------------ | ----- |
|      |                | COMPLETE | V            |       |

Keep this section reasonably short.

Older entries should move to the historical log.

---

# 31. Implementation History

Preserve significant status changes here.

Format:

```text
YYYY-MM-DD
Feature:
Previous status:
New status:
Verification:
Summary:
```

Example:

```text
2026-10-10
Feature: Offline listing creation
Previous status: IN PROGRESS
New status: IMPLEMENTED — VERIFICATION PENDING
Verification: V1
Summary: Local SQLite persistence and sync queue implemented. Restart and
offline-to-online verification still pending.
```

Another example:

```text
2026-10-12
Feature: Offline listing creation
Previous status: IMPLEMENTED — VERIFICATION PENDING
New status: COMPLETE
Verification: V4
Summary: Offline creation, app restart, network recovery, server sync and
duplicate prevention verified successfully.
```

Do not remove historical entries when status changes.

---

# 32. Verification Evidence

For important features, record concise evidence of verification.

Example:

```text
Feature: Offline Listing Creation

Verification:
- TypeScript: PASS
- Unit tests: PASS
- API integration tests: PASS
- Android device test: PASS
- Offline → online sync: PASS
- App restart recovery: PASS
- Duplicate prevention: PASS

Verified by:
Date:
Build / commit:
Notes:
```

Do not paste large logs into this document.

Reference the relevant test, issue, PR, commit, or report where available.

---

# 33. Release Readiness

Before an MVP release, review the following.

## Product

* [ ] MVP requirements implemented
* [ ] No critical MVP feature remains incomplete
* [ ] No unauthorized scope has been introduced
* [ ] Deferred features remain deferred

## Authentication

* [ ] OTP flow verified
* [ ] OTP abuse protections verified
* [ ] Session handling verified
* [ ] Logout/deactivation verified

## Marketplace

* [ ] Listing lifecycle verified
* [ ] Ownership verified
* [ ] Duplicate prevention verified
* [ ] Expiry/relist verified
* [ ] Contact/privacy rules verified

## Offline

* [ ] Offline listing creation verified
* [ ] Offline edit verified
* [ ] Interested verified
* [ ] Queue persistence verified
* [ ] App restart verified
* [ ] Retry verified
* [ ] Conflict handling verified
* [ ] Duplicate prevention verified

## Notifications

* [ ] Consent verified
* [ ] Opt-out verified
* [ ] In-app notifications verified
* [ ] WhatsApp/SMS provider behavior verified
* [ ] Digest behavior verified

## Admin

* [ ] Coordinator authorization verified
* [ ] Super Admin authorization verified
* [ ] Destructive action protection verified
* [ ] Audit logging verified
* [ ] Concurrent edit/conflict behavior verified

## Security

* [ ] Authentication tests passed
* [ ] Authorization tests passed
* [ ] Input validation verified
* [ ] Rate limits verified
* [ ] Sensitive logging reviewed
* [ ] Contact/location privacy reviewed

## Production

* [ ] Production environment configured
* [ ] Secrets configured securely
* [ ] Monitoring configured
* [ ] Error reporting configured
* [ ] Database backup/recovery verified
* [ ] Android release build verified

---

# 34. AI Agent Finalization Checklist

Before marking a feature `COMPLETE`, the AI coding agent MUST verify:

### Requirements

* [ ] Relevant requirements document was read
* [ ] Relevant architecture rules were followed
* [ ] No requirement was invented
* [ ] No deferred feature was accidentally implemented

### Implementation

* [ ] Production-quality implementation exists
* [ ] No placeholder/mock implementation remains
* [ ] No unnecessary dependencies were introduced
* [ ] No unrelated refactoring was performed
* [ ] Existing behavior was not unintentionally broken

### Testing

* [ ] Relevant automated tests added/updated
* [ ] Relevant tests pass
* [ ] Error cases considered
* [ ] Authorization/ownership tested where applicable
* [ ] Offline behavior tested where applicable
* [ ] Idempotency tested where applicable
* [ ] Conflict behavior tested where applicable

### Verification

* [ ] Feature was actually verified
* [ ] Verification level recorded
* [ ] Known limitations documented
* [ ] Implementation status updated

### Documentation

* [ ] API_SPEC.md updated if API changed
* [ ] DATABASE.md updated if data model changed
* [ ] OFFLINE_SYNC.md updated if offline behavior changed
* [ ] SECURITY_PRIVACY.md updated if security/privacy behavior changed
* [ ] Relevant AGENTS.md updated if development rules changed
* [ ] IMPLEMENTATION_STATUS.md updated

---

# 35. Rules for AI Agents

AI coding agents MUST:

1. Read `docs/IMPLEMENTATION_STATUS.md` before implementation work.
2. Check whether the requested feature is already implemented.
3. Check whether the feature is marked deferred or blocked.
4. Avoid duplicating existing functionality.
5. Update the status after meaningful implementation work.
6. Preserve historical status information.
7. Record verification honestly.
8. Use `IMPLEMENTED — VERIFICATION PENDING` when implementation exists but verification is incomplete.
9. Use `REWORK REQUIRED` when existing implementation does not meet current requirements.
10. Record blockers instead of pretending the feature is complete.
11. Update related documentation when implementation changes architecture, API, database, security, or offline behavior.
12. Never mark a feature `COMPLETE` based solely on code generation.

AI agents MUST NOT:

* Mark unfinished work as complete
* Delete status history
* Remove blockers to make the project look healthier
* Claim tests passed when they were not run
* Claim manual verification that did not happen
* Treat compilation as feature completion
* Implement intentionally deferred features without approval
* Replace authoritative documentation with assumptions

---

# 36. Definition of "Complete"

A feature is `COMPLETE` only when:

```text
Requirement understood
        ↓
Implementation completed
        ↓
Relevant code reviewed
        ↓
Automated checks/tests passed
        ↓
Relevant edge cases considered
        ↓
Feature behavior verified
        ↓
Related documentation updated
        ↓
Implementation status updated
        ↓
COMPLETE
```

If any required stage is missing:

```text
Do NOT mark COMPLETE
```

Use the appropriate intermediate status instead.

---

# 37. Project North Star

Gaavli is built for real village conditions.

The application should remain:

* Simple
* Lightweight
* Reliable
* Marathi-first
* Useful on low-cost Android devices
* Usable with weak/intermittent networks
* Safe with user data
* Honest about data freshness
* Honest about verification
* Free from unnecessary complexity

The implementation status must reflect reality.

**Code status is not the same as requirement status.**

**A feature is complete only when it works and has been verified.**

```
