import { objectId } from "@/schemas";
import { villageDependencies } from "@/server/services/villages";
import { endpoint, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async () =>
    ok(await villageDependencies(objectId.parse((await context.params).id))),
  );
}
