import { talukaIdQuery } from "@/lib/geography-query";
import { listMasterVillages } from "@/server/repositories/geography";
import { endpoint, ok } from "@/server/utils/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return endpoint(request, async () =>
    ok(await listMasterVillages(talukaIdQuery(request.url))),
  );
}
