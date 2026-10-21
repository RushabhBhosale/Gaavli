import {
  listingIdSchema,
  listingOperationKeySchema,
  listingReportInputSchema,
} from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { reportListing } from "@/server/services/listing-reports";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const actor = await requireMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    const key = listingOperationKeySchema.parse(
      request.headers.get("idempotency-key"),
    );
    const { reason } = listingReportInputSchema.parse(await jsonBody(request));
    const result = await reportListing(String(actor._id), id, key, reason);
    return ok(result.data, result.status);
  });
}
