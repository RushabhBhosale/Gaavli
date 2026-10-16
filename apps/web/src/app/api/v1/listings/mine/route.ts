import {
  ownListingsQuerySchema,
  ownListingPageSchema,
} from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { listOwnListings } from "@/server/services/listing-mutations";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const query = ownListingsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return ok(
      ownListingPageSchema.parse(
        await listOwnListings(String(user._id), query),
      ),
    );
  });
}
