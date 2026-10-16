import { villageSearchSchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { searchMobileVillages } from "@/server/repositories/mobile";
import { ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    await requireMobile(request);
    const query = villageSearchSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return ok(await searchMobileVillages(query));
  });
}
