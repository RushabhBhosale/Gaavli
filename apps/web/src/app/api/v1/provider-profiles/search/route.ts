import {
  providerSearchQuerySchema,
  providerSearchResultSchema,
} from "@gaavli/validation";
import { searchProfiles } from "@/server/services/provider-profiles";
import { requireMobile } from "@/server/services/mobile-auth";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    await requireMobile(request);
    const input = providerSearchQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return ok(providerSearchResultSchema.parse(await searchProfiles(input)));
  });
}
