import {
  directoryQuerySchema,
  dashboardDirectorySchema,
} from "@gaavli/validation";
import { optionalMobile } from "@/server/services/mobile-auth";
import { dashboardDirectory } from "@/server/services/directory";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await optionalMobile(request);
    const query = directoryQuerySchema
      .pick({ sourceVillageId: true })
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(
      dashboardDirectorySchema.parse(
        await dashboardDirectory(user, directoryQuerySchema.parse(query)),
      ),
    );
  });
}
