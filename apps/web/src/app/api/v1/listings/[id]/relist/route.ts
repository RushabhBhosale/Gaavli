import {
  listingIdSchema,
  relistListingSchema,
  listingOperationKeySchema,
} from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { relistOwnedListing } from "@/server/services/listing-mutations";
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
    const input = relistListingSchema.parse(await jsonBody(request));
    const result = await relistOwnedListing(String(user._id), id, key, input);
    return ok(result.data, result.status);
  });
}
