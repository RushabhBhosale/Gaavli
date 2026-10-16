import {
  listingIdSchema,
  mobileListingSchema,
  updateListingSchema,
  listingVersionSchema,
  listingOperationKeySchema,
} from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { getMobileListing } from "@/server/services/listings";
import {
  updateOwnedListing,
  deleteOwnedListing,
} from "@/server/services/listing-mutations";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok, jsonBody } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    return ok(mobileListingSchema.parse(await getMobileListing(user, id)));
  });
}
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    const key = listingOperationKeySchema.parse(
      request.headers.get("idempotency-key"),
    );
    const input = updateListingSchema.parse(await jsonBody(request));
    const result = await updateOwnedListing(String(user._id), id, key, input);
    return ok(result.data, result.status);
  });
}
export async function DELETE(
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
    const result = await deleteOwnedListing(String(user._id), id, key, version);
    return ok(result.data, result.status);
  });
}
