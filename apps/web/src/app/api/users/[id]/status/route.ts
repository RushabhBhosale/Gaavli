import { objectId, statusUpdateSchema } from "@/schemas";
import { changeStatus } from "@/server/services/users";
import { endpoint, jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (admin) =>
    ok(
      await changeStatus(
        admin.id,
        objectId.parse((await context.params).id),
        statusUpdateSchema.parse(await jsonBody(request)),
      ),
    ),
  );
}
