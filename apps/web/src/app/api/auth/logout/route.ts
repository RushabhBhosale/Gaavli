import { cookies } from "next/headers";
import { logout } from "@/server/services/auth";
import { COOKIE } from "@/server/auth/token";
import { safe, checkOrigin, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return safe(async () => {
    checkOrigin(request);
    const jar = await cookies();
    await logout(jar.get(COOKIE)?.value);
    jar.delete(COOKIE);
    return ok({ loggedOut: true });
  });
}
