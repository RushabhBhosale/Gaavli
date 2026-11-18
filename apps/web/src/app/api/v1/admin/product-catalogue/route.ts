import { adminProductsQuerySchema } from "@/schemas";
import { listAdminProducts } from "@/server/services/product-catalogue-admin";
import { endpoint, ok } from "@/server/utils/http";

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
