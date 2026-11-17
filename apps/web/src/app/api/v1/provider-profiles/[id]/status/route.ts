import {
  listingIdSchema,
  providerCreatedSchema,
  providerStatusSchema,
} from "@gaavli/validation";
import { setProviderStatus } from "@/server/services/provider-profiles";
import { requireMobile } from "@/server/services/mobile-auth";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    const input = providerStatusSchema.parse(await jsonBody(request));
    const result = await setProviderStatus(
      user,
      id,
      input.status,
      input.version,
    );
    return ok(
      providerCreatedSchema.parse({ profile: result.profile, facility: null }),
    );
  });
}
