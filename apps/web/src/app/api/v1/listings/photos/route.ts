import {
  listingOperationKeySchema,
  uploadedListingPhotoSchema,
} from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import {
  uploadListingPhoto,
  MAX_PHOTO_BYTES,
} from "@/server/services/photo-upload";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { AppError } from "@/server/utils/errors";
import { ok } from "@/server/utils/http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const operation = listingOperationKeySchema.parse(
      request.headers.get("idempotency-key"),
    );
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.startsWith("multipart/form-data;"))
      throw new AppError(400, "PHOTO_INVALID", "Send a photo form.");
    const limit = MAX_PHOTO_BYTES + 65536;
    if (Number(request.headers.get("content-length")) > limit)
      throw new AppError(413, "PHOTO_TOO_LARGE", "Photo too large.");
    const reader = request.body?.getReader();
    if (!reader) throw new AppError(400, "PHOTO_INVALID", "Photo required.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          await reader.cancel();
          throw new AppError(413, "PHOTO_TOO_LARGE", "Photo too large.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let form: FormData;
    try {
      form = await new Response(new Uint8Array(Buffer.concat(chunks)), {
        headers: { "Content-Type": contentType },
      }).formData();
    } catch {
      throw new AppError(400, "PHOTO_INVALID", "Invalid photo form.");
    }
    const photo = form.get("photo");
    if (!(photo instanceof Blob) || [...form.keys()].length !== 1)
      throw new AppError(422, "PHOTO_INVALID", "Send one photo only.");
    return ok(
      uploadedListingPhotoSchema.parse(
        await uploadListingPhoto(String(user._id), operation, photo),
      ),
      201,
    );
  });
}
