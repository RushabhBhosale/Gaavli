import { updateMobileProfileSchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { getMobileProfile, saveMobileProfile } from "@/server/services/profile";
import { jsonBody, ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    return ok(await getMobileProfile(String(user._id)));
  });
}
export async function PATCH(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const input = updateMobileProfileSchema.parse(await jsonBody(request));
    return ok(await saveMobileProfile(String(user._id), input));
  });
}
