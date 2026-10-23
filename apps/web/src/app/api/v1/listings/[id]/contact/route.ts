import { listingIdSchema, sellerDetailsSchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { revealListingContact } from "@/server/services/listing-contact";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    return ok(
      sellerDetailsSchema.parse(
        await revealListingContact(String(user._id), id, "view"),
      ),
    );
  });
}
