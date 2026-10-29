import { directoryQuerySchema, directoryPageSchema } from "@gaavli/validation";
import { optionalMobile } from "@/server/services/mobile-auth";
import { listDirectory } from "@/server/services/directory";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await optionalMobile(request);
    const query = directoryQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return ok(directoryPageSchema.parse(await listDirectory(user, query)));
  });
}
