import { districtIdQuery } from "@/lib/geography-query";
import { listMasterTalukas } from "@/server/repositories/geography";
import { endpoint, ok } from "@/server/utils/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return endpoint(request, async () =>
    ok(await listMasterTalukas(districtIdQuery(request.url))),
  );
}
