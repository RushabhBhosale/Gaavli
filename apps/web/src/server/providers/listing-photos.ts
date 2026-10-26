import "server-only";
import { LISTING_ASSET_PHOTOS } from "@gaavli/constants";

// Object keys are data; they can never choose an origin or traverse directories.
export function listingPhotoUrl(
  key?: string | null,
  legacy = false,
): string | null {
  if (
    !legacy &&
    key &&
    /^listings\/[a-f0-9]{24}\/uploads\/[a-f0-9]{64}\.webp$/.test(key)
  )
    return `/listing-photos/${key}`;
  if (LISTING_ASSET_PHOTOS.some((photo) => photo.key === key))
    return `/listing-photos/${key}`;
  if (
    !key ||
    !/^listings\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:webp|png|jpg|jpeg)$/.test(
      key,
    )
  )
    return null;
  const configured = process.env.LISTING_PHOTO_BASE_URL;
  if (!configured)
    return process.env.NODE_ENV === "development"
      ? `/listing-photos/${key}`
      : null;
  try {
    const base = new URL(configured);
    if (
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      (base.protocol !== "https:" &&
        !(process.env.NODE_ENV === "development" && base.protocol === "http:"))
    )
      return null;
    base.pathname = `${base.pathname.replace(/\/$/, "")}/`;
    return new URL(key, base).toString();
  } catch {
    return null;
  }
}
