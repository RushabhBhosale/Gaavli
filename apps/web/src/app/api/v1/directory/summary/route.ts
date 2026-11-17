import {
  directorySummaryQuerySchema,
  directorySummarySchema,
} from "@gaavli/validation";
import { optionalMobile } from "@/server/services/mobile-auth";
import { directoryCategoryCounts } from "@/server/services/directory";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await optionalMobile(request);
    const query = directorySummaryQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return ok(
      directorySummarySchema.parse(await directoryCategoryCounts(user, query)),
    );
  });
}
