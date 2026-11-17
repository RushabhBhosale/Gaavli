import {
  directoryQuerySchema,
  directoryShopProductsSchema,
  listingIdSchema,
} from "@gaavli/validation";
import { optionalMobile } from "@/server/services/mobile-auth";
import { directoryShopProducts } from "@/server/services/directory";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";
export const runtime = "nodejs";
// What a shop sells: kept off the entry DTO, which installed apps parse strictly.
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await optionalMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    const query = directoryQuerySchema.parse(
      directoryQuerySchema
        .pick({ sourceVillageId: true })
        .parse(Object.fromEntries(new URL(request.url).searchParams)),
    );
    return ok(
      directoryShopProductsSchema.parse(
        await directoryShopProducts(user, query, id),
      ),
    );
  });
}
