# Initial admin panel persistence

MongoDB Atlas or a MongoDB replica set is required for audited admin mutations. The development sample seed also supports standalone MongoDB. Server services call Mongoose through server-only modules; scripts intentionally import models directly. Client components receive explicitly mapped DTOs.

- `admins`: separate Super Admin credential collection; name, unique sparse email/mobile, private bcrypt password hash, fixed role, status, failed attempt count, lock expiry, last login, timestamps.
- `adminsessions`: administrator reference and expiry; TTL cleanup and explicit logout revocation. Each API checks session and current administrator state; JWT validity alone is insufficient.
- `users`: name, unique sparse email/mobile, overlapping buyer/seller/coordinator/service capabilities, village reference, status, default Marathi language, timestamps and optimistic version. No password or admin role is stored here.
- `villages`: English/Marathi names, taluka, district, active state, optional
  GeoJSON `location` with [longitude, latitude], nullable `deactivatedAt`,
  timestamps and optimistic `__v`. Existing records without locations remain
  readable; create/edit APIs require validated coordinates. No nearby relations
  are inferred from coordinates.
- `villagecoordinators`: explicit `villageId`/`userId` links, timestamps, unique
  compound index, unique villageId index and user lookup index. At most one
  coordinator per village; a coordinator can cover multiple villages. Only administrators assign existing coordinator-role
  users. Role revocation clears assignments in the user transaction. Assignment
  writes lock coordinator versions to prevent concurrent role-revocation races.

The 2026-10-12 single-coordinator revision supersedes earlier many-to-many village
wording. `scripts/enforce-single-coordinator.mjs` checks existing assignments
before creating the unique villageId index; it refuses conflicting data without
removing any assignments. The local index was provisioned successfully.
Village deletion checks all existing users/listings/assignments plus documented
proximity, preferences, service and subscription references in its transaction.
It blocks any linked village, preserves audit history and uses the same village
document lock as membership/assignment writers. Future reference-writing modules
must follow that locking rule and extend the dependency checks.
- `listings`: requested dashboard-only product/category/quantity/unit/optional price, seller/village references, status, expiry and timestamps. Full listing creation and offline lifecycle are not implemented.
- `auditlogs`: actor, action, target and timestamps. User creation/edit/status mutations and their audit records commit together. Login, lockout and logout are recorded without credentials or contact payloads.
- `notifications`: initial in-app coordinator grant/removal records with `userId`,
  `type` (`COORDINATOR_GRANTED` / `COORDINATOR_REMOVED` /
  `VILLAGE_ASSIGNED` / `VILLAGE_UNASSIGNED`), Marathi `title`/`body`,
  nullable `readAt` and timestamps. Indexed by user and creation date. Admin role
  changes, their role audit entries and notices commit together. No contact
  information or secrets are stored; notification retrieval/delivery is pending.

Schema definitions and indexes are in `src/server/models/index.ts`. Unique indexes must be provisioned before production traffic (seed scripts initialize indexes). A future migration must map the initial panel's lowercase enums and `village`/`seller` fields to the canonical mobile models before mobile APIs consume this data.

Sample seed is development-only and refuses to insert when unrelated marketplace records exist. It uses deterministic sample IDs and insert-only upserts, preserving existing sample records and allowing interrupted runs to resume. Replica-set and sharded deployments use a transaction; standalone deployments insert villages, users and listings in order without a transaction. All records are validated before insertion, and sample counts are checked afterward. Its artificial mobile numbers must never be sent to a messaging provider. First-admin seed is idempotent and does not reset an existing password.
