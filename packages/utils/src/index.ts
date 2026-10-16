/** Local HTTP is development-only; shipped apps must use HTTPS. */
export function validateApiBaseUrl(
  value: string | undefined,
  development: boolean,
): string {
  if (!value) throw new Error("API_URL_MISSING");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("API_URL_INVALID");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !(url.protocol === "https:" || (development && url.protocol === "http:")) ||
    url.pathname.replace(/\/$/, "") !== "/api/v1"
  )
    throw new Error("API_URL_INVALID");
  return url.toString().replace(/\/$/, "");
}
