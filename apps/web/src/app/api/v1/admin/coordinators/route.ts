import { coordinatorOptions } from "@/server/services/villages";
import { endpoint, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return endpoint(request, async () => ok(await coordinatorOptions()));
}
