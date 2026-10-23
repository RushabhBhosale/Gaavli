import {
  listingIdSchema,
  mobileListingSchema,
  mobileListingsQuerySchema,
  updateListingSchema,
  listingVersionSchema,
  listingOperationKeySchema,
} from "@gaavli/validation";
import { optionalMobile, requireMobile } from "@/server/services/mobile-auth";
import { getGuestListing, getMobileListing } from "@/server/services/listings";
import { AppError } from "@/server/utils/errors";
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
    const id = listingIdSchema.parse((await context.params).id);
    const sourceVillageId = new URL(request.url).searchParams.get(
      "sourceVillageId",
    );
    const source = mobileListingsQuerySchema.shape.sourceVillageId.parse(
      sourceVillageId ?? undefined,
    );
    const user = await optionalMobile(request);
    if (!user) {
      if (!source) throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
      return ok(mobileListingSchema.parse(await getGuestListing(source, id)));
    }
    return ok(
      mobileListingSchema.parse(await getMobileListing(user, id, source)),
    );
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
