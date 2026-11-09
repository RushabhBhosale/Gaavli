import {
  listingIdSchema,
  providerLinkRequestSchema,
  providerProfilesResponseSchema,
} from "@gaavli/validation";
import { requestLink } from "@/server/services/provider-profiles";
import { requireMobile } from "@/server/services/mobile-auth";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    const input = providerLinkRequestSchema.parse(await jsonBody(request));
    return ok(
      providerProfilesResponseSchema.parse(
        await requestLink(user, id, input.otherProfileId),
      ),
      201,
    );
  });
}
