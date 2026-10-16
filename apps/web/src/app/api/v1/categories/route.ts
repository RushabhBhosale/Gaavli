import { mobileCategoriesSchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { listMobileCategories } from "@/server/services/listing-mutations";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    await requireMobile(request);
    return ok(mobileCategoriesSchema.parse(await listMobileCategories()));
  });
}
