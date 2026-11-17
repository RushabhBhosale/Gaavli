import {
  productShopsQuerySchema,
  productShopsSchema,
} from "@gaavli/validation";
import { optionalMobile } from "@/server/services/mobile-auth";
import { productShops } from "@/server/services/directory";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";
export const runtime = "nodejs";
// Shops that sell the searched product. Guests get no contact numbers.
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await optionalMobile(request);
    const query = productShopsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return ok(productShopsSchema.parse(await productShops(user, query)));
  });
}
