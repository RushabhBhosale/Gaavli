import { objectId, editVillageSchema, deleteVillageSchema } from "@/schemas";
import { saveVillage, deleteVillage } from "@/server/services/villages";
import { endpoint, jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (admin) =>
    ok(
      await saveVillage(
        admin.id,
        editVillageSchema.parse(await jsonBody(request)),
        objectId.parse((await context.params).id),
      ),
    ),
  );
}
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (admin) => {
    const input = deleteVillageSchema.parse(await jsonBody(request));
    return ok(
      await deleteVillage(
        admin.id,
        objectId.parse((await context.params).id),
        input.version,
      ),
    );
  });
}
