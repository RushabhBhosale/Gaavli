import {
  productMasterQuerySchema,
  productMasterPageSchema,
} from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { listMasterProducts } from "@/server/services/product-master";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    await requireMobile(request);
    const query = productMasterQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return ok(
      productMasterPageSchema.parse(await listMasterProducts(query.search)),
    );
  });
}
