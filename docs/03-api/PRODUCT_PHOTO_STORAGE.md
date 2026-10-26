# Product photos with GridFS - 2026-10-25

User-approved temporary Atlas storage for shared-APK testing. This supersedes the
development-only product upload provider. Profile photo storage is unchanged.

## Storage and APIs

The existing Next.js Node.js API and Mongoose connection use MONGODB_URI. There is
no Express server, new dependency, filesystem upload or separate storage account.
The listingPhotoStorage service wraps the GridFS adapter so a future S3 migration
can preserve the existing mobile DTOs. New JPEG/PNG/WebP uploads (max 5 MB, max
25 million decoded pixels, no animation) are resized inside 1600 x 1600, stripped
of metadata and encoded as WebP at quality 80 in memory before GridFS storage.
The existing Expo picker compresses supported selections at quality 0.7 before
upload; native PNG selection can remain lossless. Server WebP encoding bounds
stored image dimensions and reduces storage independently of picker behavior.

- POST /api/v1/listings/photos keeps the authenticated multipart photo and stable
  Idempotency-Key contract. Active-account and 30 uploads/user/hour limits remain.
  The response remains {photoObjectKey,photoUrl}; no old APK schema changes.
- GET /listing-photos/listings/:owner/uploads/:file.webp publicly serves WebP from
  GridFS with no-store and nosniff. URLs resolve against the deployed HTTPS API
  origin on every device, never a device file path or a hardcoded localhost URL.
- Existing POST/PATCH /api/v1/listings attach or replace a validated owner upload.
  Omitted photoObjectKey on edit preserves the key and photoImageId. Explicit null
  clears both. No photo is required for create or edit; the existing placeholder
  appears when photoUrl is null. Version, idempotency and ownership checks remain.
- DELETE /api/v1/listings/photos/:imageId accepts the GridFS ObjectId stored in
  Listing.photoImageId. Requires the active owner; returns 404 for other owners,
  409 PHOTO_IN_USE if any listing (including history) references the key, and
  {deleted:true} on success/replay. The app's Remove photo uses the existing PATCH
  null operation, rather than erasing historical uploaded bytes automatically.

GridFS collections: listingPhotos.files and listingPhotos.chunks. The listingphotos
manifest maps each existing immutable key to owner, fileId, SHA-256 digest and
ready/deleting/deleted state. Listing.photoImageId is an optional ObjectId storing
that fileId; photoObjectKey remains the compatible API reference. No existing
product records or image files are deleted or bulk rewritten on deployment.

Each concurrent upload attempt uses a unique GridFS file ID, then atomically
publishes one manifest per stable key. Losing concurrent files are deleted, and
replays with changed bytes conflict. Publication occurs only after a full stream
finishes. Manifest write locks serialize attachment and explicit deletion so an
in-use file cannot be deleted concurrently with a listing write. Deleted manifests
are retained to reject stale upload replays. A process/network failure before
publication can leave an unreferenced GridFS file; no automatic destructive orphan
cleanup is enabled during testing. Audit these before later storage migration.

## Legacy preservation and deployment

Deploy the backend with its existing Atlas connection and read/write permissions
for the new collections. New uploads need no S3/R2 variables. Existing curated
assets and legacy CDN photo keys retain their resolver. Development local uploads
remain read-only compatible; no new product upload writes local files.

To copy previously uploaded local photos into the target database, run on the
computer holding the legacy files, with the intended Atlas MONGODB_URI configured:

    npm run migrate:listing-photos --workspace=@gaavli/web
    npm run migrate:listing-photos --workspace=@gaavli/web -- --apply

The first command reports a dry run. The second copies referenced legacy upload
files into GridFS and backfills photoImageId without changing photoObjectKey,
versions or product fields. The default source is apps/web/.local/listing-photos;
LISTING_PHOTO_UPLOAD_DIR can select the existing source directory. Originals are
never deleted; missing source files are counted and cause a nonzero exit. Replays
reuse the manifest. Remote/CDN objects are retained as remote references and are
not fetched or deleted. Local files cannot appear on a remote host until copied.

Rebuild the mobile APK for the optional bilingual label and Remove photo button.
Existing compatible APK photo uploads can use the new backend without changing
its API address. No real multi-device or deployed-host verification is implied by
local automated tests.

## Offline behavior

Existing private on-phone photo drafts and stable operation IDs remain intact for
restart recovery. Publishing waits for selected-photo upload confirmation; failure
retains the draft for retry or explicit Remove photo. Publishing with no selected
photo works normally. A saved existing image is preserved unless explicitly
replaced or removed. Backend storage never relies on the phone's local file URI.
