import { refreshSchema } from "@gaavli/validation";
import { logoutMobile } from "@/server/services/mobile-auth";
import { jsonBody, ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const input = refreshSchema.parse(await jsonBody(request));
    return ok(await logoutMobile(input.refreshToken));
  });
}
