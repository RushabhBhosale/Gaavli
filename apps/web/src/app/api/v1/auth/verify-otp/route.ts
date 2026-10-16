import { verifyOtpSchema } from "@gaavli/validation";
import { verifyOtp } from "@/server/services/mobile-auth";
import { jsonBody, ok } from "@/server/utils/http";
import { mobileEndpoint, networkIdentity } from "@/server/utils/mobile-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const input = verifyOtpSchema.parse(await jsonBody(request));
    return ok(await verifyOtp(input, networkIdentity(request)));
  });
}
