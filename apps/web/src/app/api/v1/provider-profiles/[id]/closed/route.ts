import {
  listingIdSchema,
  providerClosedSchema,
  providerCreatedSchema,
} from "@gaavli/validation";
import { setProviderClosed } from "@/server/services/provider-profiles";
import { requireMobile } from "@/server/services/mobile-auth";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
// The owner closes their shop or service for now, or opens it again.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    const input = providerClosedSchema.parse(await jsonBody(request));
    const result = await setProviderClosed(
      user,
      id,
      input.closed,
      input.version,
    );
    return ok(
      providerCreatedSchema.parse({ profile: result.profile, facility: null }),
    );
  });
}
