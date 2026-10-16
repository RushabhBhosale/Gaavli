import { villagesQuerySchema, createVillageSchema } from "@/schemas";
import { listVillages, saveVillage } from "@/server/services/villages";
import { endpoint, ok, jsonBody } from "@/server/utils/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return endpoint(request, async () => {
    const query = villagesQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return ok(await listVillages(query));
  });
}
export async function POST(request: Request) {
  return endpoint(request, async (admin) =>
    ok(
      await saveVillage(
        admin.id,
        createVillageSchema.parse(await jsonBody(request)),
      ),
      201,
    ),
  );
}
