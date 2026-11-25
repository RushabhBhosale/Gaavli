import { z } from "zod";
import { LISTING_TAG_ID_PATTERN } from "@gaavli/constants";
import { adminListingTagUpdateSchema } from "@/schemas";
import { updateListingTag } from "@/server/services/listing-tags";
import { endpoint, jsonBody, ok } from "@/server/utils/http";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (admin) =>
    ok(
      await updateListingTag(
        admin.id,
        z.string().regex(LISTING_TAG_ID_PATTERN).parse((await context.params).id),
        adminListingTagUpdateSchema.parse(await jsonBody(request)),
      ),
    ),
  );
}
