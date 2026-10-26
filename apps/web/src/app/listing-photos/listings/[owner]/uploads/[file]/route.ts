import { listingPhotoStorage } from "@/server/services/listing-photo-storage";
import { listingPhotoUrl } from "@/server/providers/listing-photos";
import { AppError } from "@/server/utils/errors";
import { safe } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ owner: string; file: string }> },
) {
  return safe(async () => {
    const { owner, file } = await context.params;
    const key = `listings/${owner}/uploads/${file}`;
    let bytes: Buffer;
    try {
      bytes = await listingPhotoStorage.read(key);
    } catch (error) {
      const legacyUrl = listingPhotoUrl(key, true);
      if (
        error instanceof AppError &&
        error.code !== "PHOTO_REMOVED" &&
        legacyUrl?.startsWith("https://")
      )
        return Response.redirect(legacyUrl, 307);
      if (
        error instanceof AppError &&
        error.code === "PHOTO_STORAGE_UNAVAILABLE"
      )
        throw new AppError(404, "PHOTO_UNAVAILABLE", "Photo unavailable.");
      throw error;
    }
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  });
}
