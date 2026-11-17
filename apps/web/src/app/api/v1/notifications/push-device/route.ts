import { pushDeviceInputSchema } from "@gaavli/validation";
import { requireMobileSession } from "@/server/services/mobile-auth";
import { limitRequests } from "@/server/repositories/mobile";
import {
  disablePushDevice,
  getPushDeviceStatus,
  registerPushDevice,
} from "@/server/services/push-devices";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return mobileEndpoint(request, async () =>
    ok(await getPushDeviceStatus(await requireMobileSession(request))),
  );
}

async function save(request: Request, optIn: boolean) {
  return mobileEndpoint(request, async () => {
    const auth = await requireMobileSession(request);
    const input = pushDeviceInputSchema.parse(await jsonBody(request));
    await limitRequests("push-device", String(auth.user._id), 120, 3600_000);
    return ok(await registerPushDevice(auth, input, optIn));
  });
}

export async function PUT(request: Request) {
  return save(request, true);
}

export async function PATCH(request: Request) {
  return save(request, false);
}

export async function DELETE(request: Request) {
  return mobileEndpoint(request, async () =>
    ok(await disablePushDevice(await requireMobileSession(request))),
  );
}
