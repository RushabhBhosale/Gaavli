import { z } from "zod";
import {
  listingIdSchema,
  sellerContactStateSchema,
  sellerContactSchema,
} from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { revealListingContact } from "@/server/services/listing-contact";
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
    z.object({})
      .strict()
      .parse(await jsonBody(request));
    return ok(
      sellerContactSchema.parse(
        await revealListingContact(String(user._id), id),
      ),
    );
  });
}
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    return ok(
      sellerContactStateSchema.parse(
        await revealListingContact(String(user._id), id, true),
      ),
    );
  });
}
