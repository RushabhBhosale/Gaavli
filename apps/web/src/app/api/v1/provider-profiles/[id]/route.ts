import {
  listingIdSchema,
  providerFacilityDetailSchema,
  providerCreatedSchema,
  updateProviderProfileSchema,
} from "@gaavli/validation";
import {
  getMyProfile,
  updateProviderProfile,
} from "@/server/services/provider-profiles";
import { requireMobile } from "@/server/services/mobile-auth";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    return ok(providerFacilityDetailSchema.parse(await getMyProfile(user, id)));
  });
}
export async function PATCH(request: Request, context: Context) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    const input = updateProviderProfileSchema.parse(await jsonBody(request));
    const result = await updateProviderProfile(user, id, input);
    return ok(
      providerCreatedSchema.parse({ profile: result.profile, facility: null }),
    );
  });
}
