# Phone product photo uploads — 2026-10-15

## Mobile

Add Listing now has **Choose photo from phone**, using the Expo SDK-compatible
`expo-image-picker` library. Selection/cropping returns one image. No camera or
microphone feature/permission is added. Cancel preserves the current selection.
The existing stock collection and no-photo choice remain available.

Supported inputs are JPEG, PNG and WebP up to 5 MiB after picker processing.
`expo-file-system` copies the selection into the app's private documents folder:
`listing-photos/<account-id>/<village-id>/<operation-id>.<extension>`.
SQLite stores its relative file name, MIME type, stable upload operation ID and
optional uploaded key. No temporary picker URI or image bytes enter the listing
payload or MongoDB. The documents root is resolved afresh after app restart.

The form shows a local preview and saves selection with the existing draft. Offline
selection works; publishing requires connectivity. Before publishing, validate all
other fields, upload the file, save the returned key, then stage the exact listing
request as before. Uploads allow a 60-second timeout. Retry reuses the same upload ID;
completed uploads are reused on later listing retries. Replacing/clearing a photo
cleans up the previous private file only after the draft change is durable. A
successful publication removes the draft copy; server listing images remain.

## API and local development storage

Expo 57 compatibility correction: upload multipart parts now contain an actual
`expo-file-system` File, following Expo fetch's supported File/Blob contract.
Legacy `{uri,name,type}` objects are explicitly rejected by the installed SDK's
converter before any network call; the previous client wrapper incorrectly mapped
that serialization failure to NETWORK_ERROR. A regression test rejects the legacy
shape and verifies multipart bytes/type. USB settings do not fix this client bug.

`POST /api/v1/listings/photos`: native bearer authentication and existing origin
policy, `Idempotency-Key` (same bounded operation ID format as listing writes),
multipart body with exactly one `photo` file and no other fields.

Returns 201, no-store JSON:

```json
{
  "success": true,
  "data": {
    "photoObjectKey": "listings/<authenticated-user-id>/uploads/<operation-hash>.webp",
    "photoUrl": "/listing-photos/listings/<authenticated-user-id>/uploads/<operation-hash>.webp"
  }
}
```

- Auth and origin checks precede file parsing. Streamed body is bounded to 5 MiB
  plus 64 KiB of multipart overhead, even without Content-Length. Individual image
  size is limited to 5 MiB. Unexpected fields, bad multipart and unsupported types
  are rejected. Persistent per-user limit is 30 upload attempts/hour.
- Sharp decodes/validates content independently of file name/MIME, rejects animated
  or unsupported formats and inputs above 25 million pixels, auto-orients, resizes
  within 1600×1600, strips metadata and outputs WebP. No original EXIF/GPS is stored.
- Active account status is rechecked before persistence. The authenticated account
  determines owner; a submitted owner ID is never accepted.
- The development provider stores normalized images under
  `apps/web/.local/listing-photos/listings/<user-id>/uploads/`. Override its root with
  server-only `LISTING_PHOTO_UPLOAD_DIR`. `.local/` is git-ignored; this is separate
  from bundled stock assets. The MongoDB listing stores only `photoObjectKey`.
- Immutable final files are published atomically from complete temporary files.
  Same user/operation/normalized content returns the same key; conflicting content
  returns 409 PHOTO_OPERATION_CONFLICT. Temporary files are cleaned up.
- The dedicated GET `/listing-photos/listings/:owner/uploads/:file` reads only exact
  validated owner/hash WebP keys, with image/webp, no-store and nosniff headers.
  Product image URLs are public, as with the existing image-provider contract;
  users should choose product imagery intended for publication.
- Create/PATCH reject another account's keys and require the local uploaded object
  to exist for `/uploads/` keys. Existing safe owned legacy/provider and stock keys
  keep their established behavior. No new listing schema field is necessary.

Stable errors include PHOTO_INVALID (400/422), PHOTO_TOO_LARGE (413),
PHOTO_OPERATION_CONFLICT (409), PHOTO_UNAVAILABLE (404/422), and
PHOTO_STORAGE_UNAVAILABLE (503). Mobile presents translated errors and retains
retryable drafts; it never treats uploaded-but-unpublished stock as published.

## Production and remaining work

The local provider is explicitly development-only and fails closed in production.
Durable R2/S3 upload/serve integration, object lifecycle/orphan cleanup and production
quotas are not implemented by this local workflow. Setting the existing read-only
LISTING_PHOTO_BASE_URL does not configure an upload provider. Unreferenced development
uploads can remain after abandoned drafts; back up local files if they matter.

Phone gallery/permission/cancel/crop, real device file persistence, app interruption
while the picker is open and slow-network acceptance remain device checks. Android
process-death recovery before the selected image has been copied is not claimed.
Standalone native builds need a rebuild after adding native dependencies/config;
Expo Go users should restart Metro after installation.

## Verification

Isolated MongoDB integration uploads actual JPEG bytes into a random temporary
folder, validates auth/origin/size/format/field rejection, immutable retry/conflict,
WebP dimensions and metadata removal, safe image serving and attached buyer DTO.
Temporary images and test database are removed. Mobile tests cover multipart
boundary handling and persisted phone-file/upload identity. TypeScript, lint,
23 mobile/12 web tests and Android/Hermes export passed; phone visual/native and
production deployment acceptance remain pending.

References: [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/),
[Expo file-system legacy API](https://docs.expo.dev/versions/v55.0.0/sdk/filesystem-legacy/),
[Sharp output/metadata behavior](https://sharp.pixelplumbing.com/api-output/).
