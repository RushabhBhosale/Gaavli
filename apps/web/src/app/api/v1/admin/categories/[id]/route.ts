import {
  deleteCategorySchema,
  editCategorySchema,
  objectId,
} from "@/schemas";
import { deleteCategory, updateCategory } from "@/server/services/categories";
import { endpoint, jsonBody, ok } from "@/server/utils/http";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (admin) =>
    ok(
      await updateCategory(
        admin.id,
        objectId.parse((await context.params).id),
        editCategorySchema.parse(await jsonBody(request)),
      ),
    ),
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (admin) => {
    const input = deleteCategorySchema.parse(await jsonBody(request));
    return ok(
      await deleteCategory(
        admin.id,
        objectId.parse((await context.params).id),
        input.version,
      ),
    );
  });
}
