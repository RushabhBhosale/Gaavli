import { verifyOtpSchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { verifyMobileChangeOtp } from "@/server/services/mobile-change";
import { jsonBody, ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const input = verifyOtpSchema.parse(await jsonBody(request));
    return ok(
      await verifyMobileChangeOtp(
        String(user._id),
        input,
        request.headers.get("authorization")!.slice(7),
      ),
    );
  });
}
