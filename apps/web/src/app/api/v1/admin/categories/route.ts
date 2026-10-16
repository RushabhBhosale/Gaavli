import { categoriesQuerySchema, categorySchema } from "@/schemas";
import { listCategories, createCategory } from "@/server/services/categories";
import { endpoint, ok, jsonBody } from "@/server/utils/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return endpoint(request, async () =>
    ok(
      await listCategories(
        categoriesQuerySchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    ),
  );
}
export async function POST(request: Request) {
  return endpoint(request, async (admin) =>
    ok(
      await createCategory(
        admin.id,
        categorySchema.parse(await jsonBody(request)),
      ),
      201,
    ),
  );
}
