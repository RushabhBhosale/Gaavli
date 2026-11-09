import {
  listingIdSchema,
  providerLinkActionSchema,
  providerProfilesResponseSchema,
} from "@gaavli/validation";
import { answerLink } from "@/server/services/provider-profiles";
import { requireMobile } from "@/server/services/mobile-auth";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ linkId: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const id = listingIdSchema.parse((await context.params).linkId);
    const input = providerLinkActionSchema.parse(await jsonBody(request));
    return ok(
      providerProfilesResponseSchema.parse(
        await answerLink(user, id, input.action),
      ),
    );
  });
}
