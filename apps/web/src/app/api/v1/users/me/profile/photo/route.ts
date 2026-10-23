import { profilePhotoSchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { saveProfilePhoto } from "@/server/services/profile";
import { jsonBody, ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const input = profilePhotoSchema.parse(await jsonBody(request));
    return ok(
      await saveProfilePhoto(
        String(user._id),
        input.photoObjectKey,
        input.version,
      ),
    );
  });
}
