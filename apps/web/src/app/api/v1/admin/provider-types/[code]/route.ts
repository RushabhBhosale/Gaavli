import { providerTypeOptionUpdateSchema } from "@/schemas";
import { updateProviderTypeOption } from "@/server/services/provider-types";
import { endpoint, jsonBody, ok } from "@/server/utils/http";

export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  return endpoint(request, async (admin) =>
    ok(
      await updateProviderTypeOption(
        admin.id,
        (await context.params).code,
        providerTypeOptionUpdateSchema.parse(await jsonBody(request)),
      ),
    ),
  );
}
