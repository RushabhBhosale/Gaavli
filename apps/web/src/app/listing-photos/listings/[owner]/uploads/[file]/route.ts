import { readLocalListingPhoto } from "@/server/providers/local-listing-photos";
import { safe } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ owner: string; file: string }> },
) {
  return safe(async () => {
    const { owner, file } = await context.params;
    const bytes = await readLocalListingPhoto(
      `listings/${owner}/uploads/${file}`,
    );
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  });
}
