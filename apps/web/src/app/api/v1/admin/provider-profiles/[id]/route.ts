import {
  adminIdSchema,
  adminProfileStatusSchema,
  setProfileStatusForAdmin,
} from "@/server/services/provider-admin";
import { endpoint, jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (admin) =>
    ok(
      await setProfileStatusForAdmin(
        admin.id,
        adminIdSchema.parse((await context.params).id),
        adminProfileStatusSchema.parse(await jsonBody(request)).status,
      ),
    ),
  );
}
