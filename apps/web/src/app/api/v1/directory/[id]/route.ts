import {
  directoryQuerySchema,
  directoryEntrySchema,
  listingIdSchema,
} from "@gaavli/validation";
import { optionalMobile } from "@/server/services/mobile-auth";
import { listDirectory } from "@/server/services/directory";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await optionalMobile(request);
    const id = listingIdSchema.parse((await context.params).id);
    const query = directoryQuerySchema
      .pick({ sourceVillageId: true })
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    return ok(
      directoryEntrySchema.parse(
        await listDirectory(user, directoryQuerySchema.parse(query), id),
      ),
    );
  });
}
