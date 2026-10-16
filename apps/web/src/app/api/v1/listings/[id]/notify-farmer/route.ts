import {
  listingIdSchema,
  listingOperationKeySchema,
  notifySellerInputSchema,
} from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { notifyListingSeller } from "@/server/services/notifications";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    const key = listingOperationKeySchema.parse(
      request.headers.get("idempotency-key"),
    );
    const input = notifySellerInputSchema.parse(await jsonBody(request));
    const result = await notifyListingSeller(String(user._id), id, key, input);
    return ok(result.data, result.status);
  });
}
