import { villages } from "@/server/services/users";
import { endpoint, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return endpoint(request, async () => ok(await villages()));
}
