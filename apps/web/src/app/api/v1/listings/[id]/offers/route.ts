import {
  listingIdSchema,
  listingOffersSchema,
  mobileListingsQuerySchema,
} from "@gaavli/validation";
import { optionalMobile } from "@/server/services/mobile-auth";
import { listingOffers } from "@/server/services/listings";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";
export const runtime = "nodejs";
// Every seller offering the same product and unit, cheapest first. No seller
// names or phone numbers: contact goes through the existing contact route.
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const id = listingIdSchema.parse((await context.params).id);
    const source = mobileListingsQuerySchema.shape.sourceVillageId.parse(
      new URL(request.url).searchParams.get("sourceVillageId") ?? undefined,
    );
    const user = await optionalMobile(request);
    return ok(listingOffersSchema.parse(await listingOffers(user, id, source)));
  });
}
