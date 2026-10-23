import { selectVillageSchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { mobileUserDto, saveMobileVillage } from "@/server/repositories/mobile";
import { jsonBody, ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () =>
    ok(await mobileUserDto(await requireMobile(request))),
  );
}
export async function PATCH(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const input = selectVillageSchema.parse(await jsonBody(request));
    return ok(await saveMobileVillage(String(user._id), input));
  });
}
