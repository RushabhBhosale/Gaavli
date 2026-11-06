import {
  providerMasterIdSchema,
  providerMasterUpdateSchema,
} from "@gaavli/validation";
import { updateProviderMaster } from "@/server/services/provider-masters";
import { endpoint, jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (admin) =>
    ok(
      await updateProviderMaster(
        admin.id,
        providerMasterIdSchema.parse((await context.params).id),
        providerMasterUpdateSchema.parse(await jsonBody(request)),
      ),
    ),
  );
}
