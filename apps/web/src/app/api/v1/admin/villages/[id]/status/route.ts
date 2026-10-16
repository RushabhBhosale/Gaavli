import { objectId, villageStatusSchema } from "@/schemas";
import { setVillageStatus } from "@/server/services/villages";
import { endpoint, jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (admin) => {
    const input = villageStatusSchema.parse(await jsonBody(request));
    return ok(
      await setVillageStatus(
        admin.id,
        objectId.parse((await context.params).id),
        input.status,
        input.version,
      ),
    );
  });
}
