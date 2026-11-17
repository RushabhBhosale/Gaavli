import { pushDeviceInputSchema } from "@gaavli/validation";
import { requireMobileSession } from "@/server/services/mobile-auth";
import { sendFirebaseTestPush } from "@/server/services/notification-push";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";

export const runtime = "nodejs";
const testInputSchema = pushDeviceInputSchema.pick({ token: true });

export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const { session } = await requireMobileSession(request);
    const { token } = testInputSchema.parse(await jsonBody(request));
    return ok(await sendFirebaseTestPush(session, token));
  });
}
