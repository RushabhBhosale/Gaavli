import {
  listingIdSchema,
  providerClaimResultSchema,
  providerClaimSchema,
} from "@gaavli/validation";
import { claimProfile } from "@/server/services/provider-profiles";
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
    const input = providerClaimSchema.parse(await jsonBody(request));
    return ok(
      providerClaimResultSchema.parse(await claimProfile(user, id, input.note)),
      202,
    );
  });
}
