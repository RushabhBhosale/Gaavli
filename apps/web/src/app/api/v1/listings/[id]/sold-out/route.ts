import {
  listingIdSchema,
  listingVersionSchema,
  listingOperationKeySchema,
} from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { markOwnedListingSoldOut } from "@/server/services/listing-mutations";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok, jsonBody } from "@/server/utils/http";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    const key = listingOperationKeySchema.parse(
      request.headers.get("idempotency-key"),
    );
    const { version } = listingVersionSchema.parse(await jsonBody(request));
    const result = await markOwnedListingSoldOut(
      String(user._id),
      id,
      key,
      version,
    );
    return ok(result.data, result.status);
  });
}
