import { pushTestInputSchema } from "@gaavli/validation";
import { after } from "next/server";
import { requireMobileSession } from "@/server/services/mobile-auth";
import { sendFirebaseTestPush } from "@/server/services/notification-push";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const { session } = await requireMobileSession(request);
    const { token, delaySeconds } = pushTestInputSchema.parse(
      await jsonBody(request),
    );
    const result = await sendFirebaseTestPush(
      session,
      token,
      delaySeconds ? after : undefined,
    );
    return ok(result, result.status === "scheduled" ? 202 : 200);
  });
}
