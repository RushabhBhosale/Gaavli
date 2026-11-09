import {
  adminClaimActionSchema,
  adminIdSchema,
  resolveClaim,
} from "@/server/services/provider-admin";
import { endpoint, jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (admin) =>
    ok(
      await resolveClaim(
        admin.id,
        adminIdSchema.parse((await context.params).id),
        adminClaimActionSchema.parse(await jsonBody(request)).action,
      ),
    ),
  );
}
