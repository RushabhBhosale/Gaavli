# Approved Client/Server Flow

Offline support remains mandatory. The target flow is React Native → TanStack Query/Zustand → Expo SQLite → persistent sync queue → sync engine → Next.js REST API → MongoDB Atlas. Preserve stable operation IDs, idempotency, retries, conflict handling, restart recovery, and server authority. Mobile consumes REST/JSON; it never connects to MongoDB. Next.js server caching and Mobile SQLite caching are separate concerns.


# Gaavli — OFFLINE_SYNC.md

**Version:** 1.0
**Purpose:** Authoritative specification for offline-first mobile behavior, local persistence, synchronization, retries, conflict handling and network recovery.

---

# 1. PURPOSE

Gaavli must remain usable in areas with:

* weak mobile networks
* intermittent connectivity
* temporary network loss
* slow internet
* unstable mobile data
* app termination
* device restart

Offline functionality is a **core product requirement**, not an optional enhancement.

The application must never silently lose user-entered information because connectivity is unavailable.

The offline architecture must prioritize:

```text
Data safety
    ↓
Correct synchronization
    ↓
Clear user feedback
    ↓
Simple implementation
```

Do not introduce complex infrastructure merely to support offline synchronization.

---

# 2. OFFLINE-FIRST PRINCIPLE

The application should follow:

```text
Local-first user interaction
        ↓
Persistent local storage
        ↓
Pending synchronization
        ↓
Server synchronization
        ↓
Server-authoritative state
```

The user should be able to perform supported actions without waiting for the network.

However:

> Offline does not mean the client becomes the source of truth.

The server remains authoritative.

---

# 3. APPROVED TECHNOLOGY

The mobile application must use:

```text
Expo SQLite
```

for persistent offline storage.

Use:

```text
Zustand
```

for temporary/local UI state.

Use:

```text
TanStack Query
```

for server state and API caching.

Use:

```text
NetInfo
```

for network connectivity detection.

Use:

```text
SecureStore
```

for authentication/session secrets.

Do not store authentication tokens or other sensitive credentials in SQLite unless explicitly approved.

---

# 4. WHAT MUST WORK OFFLINE

The MVP offline priority is:

### Offline-capable actions

```text
Listing create
Listing edit
Interested action
Notification opt-in
Relist
Draft creation/editing
```

The exact supported actions must always follow `PROJECT_REQUIREMENTS.md`.

Do not assume every feature must work offline.

---

# 5. OFFLINE READS

Previously synchronized data should remain available when offline.

Examples:

```text
Listings
Categories
Villages
Services
User's own listings
Relevant cached search results
```

The application should display cached data rather than showing an empty application simply because the network is unavailable.

However, cached data must be clearly distinguishable from current server data.

Example:

```text
Showing saved data from earlier
```

or:

```text
Last updated 2 hours ago
```

Do not display stale data as guaranteed current.

---

# 6. DATA CLASSIFICATION

Every mobile data type should be classified as one of:

```text
SERVER_ONLY
CACHEABLE
OFFLINE_WRITABLE
LOCAL_ONLY
SENSITIVE_LOCAL
```

Example:

| Data                   | Classification   |
| ---------------------- | ---------------- |
| Public listings        | CACHEABLE        |
| Categories             | CACHEABLE        |
| Villages               | CACHEABLE        |
| Own listing draft      | OFFLINE_WRITABLE |
| Pending sync operation | OFFLINE_WRITABLE |
| Authentication token   | SENSITIVE_LOCAL  |
| Temporary UI state     | LOCAL_ONLY       |
| Server audit log       | SERVER_ONLY      |

The classification must be documented before introducing new offline data.

---

# 7. LOCAL DATABASE

The local SQLite database should contain only data necessary for:

1. Offline reads
2. Offline actions
3. Draft persistence
4. Synchronization
5. Sync status
6. Minimal local metadata

Do not replicate the entire MongoDB database into SQLite.

Avoid unnecessary local copies of:

* admin data
* audit logs
* unrelated users
* sensitive information
* large historical datasets

---

# 8. LOCAL DATABASE SHOULD BE SMALL

The mobile database should remain lightweight.

Use:

```text
Pagination
Retention limits
Selective caching
Expiry
Cleanup
```

Do not cache unlimited listings.

Example principle:

```text
Cache useful recent/relevant data
        ↓
Remove stale/unnecessary data
        ↓
Keep device storage under control
```

---

# 9. LOCAL DATA STRUCTURE

A conceptual local schema may contain:

```text
local_listings
local_services
local_villages
local_categories
local_user
local_drafts
sync_queue
sync_metadata
```

The exact schema must be defined in the implementation/database specification.

Do not create local tables merely because corresponding MongoDB collections exist.

---

# 10. SYNC QUEUE

All offline write operations must enter a persistent sync queue.

Conceptually:

```text
User Action
    ↓
Create local change
    ↓
Create sync_queue record
    ↓
Show Pending
    ↓
Network available
    ↓
Attempt sync
    ↓
Server
    ↓
Success / Conflict / Retry / Permanent Failure
```

The queue must survive:

* app restart
* device restart
* application termination
* temporary network loss

---

# 11. SYNC QUEUE RECORD

Every queued operation should contain enough information to safely retry.

Conceptually:

```text
id
operationId
operationType
entityType
entityId
payload
createdAt
attemptCount
lastAttemptAt
nextRetryAt
status
errorCode
errorMessage
```

Additional fields may be required by the implementation.

Do not store unnecessary sensitive information inside queue records.

---

# 12. OPERATION ID

Every offline operation must have a unique client-generated identifier.

Example:

```text
operationId = UUID
```

The same operation must retain the same `operationId` across retries.

Never generate a new operation ID for every retry.

---

# 13. IDEMPOTENCY — CRITICAL

The server must safely handle duplicate delivery.

Example:

```text
Mobile sends:
operationId = ABC123

Server processes it.

Response is lost.

Mobile retries:
operationId = ABC123
```

The server must recognize:

```text
ABC123 already processed
```

and must not create another listing or duplicate action.

This is mandatory for offline synchronization.

---

# 14. SYNC STATES

Each queued operation should have a clear state.

Recommended:

```text
PENDING
SYNCING
SYNCED
FAILED_RETRYABLE
FAILED_PERMANENT
CONFLICT
```

Do not use ambiguous states such as:

```text
DONE
ERROR
```

when more precise behavior is required.

---

# 15. SYNC PROCESS

When connectivity becomes available:

```text
1. Detect network
2. Load pending operations
3. Select eligible operations
4. Send operation
5. Receive server response
6. Update local data
7. Mark operation appropriately
8. Continue with next operation
```

The process must be safe to run multiple times.

---

# 16. SYNC ORDER

For operations belonging to the same entity, preserve logical order.

Example:

```text
Create Listing
      ↓
Edit Listing
      ↓
Mark Sold Out
```

Do not send:

```text
Mark Sold Out
      ↓
Create Listing
      ↓
Edit Listing
```

because the network happened to recover in an unexpected order.

Per-device operation ordering must be deterministic.

---

# 17. DIFFERENT ENTITIES MAY SYNC INDEPENDENTLY

Operations affecting unrelated entities may be synchronized independently where safe.

Example:

```text
Listing A
Listing B
Interest C
```

do not necessarily need to block one another.

However, do not introduce parallel sync merely for performance if it complicates ordering or conflict handling.

Correctness comes first.

---

# 18. NETWORK DETECTION

Use NetInfo to detect connectivity changes.

However:

> Network connectivity does not guarantee internet/API availability.

Therefore:

```text
NetInfo says connected
```

must not automatically mean:

```text
API is reachable
```

The actual API request determines whether synchronization succeeds.

---

# 19. RETRY POLICY

Retry transient failures.

Examples:

```text
Timeout
Temporary network error
Server unavailable
5xx response
```

Do not endlessly retry permanent failures.

Use bounded exponential backoff.

Example conceptual schedule:

```text
Immediate
   ↓
5 sec
   ↓
15 sec
   ↓
30 sec
   ↓
1 min
   ↓
5 min
```

Exact values may be configured.

---

# 20. PERMANENT FAILURES

Do not retry indefinitely for errors such as:

```text
Invalid data
Unauthorized
Forbidden
Invalid listing state
Duplicate that cannot be resolved
Entity deleted
Validation failure
```

Mark the operation:

```text
FAILED_PERMANENT
```

or:

```text
CONFLICT
```

as appropriate.

The user must be informed when manual action is required.

---

# 21. USER-VISIBLE SYNC STATUS

Users should be able to understand what happened.

Example:

### Offline listing

```text
Saved on this phone
Will publish when internet is available
```

### Syncing

```text
Publishing...
```

### Successful

```text
Published
```

### Failed

```text
Could not publish
Retry
```

### Conflict

```text
This listing was changed elsewhere.
Review required.
```

Never silently fail.

---

# 22. FALSE SUCCESS IS FORBIDDEN

This is a critical rule.

If the server has not confirmed an operation:

**Do not represent it as server-confirmed.**

Bad:

```text
Listing published successfully
```

when only local SQLite saved it.

Correct:

```text
Listing saved offline.
It will be published when internet is available.
```

---

# 23. OPTIMISTIC UI

Optimistic UI may be used where appropriate.

However, distinguish:

```text
Locally accepted
```

from:

```text
Server confirmed
```

Example:

```text
Interested ✓
Pending sync
```

rather than falsely implying the seller has already received the action.

---

# 24. DRAFTS

Drafts are local-first.

If a user begins entering:

```text
Item
Quantity
Unit
Rate
Photo
Description
```

and loses connectivity:

> The entered information must not disappear.

Drafts should survive app restart where required.

Drafts must have clear states:

```text
Draft
Pending publication
Published
Failed
```

---

# 25. PHOTO OFFLINE BEHAVIOR

If listing photos are supported offline:

1. Save the local photo reference.
2. Preserve the listing draft.
3. Queue the upload.
4. Upload when connectivity returns.
5. Update listing metadata after successful upload.

Do not assume a photo upload succeeded merely because the file exists locally.

Large files should be handled carefully to avoid exhausting device storage.

---

# 26. PHOTO RETRY

If photo upload fails:

```text
Keep draft
Keep local photo
Mark upload pending/failed
Allow retry
```

Do not delete the only local copy until the server has safely received the required asset, subject to the approved storage policy.

---

# 27. CONFLICT PRINCIPLE

Conflicts occur when:

```text
Mobile has stale data
+
Server has newer data
```

The server is authoritative.

Never blindly overwrite server data with an offline copy.

---

# 28. LISTING CONFLICT EXAMPLES

### Example 1 — Server sold out

Mobile:

```text
ACTIVE
```

Server:

```text
SOLD_OUT
```

Mobile later syncs an old edit.

Result:

```text
Server remains SOLD_OUT
```

Do not resurrect the listing.

---

### Example 2 — Listing deleted/deactivated

Mobile:

```text
old listing
```

Server:

```text
DEACTIVATED
```

Offline mobile edit arrives.

Result:

```text
Reject or mark conflict
```

Do not automatically recreate the listing.

---

# 29. LAST-WRITE-WINS

Do not use generic "last-write-wins" for every business operation.

For simple non-critical fields, it may be acceptable if explicitly approved.

For state transitions such as:

```text
Sold out
Expired
Deactivated
Deleted
```

use business-aware conflict rules.

---

# 30. SERVER VERSIONING

Where practical, synchronizable records should have a version mechanism such as:

```text
version
updatedAt
revision
```

The exact mechanism must be defined in the API/database specification.

Conceptually:

```text
Mobile knows:
version = 4

Server is now:
version = 5
```

The server can detect stale updates.

---

# 31. CONFLICT RESPONSE

The API should return a structured conflict response rather than a generic error.

Conceptually:

```text
409 Conflict
```

with enough information for the mobile client to understand:

```text
Entity
Server state
Reason
Expected action
```

Do not expose unnecessary internal database details.

---

# 32. USER CONFLICT HANDLING

The user should not be forced to understand technical concepts such as:

```text
revision mismatch
ETag
MongoDB version
```

Use simple language.

Example:

> This listing was updated while your phone was offline. Please review the latest version.

---

# 33. INTEREST ACTIONS

"Interested" is a special case.

It should be idempotent.

If the user taps:

```text
Interested
```

multiple times because of poor connectivity, the system must not create multiple identical interest records unless the product explicitly allows repeated interest events.

Use:

```text
operationId
```

and appropriate server-side uniqueness/business rules.

---

# 34. NOTIFICATION OPT-IN OFFLINE

If the user changes notification preferences offline:

```text
Save locally
Queue change
Sync later
```

However, the application must clearly distinguish:

```text
Preference saved locally
```

from:

```text
Server preference updated
```

---

# 35. RELIST OFFLINE

If relisting is an approved offline action:

```text
User chooses Relist
       ↓
Local state updated
       ↓
Queue operation
       ↓
Server validates
       ↓
Listing becomes active
```

The server must revalidate:

* ownership
* listing state
* expiry
* permissions
* duplicate rules
* active-listing limits

Do not trust the local client.

---

# 36. CACHE INVALIDATION

After successful synchronization:

```text
Update local SQLite
Invalidate/revalidate TanStack Query cache
```

Do not allow:

```text
SQLite = new
TanStack Query = old
```

to create confusing UI states.

The exact cache strategy should be documented per module.

---

# 37. SERVER RESPONSE IS AUTHORITATIVE

After successful sync, use the server response to update the local record wherever practical.

Do not assume:

```text
client object == server object
```

The server may assign:

* IDs
* timestamps
* status
* normalized values
* permissions
* calculated fields

---

# 38. OFFLINE SEARCH

Offline search should operate against the locally cached dataset.

It should not pretend to represent the entire marketplace.

Clearly communicate limitations where appropriate.

For example:

> Showing saved results available on this phone.

Do not tell users:

> No farmers found.

when the actual meaning is:

> No matching farmers found in the cached offline data.

---

# 39. "AVAILABLE NOW" OFFLINE

This filter requires special care.

Availability may have changed on the server.

Therefore offline mode must not present cached availability as guaranteed current.

Possible UI:

```text
Available based on saved information
```

or:

```text
Last updated: 2 hours ago
```

When online, refresh authoritative availability.

---

# 40. PREVIOUSLY AVAILABLE

"Previously available — may return" is suitable for cached historical discovery.

However:

> Historical availability must never be presented as current stock.

The UI should clearly distinguish:

```text
Available now
```

from:

```text
Previously available
```

and:

```text
Cached result
```

---

# 41. APP STARTUP

On startup:

```text
1. Load local session
2. Load cached data
3. Render usable UI
4. Determine connectivity
5. Refresh server data if possible
6. Process pending sync queue
```

Do not block the entire application waiting for the network unless authentication/security requires it.

---

# 42. APP TERMINATION

The system must assume the application can be killed at any moment.

Therefore:

> Important offline data must be persisted before relying on background synchronization.

Never keep the only copy of a listing draft or pending operation in memory.

---

# 43. DEVICE RESTART

After restart:

```text
SQLite
   ↓
Restore pending queue
   ↓
Restore drafts
   ↓
Restore cached data
```

The app should continue synchronization when connectivity becomes available.

---

# 44. MULTIPLE DEVICES

A user may eventually use more than one device.

Never assume:

```text
one user = one device
```

Server-side synchronization and authorization remain authoritative.

A stale device must not overwrite newer server state.

---

# 45. LOGOUT BEHAVIOR

When a user logs out:

* remove sensitive authentication information according to security policy
* preserve or remove local cached data according to privacy requirements
* do not allow another user to access the previous user's private data

Sensitive user-specific SQLite data must not leak across accounts.

---

# 46. ACCOUNT DEACTIVATION

If the server deactivates a user while their phone is offline:

```text
Offline device
    ↓
Attempts action
    ↓
Server rejects
    ↓
Client updates local session/state
```

Do not allow indefinite offline access after server-side account deactivation.

The server remains authoritative.

---

# 47. SECURITY OF OFFLINE DATA

Assume the physical device may be lost.

Do not store unnecessary sensitive information locally.

For sensitive information:

```text
SecureStore
```

or appropriate platform-secure storage should be preferred.

SQLite should not become a dumping ground for:

* passwords
* OTPs
* long-lived secrets
* unnecessary private contact information

---

# 48. SYNC OBSERVABILITY

For debugging, capture non-sensitive synchronization metadata such as:

```text
operation type
operation status
retry count
timestamp
error category
duration
```

Do not log:

```text
OTP
password
token
secret
unnecessary phone numbers
```

---

# 49. SYNC FAILURE MONITORING

Important metrics should eventually include:

```text
sync_success
sync_failure
sync_retry
sync_conflict
queue_size
oldest_pending_operation_age
```

Do not add heavy monitoring infrastructure in MVP unless justified.

---

# 50. SYNC QUEUE CLEANUP

Successfully synchronized operations should eventually be removed or archived from the local queue.

Do not allow the queue to grow indefinitely.

Example:

```text
SYNCED
   ↓
Retain briefly if needed
   ↓
Cleanup
```

Failed permanent operations may need to remain until the user resolves them.

---

# 51. BACKGROUND SYNC

Background synchronization should be used only where reliable and supported by the platform.

Do not assume that mobile operating systems will always allow background execution.

The application must also synchronize when:

```text
App becomes active
Network becomes available
User manually retries
```

---

# 52. MANUAL SYNC

Provide a manual retry mechanism where useful.

Example:

```text
Pending changes: 3

[Sync now]
```

Manual sync must use the same queue and idempotency rules.

Do not create a separate synchronization implementation.

---

# 53. SYNC ALL VS INDIVIDUAL RETRY

Where practical, allow:

```text
Retry all
```

and for permanent failures:

```text
Retry
Edit
Discard
```

depending on the operation type.

Never provide "Discard" for data where doing so could cause unexpected permanent loss without appropriate confirmation.

---

# 54. ERROR CATEGORIES

Errors should be classified.

Recommended:

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

This allows the sync engine to determine whether retry is appropriate.

---

# 55. NEVER RETRY EVERYTHING

This is a critical rule.

Bad:

```text
Any error
   ↓
Retry forever
```

Correct:

```text
Transient error
   ↓
Retry

Permanent error
   ↓
Stop

Conflict
   ↓
Resolve according to business rules
```

---

# 56. TESTING REQUIREMENTS

Offline synchronization requires dedicated tests.

Minimum test scenarios:

### Connectivity

```text
Online → Offline
Offline → Online
Flaky network
API unreachable
```

### Queue

```text
Create operation
Persist operation
Restart app
Retry operation
Duplicate retry
Successful completion
Permanent failure
```

### Conflict

```text
Server newer than client
Listing sold out while client offline
Listing deleted while client offline
User deactivated while offline
```

### Drafts

```text
Enter data
Kill app
Restart
Draft remains
```

### Photos

```text
Photo selected offline
Upload fails
Retry
Upload succeeds
```

---

# 57. CRITICAL ACCEPTANCE TEST

The following scenario must work:

```text
1. User opens Gaavli with internet.
2. User starts creating a listing.
3. Internet disappears.
4. User completes the listing.
5. User taps Publish.
6. App saves the listing locally.
7. App clearly says it is pending.
8. User closes the app.
9. User opens the app again.
10. Listing is still present.
11. Internet returns.
12. App syncs automatically or user taps Sync.
13. Server receives the operation exactly once.
14. Server confirms success.
15. Local record becomes synchronized.
16. UI changes from Pending → Published.
```

If this scenario fails, offline functionality should not be considered complete.

---

# 58. SECOND CRITICAL ACCEPTANCE TEST — CONFLICT

```text
1. User opens listing while online.
2. Listing is ACTIVE.
3. User goes offline.
4. Seller/admin changes listing state on server.
5. Server marks listing SOLD_OUT.
6. User's old device comes online.
7. Device attempts an old edit.
8. Server detects stale state.
9. Server does NOT resurrect ACTIVE state.
10. Client receives conflict/current state.
11. UI explains the situation.
```

---

# 59. THIRD CRITICAL ACCEPTANCE TEST — DUPLICATE REQUEST

```text
1. User creates listing offline.
2. Operation ID = ABC123.
3. App synchronizes.
4. Server creates listing.
5. Response is lost.
6. Mobile retries ABC123.
7. Server recognizes ABC123.
8. Server does not create a second listing.
9. Mobile receives the existing successful result.
```

---

# 60. AI AGENT RULES FOR OFFLINE WORK

When modifying offline functionality, the AI coding agent MUST:

1. Read `docs/OFFLINE_SYNC.md`.
2. Inspect the existing SQLite schema.
3. Inspect the sync queue implementation.
4. Inspect API idempotency behavior.
5. Inspect TanStack Query cache behavior.
6. Inspect network detection.
7. Inspect existing conflict rules.
8. Identify affected offline states.
9. Add/update tests.
10. Verify app restart behavior.

The agent must not create a second offline synchronization mechanism.

---

# 61. DO NOT CREATE MULTIPLE SYNC ENGINES

There must be one clear synchronization mechanism.

Do not create:

```text
ListingSyncService
+
GenericSyncService
+
BackgroundSyncService
+
OfflineManager
```

that independently synchronize the same records.

Prefer:

```text
SyncEngine
    ↓
SyncQueue
    ↓
Operation Handlers
```

with clear responsibilities.

---

# 62. OFFLINE ARCHITECTURE PRINCIPLE

The preferred conceptual architecture is:

```text
                 ┌─────────────────┐
                 │    UI / Expo    │
                 └────────┬────────┘
                          │
                 ┌────────▼────────┐
                 │ TanStack Query  │
                 │ + Zustand       │
                 └────────┬────────┘
                          │
                 ┌────────▼────────┐
                 │   SQLite        │
                 │ Local Database  │
                 └───────┬─────────┘
                         │
                  Sync Queue
                         │
                  ┌──────▼──────┐
                  │  SyncEngine │
                  └──────┬──────┘
                         │
                      Internet
                         │
                  ┌──────▼──────┐
                  │ Next.js REST API  │
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │   MongoDB    │
                  │ Authoritative│
                  └──────────────┘
```

This is the preferred mental model.

---

# 63. GOLDEN RULES

The following rules are non-negotiable:

1. **Never lose user-entered data because of network failure.**
2. **SQLite is the persistent local store for offline functionality.**
3. **The server is always authoritative.**
4. **Every offline write must be idempotent.**
5. **Every queued operation must have a stable operation ID.**
6. **Do not retry permanent failures forever.**
7. **Do not silently discard failed operations.**
8. **Do not show false server-confirmed success.**
9. **Do not let stale clients resurrect deleted/sold-out/deactivated records.**
10. **Do not expose stale cached data as guaranteed current.**
11. **Do not create multiple independent sync mechanisms.**
12. **Do not store unnecessary sensitive information locally.**
13. **Do not introduce Redis/BullMQ/Kafka/etc. just for offline sync.**
14. **Do not use an LLM to solve synchronization problems.**
15. **Do not sacrifice data integrity for implementation simplicity.**

---

# 64. NORTH STAR

The offline architecture exists for one reason:

> **A villager should be able to use Gaavli even when the network is unreliable, without losing what they entered and without the system creating incorrect or duplicate information when connectivity returns.**

The ideal experience is:

```text
Poor network
     ↓
Gaavli still opens
     ↓
Cached information is available
     ↓
User can perform supported actions
     ↓
Actions are safely stored
     ↓
Network returns
     ↓
Changes synchronize automatically
     ↓
Server confirms final state
     ↓
User sees the correct result
```

**Offline-first does not mean offline-authoritative.
Local-first does not mean server-optional.
The server remains the final source of truth.**
