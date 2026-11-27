import { adminProductCreateSchema, adminProductsQuerySchema } from "@/schemas";
import {
  createAdminProduct,
  listAdminProducts,
} from "@/server/services/product-catalogue-admin";
import { endpoint, jsonBody, ok } from "@/server/utils/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return endpoint(request, async () =>
    ok(
      await listAdminProducts(
        adminProductsQuerySchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    ),
  );
}

export async function POST(request: Request) {
  return endpoint(request, async (admin) =>
    ok(
      await createAdminProduct(
        admin.id,
        adminProductCreateSchema.parse(await jsonBody(request)),
      ),
      201,
    ),
  );
}
