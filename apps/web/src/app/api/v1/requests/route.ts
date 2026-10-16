import { requestsQuerySchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { getActivityRequests } from "@/server/services/requests";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const query = requestsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return ok(await getActivityRequests(String(user._id), query));
  });
}
