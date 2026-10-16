import "server-only";
import { safe } from "./http";
import { AppError } from "./errors";
export function mobileEndpoint(
  request: Request,
  handler: () => Promise<Response>,
) {
  return safe(async () => {
    // Native bearer clients have no Origin. Browser writes remain same-origin only.
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      throw new AppError(403, "FORBIDDEN", "Origin is not allowed.");
    return handler();
  });
}
export function networkIdentity(request: Request) {
  // Enable only behind a proxy that overwrites incoming forwarded headers.
  return process.env.MOBILE_TRUST_PROXY === "true"
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "local-untrusted-network";
}
