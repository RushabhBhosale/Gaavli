import { mobileChangeSchema, otpChallengeSchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { sendMobileChangeOtp } from "@/server/services/mobile-change";
import { jsonBody, ok } from "@/server/utils/http";
import { mobileEndpoint, networkIdentity } from "@/server/utils/mobile-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const input = mobileChangeSchema.parse(await jsonBody(request));
    return ok(
      otpChallengeSchema.parse(
        await sendMobileChangeOtp(user, input.mobile, networkIdentity(request)),
      ),
    );
  });
}
