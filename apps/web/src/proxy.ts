import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyToken } from "./server/auth/token";
export async function proxy(request: NextRequest) {
  const authenticated = await verifyToken(request.cookies.get(COOKIE)?.value);
  const publicPage = ["/login", "/forgot-password"].includes(
    request.nextUrl.pathname,
  );
  if (!authenticated && !publicPage)
    return NextResponse.redirect(new URL("/login", request.url));
  // Authoritative DB session validation happens in the dashboard layout and APIs.
  return NextResponse.next();
}
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
