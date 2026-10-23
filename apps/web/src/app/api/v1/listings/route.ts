import {
  mobileListingsQuerySchema,
  mobileListingPageSchema,
  createListingSchema,
  listingOperationKeySchema,
} from "@gaavli/validation";
import {
  optionalMobile,
  requireMobile,
} from "@/server/services/mobile-auth";
import {
  listGuestListings,
  listMobileListings,
} from "@/server/services/listings";
import { AppError } from "@/server/utils/errors";
import { createOwnedListing } from "@/server/services/listing-mutations";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok, jsonBody } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const query = mobileListingsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const user = await optionalMobile(request);
    if (!user) {
      if (!query.sourceVillageId)
        throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
      return ok(
        mobileListingPageSchema.parse(
          await listGuestListings(query.sourceVillageId, query),
        ),
      );
    }
    return ok(
      mobileListingPageSchema.parse(await listMobileListings(user, query)),
    );
  });
}
export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const key = listingOperationKeySchema.parse(
      request.headers.get("idempotency-key"),
    );
    const input = createListingSchema.parse(await jsonBody(request));
    const result = await createOwnedListing(String(user._id), key, input);
    return ok(result.data, result.status);
  });
}
