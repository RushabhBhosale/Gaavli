import { villageSearchSchema } from "@gaavli/validation";
import { optionalMobile } from "@/server/services/mobile-auth";
import { searchMobileVillages } from "@/server/repositories/mobile";
import { ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    await optionalMobile(request);
    const query = villageSearchSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const response = ok(await searchMobileVillages(query));
    // The plain list is public and rarely changes; let the CDN and device
    // serve it. Location-sorted results are per-user, so stay uncached.
    if (query.latitude === undefined && query.longitude === undefined)
      response.headers.set(
        "Cache-Control",
        "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      );
    return response;
  });
}
