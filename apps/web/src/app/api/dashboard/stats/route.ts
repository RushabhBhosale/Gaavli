import { dashboardStats } from "@/server/services/dashboard";
import { endpoint, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return endpoint(request, async () => ok(await dashboardStats()));
}
