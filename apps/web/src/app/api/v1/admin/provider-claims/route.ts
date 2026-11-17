import {
  adminClaimsQuerySchema,
  listClaimsForAdmin,
} from "@/server/services/provider-admin";
import { endpoint, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return endpoint(request, async () =>
    ok(
      await listClaimsForAdmin(
        adminClaimsQuerySchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    ),
  );
}
