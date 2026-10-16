import { cookies } from "next/headers";
import { loginSchema } from "@/schemas";
import { login } from "@/server/services/auth";
import { COOKIE } from "@/server/auth/token";
import { safe, checkOrigin, jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return safe(async () => {
    checkOrigin(request);
    const result = await login(loginSchema.parse(await jsonBody(request)));
    (await cookies()).set(COOKIE, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: result.seconds,
    });
    return ok(result.admin);
  });
}
