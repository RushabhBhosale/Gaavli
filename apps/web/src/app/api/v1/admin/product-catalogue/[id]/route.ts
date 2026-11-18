import {
  adminProductStatusSchema,
  adminProductUpdateSchema,
  objectId,
} from "@/schemas";
import {
  setAdminProductStatus,
  updateAdminProduct,
} from "@/server/services/product-catalogue-admin";
import { endpoint, jsonBody, ok } from "@/server/utils/http";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (admin) =>
    ok(
      await updateAdminProduct(
        admin.id,
        objectId.parse((await context.params).id),
        adminProductUpdateSchema.parse(await jsonBody(request)),
      ),
    ),
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (admin) =>
    ok(
      await setAdminProductStatus(
        admin.id,
        objectId.parse((await context.params).id),
        adminProductStatusSchema.parse(await jsonBody(request)).status,
      ),
    ),
  );
}
