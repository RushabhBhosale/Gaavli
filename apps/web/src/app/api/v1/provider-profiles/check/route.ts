import {
  providerDuplicateCheckSchema,
  providerDuplicateResultSchema,
} from "@gaavli/validation";
import { checkDuplicates } from "@/server/services/provider-profiles";
import { requireMobile } from "@/server/services/mobile-auth";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const input = providerDuplicateCheckSchema.parse(await jsonBody(request));
    return ok(
      providerDuplicateResultSchema.parse(await checkDuplicates(user, input)),
    );
  });
}
