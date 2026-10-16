import { listingIdSchema, requestActionSchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { updateActivityRequest } from "@/server/services/requests";
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
    const { action } = requestActionSchema.parse(await jsonBody(request));
    return ok(await updateActivityRequest(String(user._id), id, action));
  });
}
