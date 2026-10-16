import { objectId, editUserSchema } from "@/schemas";
import { saveUser } from "@/server/services/users";
import { endpoint, jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (admin) =>
    ok(
      await saveUser(
        admin.id,
        editUserSchema.parse(await jsonBody(request)),
        objectId.parse((await context.params).id),
      ),
    ),
  );
}
