import { listingIdSchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { deleteUnusedListingPhoto } from "@/server/services/listing-photo-storage";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";

export const runtime = "nodejs";
export async function DELETE(
  request: Request,
  context: { params: Promise<{ imageId: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const { imageId } = await context.params;
    return ok(
      await deleteUnusedListingPhoto(
        String(user._id),
        listingIdSchema.parse(imageId),
      ),
    );
  });
}
