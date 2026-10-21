import { endpoint, ok } from "@/server/utils/http";
import {
  adminReportsQuerySchema,
  listReportsForAdmin,
} from "@/server/services/coordinator-reports";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return endpoint(request, async () =>
    ok(
      await listReportsForAdmin(
        adminReportsQuerySchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    ),
  );
}
