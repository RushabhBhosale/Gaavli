import {
  mobileListingsQuerySchema,
  mobileListingPageSchema,
  createListingSchema,
  listingOperationKeySchema,
} from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { listMobileListings } from "@/server/services/listings";
import { createOwnedListing } from "@/server/services/listing-mutations";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok, jsonBody } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const query = mobileListingsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
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
