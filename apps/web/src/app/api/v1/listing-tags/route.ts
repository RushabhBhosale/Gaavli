import { listingTagCatalogueSchema } from "@gaavli/validation";
import { publicListingTags } from "@/server/services/listing-tags";
import { ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";

export const runtime = "nodejs";

// Public reference data: the tags sellers can add to a listing and where each
// is offered. No account data, so it may be cached briefly.
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const response = ok(
      listingTagCatalogueSchema.parse(await publicListingTags()),
    );
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    );
    return response;
  });
}
