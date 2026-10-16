import { validateApiBaseUrl } from "@gaavli/utils";

export function resolveListingPhotoUrl(
  photoUrl: string | null | undefined,
  baseUrl: string | undefined,
  development: boolean,
): string | null {
  if (!photoUrl) return null;
  try {
    const base = new URL(validateApiBaseUrl(baseUrl, development));
    const relative =
      /^\/listing-photos\/listings\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg)$/.test(
        photoUrl,
      );
    if (photoUrl.startsWith("/") && !relative) return null;
    const url = new URL(photoUrl, base);
    if (
      url.username ||
      url.password ||
      (url.protocol !== "https:" &&
        !(
          development &&
          url.protocol === "http:" &&
          url.origin === base.origin
        ))
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}
