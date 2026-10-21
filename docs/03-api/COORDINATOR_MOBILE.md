# Mobile Village Coordinator — 2026-10-19

This implements the user's coordinator Manage/Activity request in the existing
application. It supersedes the historical segmented-Home design and village-only
marketplace scope. Home and Settings reuse their existing business flows; the
user's later 2026-10-19 header revision adds the shared identity/countryside header
to both, showing active Coordinator before Seller/Buyer. No
separate login, account collection, application, paid messaging or infrastructure
is introduced. Native visual/GPS/dialer acceptance remains a separate device check.

## Navigation and authorization

Manage layout revision — 2026-10-19: use a compact identity header with a dark
green round coordinator monogram, the saved user's name and localized coordinator
role, a localized Village Coordinator subtitle, and a pale green village badge.
The regular-weight village badge retains assigned-village selection instead of
the separate bold village button row.
Show only Seller, Buyer and Village summary cards, with no No App summary card.
Seller/buyer totals reuse the scoped directory API totals for the selected village
(all matching accounts, not the Activity date range); Village counts the active
assigned villages available in the selector. Loading/failed totals show no invented
numbers. Existing pre-registration, connections and directory actions remain.

Active users granted the coordinator role by an admin see Home | Manage |
Activity | Settings, and their identity displays Coordinator before Seller/Buyer.
Without an active assigned village, Manage/Activity show the saved name,
coordinator role and a localized village-assignment-pending explanation. They
cannot read village directories or perform coordinator work until an admin
assigns an active village; Home remains available for personal buying/selling.
Buyer/seller navigation stays unchanged otherwise. Coordinators can reach their
personal Sent/Received requests and My Listings from coordinator Activity, and
continue browsing/buying/selling through the shared Home.

Mobile user DTOs return `isCoordinator` for the active admin-granted role and
`coordinatorVillages`, an array of active assigned village DTOs. The optional role
flag preserves older clients/sessions: when absent, mobile falls back to the
historical nonempty-assignment check; explicit false takes precedence. Missing
historical arrays default to empty. The app refreshes role and assignments on
foreground and every 30 seconds while open. A denied coordinator request removes
coordinator work access immediately; the next profile refresh distinguishes a
missing assignment from role revocation. The backend rechecks every request, including
idempotent replay. Role revocation does not change buyer/seller data or sessions.

Every protected operation requires the existing native bearer session, an active
user with coordinator role and an explicit `VillageCoordinator` assignment to an
active village. Multiple assignments are selectable; a caller cannot choose an
unassigned management scope through queries or path IDs. The Add Buyer-only
`targetVillageId` exception below chooses a new buyer's village without granting
management access. Admin cookies do
not authorize coordinator routes. Mobile tokens do not authorize admin reports.
Responses are JSON envelopes with `Cache-Control: no-store`; foreign browser
origins are rejected by the existing mobile endpoint adapter.

## Endpoints

All paths below are under **`/api/v1`**, preserving the application's API contract.
An optional `villageId` query selects an assigned village; omission selects one
authorized active assignment. Connection routes use their village path ID.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/coordinator/dashboard` | Village, date range and six real summary counts |
| POST | `/coordinator/buyers` | Pre-register a buyer; strict firstName/lastName/mobile, optional targetVillageId |
| GET | `/coordinator/buyers` | Paginated current pre-registrations |
| GET | `/coordinator/users` | Scoped directory with name/mobile search and filters |
| GET | `/coordinator/users/:id` | Safe user detail and latest 50 village listings |
| PATCH | `/coordinator/users/:id` | Permitted name corrections with version |
| GET | `/coordinator/villages/:id/connections` | Active bidirectional links, paginated |
| POST | `/coordinator/villages/:id/connections` | Manually confirm targetVillageId |
| DELETE | `/coordinator/villages/:id/connections/:connectionId` | Deactivate only the link |
| GET | `/coordinator/villages/:id/candidates` | Name/taluka/district search or GPS suggestions |
| GET | `/coordinator/activity` | Filtered, dated, paginated chronological feed |
| GET | `/coordinator/activity/:id` | Authorized activity, including historical dates |
| GET | `/coordinator/reports` | Scoped dated report list |
| GET | `/coordinator/reports/:id` | Complaint, read-only listing and audit history |
| PATCH | `/coordinator/reports/:id` | Versioned dismiss/flag/hide/escalate |
| GET | `/coordinator/listings/:id` | Read-only scoped listing, including moderated stock |
| POST | `/listings/:id/reports` | Verified-session buyer reports visible non-own stock |
| GET | `/admin/reports` | Separate Super Admin cookie authentication; all/escalated reports |

Directory filters: `all`, `buyers`, `sellers`, `active`, `preregistered`. Search is
escaped, case-insensitive substring matching with 100-character input limit.
Pagination is bounded to page 1–10000 and limit 1–50 (default 20). Activity supports
All, Users (including assisted buyers/sellers), Listings, Mapping and Reports,
plus exact buyer/seller/registration/open-report summary drilldowns. Dates are
validated YYYY-MM-DD in UTC; default is the last 30 inclusive days. Open report
counts refer to pending/flagged/escalated reports created in that range.

Activity combines authoritative User registration/pre-registration timestamps,
recorded seller activation dates, Listing creation and audited connection/report
actions. No historical seller activation timestamp is guessed. Older seller
activations without a recorded date are absent from New Sellers counts. Names
and listing labels from existing records retain their saved language. Activity
selection opens the authorized user, listing, mapping or report detail.

## Pre-registration and identity

Add Buyer layout revision — 2026-10-19: combine Back and title in a compact row;
omit the assigned-village heading/buttons above the form. Place a Village dropdown
after Mobile. The user's follow-up village-list revision supersedes the earlier
assigned-villages-only dropdown: load all active villages through the existing
paginated `/villages` API, with Load more and loading/error/empty handling.
Selecting a village sets optional `targetVillageId` without changing the actor's
assigned request scope or clearing entered name/mobile. Missing targetVillageId
retains the existing assigned-village default for older clients. The server checks
the target is active, including mutation replay, and audits the actual buyer village.
This permits only new buyer creation in that village; directory/corrections remain
assignment-scoped, and success hides View Buyer for unassigned target villages.
Pending or in-flight operations lock village selection; village-specific recovery
keys and server-side authorization remain unchanged. Manage distributes its action
tiles over available height while retaining scrolling on shorter screens.

The existing User collection gains optional `mobileVerified`, `registeredAt`,
`preRegisteredAt`, `createdByCoordinator` and `sellerActivatedAt`. No parallel buyer
collection or fake verification is created. First/last names and mobile reuse the
OTP registration validators, including name length and Indian mobile normalization.
New pre-registrations are active buyers with mobileVerified:false and the actor's
creator ID. No session, SMS or marketing consent is created on their behalf.

Existing canonical/+91/91 mobile identities are checked before insertion; the
unique User mobile index also prevents races. Duplicate handling reveals no
foreign user's profile. Later successful OTP verification activates the same
record, retains the coordinator provenance/name/village/capabilities and marks
mobileVerified:true. Historical verification remains unknown until actual OTP.

The directory exposes mobile only inside coordinator-authorized village DTOs;
general marketplace/contact DTOs remain protected. Corrections are deliberately
limited to names of active, unverified pre-registered buyers created by that
coordinator, using the User version. Verified users, mobile numbers, village,
status and capabilities are read-only. No role-grant API is added for coordinators.

## Connections and discovery

Removal-menu revision — 2026-10-19: a village's three-dot menu contains only
Remove connection, styled with the existing font/theme and a trash icon. Choosing
it opens a custom centered popup matching the supplied reference: red trash icon
in a pale circle, localized question, selected village name and preservation
explanation, red Yes and secondary No buttons (होय/नाही). Existing typography is
reused. Saving shows progress and locks repeat submission/dismissal; on failure,
the popup closes and existing page error/pending recovery remains visible.
No/cancel sends
no write; Yes uses the existing authorized idempotent DELETE, which removes only
the connection and preserves both villages and their listings.

Filter-pill revision — 2026-10-19: the Add Village picker now shows the actual
source Taluka name (selected by default), Other Talukas, and Nearby by GPS. This
supersedes the All/Taluka/District controls below. Pills reuse existing theme and
button typography. Other Talukas uses `area=other_talukas`: active villages in the
source district excluding the source taluka and missing/empty talukas, before
search/count/pagination. Source and connected villages remain excluded. Nearby
by GPS explicitly requests permission and switches only after location succeeds;
it reuses `area=all` with coordinates and the existing 50 km suggestions. Denial
keeps the previous filter. Selecting either regional pill clears GPS coordinates.
Names and labels continue to use the selected language; the Taluka name comes
from saved village data. Legacy `all`/`district` API area values remain supported.

Typography/language revision — 2026-10-19: reuse existing mobile heading,
card-title, description, input and button styles in the village screens. Display
village names in the selected language only, without bilingual parentheses.
Coordinator subtitle and Quick Actions also use only the selected language.
Taluka filters match the authorized source taluka within its district; District
filters match the source district. Show the active area below the controls and
clear any GPS radius when switching area filters so it cannot hide area matches.
Existing stored taluka/district strings remain unchanged.

Add Village picker revision — 2026-10-19: compact centered title and selected
count, search, All / By taluka / By district filters, accessible checkbox rows,
and a footer fixed below the scrolling list with selected count and Add (N).
Selection survives searches, filters and pagination during the current visit.
The candidate API accepts `area=all|taluka|district` (default all); narrower
filters use the authorized source village's district and taluka before pagination
and counting. Unknown source area returns an empty narrowed result. Source and
already-connected villages remain excluded. A locate icon explicitly requests
GPS suggestions; only returned distances are displayed. No popularity is inferred.
Confirming selected villages sends the existing idempotent connection writes
sequentially. Only confirmed selections are removed; a failed/uncertain operation
stops the sequence and preserves remaining selections for retry. Each operation
retains the existing durable pending key/payload and authorization checks. The
sequence is not an atomic bulk operation; completed links remain saved if a later
link fails. All-confirmed success returns to the connected-village list.

Connections layout revision — 2026-10-19: the landing page displays its assigned
source village in a green Your village card, then the server's connected-village
total and Add village action. A successful zero-total response shows the illustrated
No villages connected yet state and Add the first village button. Loading/errors
never masquerade as an empty list. Once a confirmed connection exists, the same
page shows compact village rows with location icons and an overflow menu for the
existing confirmed removal flow. Real distance is shown only if supplied; otherwise
taluka/district is shown. Add success returns here and refreshes the list; removing
the final connection restores the empty state. Pagination remains available.

`VillageConnection` uses the `villageRelationships` collection, consistent with
existing village dependency checks. A sorted sourceVillageId/targetVillageId
pair has a unique index, active flag, creator and timestamps. Duplicate adds do
not create another link. Removal deactivates a link and preserves both villages,
users, listings and audit history. Reconnecting is an explicit new operation.

GPS discovery uses the existing village geo index and a maximum 50 km suggestion
radius around the provided coordinates. Current location is requested only when
the user chooses GPS; coordinates are not saved. Self/already-connected villages
are excluded before pagination. GPS suggestions never become authoritative links
without manual confirmation.

Active manual connections are **one hop and bidirectional** for Home/Marketplace,
listing detail, interested/contact, seller notification eligibility and request
callbacks. Each request rechecks active source/target villages, visible stock,
seller/category status and current connections. No GPS-only or transitive link
expansion is performed. Removing a link immediately ends new discovery/contact
access through that link; already stored request history is retained.

## Reports and audit

`VillageReport` uses `reports` with village/listing/reporter references, saved
product name, bounded plain-text reason, status, timestamps and version. Buyers
can submit a report from Product Details. A repeated open complaint is deduplicated;
a different reason requires resolving the prior open complaint first.

Flag records a listing's private moderationFlaggedAt. Hide changes active/pending
stock to reported and advances its version, removing it from discovery/contact.
Neither action changes price or quantity. Dismiss changes the complaint state;
it does not automatically restore a previously hidden listing. Escalated reports
appear in the existing Super Admin Reports page, replacing its placeholder.

AuditLog retains separate actorId (Admin) and actorUserId (coordinator/reporter),
with villageId, action, targetId and a safe target label. No phone/OTP/token enters
these new audit fields. Name corrections, connections, complaints and moderation
commit with their corresponding audit record in a transaction. Report detail
shows the latest 50 audit entries. Admin assignment/removal notices remain intact.

## Recovery and verification

Implementation entry points:

| Area | Files |
| --- | --- |
| Mobile screens and copy | `apps/mobile/src/coordinator/{screens,context,access,i18n}.tsx/ts` |
| Router and role tabs | `apps/mobile/src/app/(tabs)/{_layout,manage,activity}.tsx`, `src/app/coordinator/`, `src/app/report-product/[id].tsx` |
| Shared contracts | `packages/validation/src/{coordinator,identity,index}.ts`, `packages/types/src/index.ts` |
| Recovery and tests | `apps/mobile/src/data/coordinator.ts`, `apps/mobile/tests/coordinator.test.ts`, updated onboarding fixture |
| Backend transport | `apps/web/src/app/api/v1/coordinator/[...path]/route.ts`, listing report route, admin report route |
| Business rules and persistence | `apps/web/src/server/{services,repositories}/coordinator*.ts`, `services/listing-reports.ts`, `models/coordinator.ts`, extended existing models/auth/seller/replay repositories |
| Discovery and requests | `repositories/village-discovery.ts`, existing listing/contact/request/mobile repositories |
| Admin and integration tests | `apps/web/src/app/(dashboard)/reports/page.tsx`, `apps/web/tests/coordinator.integration.mts`, package test scripts |

Existing `ActivityScreen.tsx` adds only an optional back action for coordinator
personal requests. `ProductDetailsScreen.tsx` gains the complaint entry point.
Providers mount assignment refresh; Home and Profile/Settings screen files remain
unchanged by this task.

Mutations require stable Idempotency-Key values and reuse existing operation
hash/replay storage. Scope checks also run inside the transaction before replay.
Role/assignment changes and admin writes use the existing user/village locks.
Coordinator writes are limited to 120/user/hour; complaint sends to 20/user/hour.

The client saves the exact operation/payload/key in SecureStore before sending;
uncertain outcomes remain available as Retry saved operation across restart.
Confirmed cleanup failures remain safely replayable. Definite rejections allow
correction. Switching accounts or villages prevents late UI/contact side effects.
Offline screens show a connectivity state and do not accept unsent writes as
confirmed. Directory phone data is held only in scoped in-memory queries with
zero retention after unmount; it is not persisted in SQLite or a disk query cache.

Relevant checks:

```powershell
npm run typecheck
npm run lint
npm run test
npm run test:coordinator-integration --workspace=@gaavli/web
npm run test:mobile-integration --workspace=@gaavli/web
npm run test:listing-integration --workspace=@gaavli/web
npm run test:listing-crud --workspace=@gaavli/web
npm run export:android
npm run build:web
```

Integration suites use randomly named isolated databases with guarded cleanup;
they do not seed or modify application villages/accounts. See IMPLEMENTATION_STATUS
for checks actually run. Native large-text, keyboard/back/tab behavior, real GPS
permission flow and physical-device acceptance must be recorded separately.
