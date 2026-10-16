# Admin portal API supplement

These browser-only endpoints implement the requested initial admin scope. They do not replace or implement the mobile `/api/v1` contract.

All responses use `{ success: true, data }` or `{ success: false, error: { code, message }, requestId }` and `Cache-Control: no-store`. Protected endpoints validate a signed cookie, unexpired server session, active administrator and `super_admin` role. Mutations require an exact same-origin `Origin` header; JSON bodies are validated with Zod. No permissive CORS is configured.

| Method | Endpoint                     | Input / output                                                                          |
| ------ | ---------------------------- | --------------------------------------------------------------------------------------- |
| POST   | `/api/auth/login`            | `{ identifier, password, remember }`; admin DTO; httpOnly cookie                        |
| POST   | `/api/auth/logout`           | Revokes server session and clears cookie                                                |
| GET    | `/api/auth/me`               | `{ id, name, role }`                                                                    |
| GET    | `/api/dashboard/stats`       | Cards and effective listing status counts                                               |
| GET    | `/api/dashboard/user-growth` | Six monthly `{ month, Farmers, Buyers }` records                                        |
| GET    | `/api/users`                 | `role`, `village`, `status`, `search`, `page`, `limit`; `{ users, total, page, limit }` |
| GET    | `/api/users/counts`          | Global `{ all, seller, buyer, coordinator }` capability counts                          |
| POST   | `/api/users`                 | `{ name, mobile, roles, village, status }`; safe user DTO                               |
| PUT    | `/api/users/:id`             | Complete editable fields plus `version`; safe user DTO                                 |
| PATCH  | `/api/users/:id/status`      | `{ status, version }`; ID, status and new version                                       |
| GET    | `/api/villages`              | Active village `{ id, name }` list                                                      |

## Village directory — 2026-10-12

### Village create/edit and status — 2026-10-12

| Method | Endpoint | Input/output |
| --- | --- | --- |
| POST | `/api/v1/admin/villages` | `VillageInput`; `{ id, version }`, 201 |
| PUT | `/api/v1/admin/villages/:id` | Complete `VillageInput` plus `version`; `{ id, version }` |
| PATCH | `/api/v1/admin/villages/:id/status` | `{ status: "active" or "inactive", version }`; `{ id, status, version }` |
| GET | `/api/v1/admin/villages/:id/dependencies` | Existing home-user, all-listing and coordinator-assignment counts |
| GET | `/api/v1/admin/coordinators` | Safe `{ id, name, status }` options; all coordinator-role users |

`VillageInput` is `{ name, nameMr, taluka, district, latitude, longitude,
coordinatorIds }`. Names/administrative areas are trimmed, length-bounded strings;
coordinates are finite latitude [-90,90] and longitude [-180,180]. Coordinator IDs
must be distinct ObjectIds (maximum 1, per user-approved 2026-10-12 revision). New assignments require active users with
the coordinator role. Retained assignments may belong to inactive users while the
role is still present. All endpoints require the live Super Admin session; writes
require same-origin JSON requests. Mutations and audit/assignment notification
records commit in one MongoDB transaction. Duplicate village names return 409;
invalid coordinators return 422; stale versions return 409; missing villages 404.

Directory rows now include `latitude`, `longitude`, `version` and real coordinator
arrays (empty means unassigned). Legacy villages without coordinates return null
coordinates; editing requires administrators to enter real values. `nearbyMapped`
is still null. Deactivation preserves users, listings, assignments and history;
active village dropdowns exclude inactive villages. Revoking a user's coordinator
role clears village assignments atomically and increments affected village versions.
No public/mobile coordinate endpoint or proximity mapping is introduced.

`DELETE /api/v1/admin/villages/:id` accepts `{ version }` and returns `{ id }`.
It requires the same authentication/origin/validation as other mutations. The
confirmation dialog reports users, listings, coordinator assignments, mappings,
preferences, services and notification subscriptions, and offers deactivation.
Server-side transactional dependency checks run again at deletion time. Any link
blocks deletion with 409 `DEPENDENCIES_EXIST`; stale version returns 409. Only an
unreferenced village can be deleted. Audit history is preserved. The checks cover
implemented models and canonical documented reference collections; future writers
must acquire the village document lock before adding references and extend these
checks when introducing new reference collections.

`GET /api/v1/admin/villages` uses the same live Super Admin session checks and
no-store responses. Query: optional `search` (literal English/Marathi village
name, taluka or district; maximum 100 characters), `district` (exact match),
`status` (`active` or `inactive`), `page` (default 1, maximum 100000), and `limit`
(default 6, maximum 100). Unknown query fields are rejected with 422.

Data: `{ villages, districts, total, page, limit }`. Villages are sorted by English
name then ID; out-of-range pages are clamped to the last available page. Each row
contains `id`, `name`, `nameMr`, `taluka`, `district`, `users`, `status`,
`coordinators`, and `nearbyMapped`. `users` counts all users whose home village
matches, regardless of status. District options cover all stored villages.
`coordinators` now returns the explicit assigned coordinator (zero or one entries). `nearbyMapped`
still returns null because proximity persistence is not implemented. Home-village
membership and coordinator role flags are never used to infer assignments. No user
contact details are returned.

The active-village dropdown endpoint `/api/villages` remains unchanged. The new
endpoints implement authenticated admin directory/mutations, not public/mobile
village APIs.

Page defaults to 1 and limit to 7; maximum limit 100. Users sort by joined date and ID descending. Search uses escaped literal regex over name/mobile. Invalid input returns 422, duplicate identity or stale version 409, missing session 401, foreign origin 403, missing user 404. Unknown failures return a generic 500 without database internals.

The user-list `role` filter accepts `seller`, `buyer`, or `coordinator`. Counts
overlap because a user can hold multiple capabilities. Coordinator display and
filtering do not grant the role. As of 2026-10-12, Super Admin create/edit payloads
accept any nonempty, duplicate-free combination of buyer, seller and coordinator.
Buyer is always retained server-side, and unrelated service capabilities survive
edits. Selecting Coordinator grants it; clearing it on edit removes it. A grant
or removal commits a specific audit entry and a Marathi in-app notification record
in the same transaction as the user change. Unchanged coordinator state produces
no extra role-change notice. Super Admin injection remains rejected. Village
assignments are described below; end-user notification retrieval/delivery remains pending.

Month-over-month percentages compare new records this UTC calendar month to the previous UTC month; a zero baseline returns `null`. Listing overview counts an active listing past its expiry as expired. Active-listing percentage compares currently active records created in each month, not a historical snapshot. Both capability series may count the same person. Counts are not fabricated when a baseline is absent.

The latest task explicitly allows admin-managed Farmer/Buyer capabilities and 1/30-day sessions. Buyer remains universal; coordinator and service capabilities are preserved during edits. Production listing-derived seller capability, complete listing lifecycle, and mobile enum/field mapping require later implementation. This supplement documents the initial panel representation rather than claiming full canonical marketplace models are implemented.
