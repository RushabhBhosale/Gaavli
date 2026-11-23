import { providerTypeOptionSchema } from "@/schemas";
import { listProviderTypeOptions, createProviderTypeOption } from "@/server/services/provider-types";
import { endpoint, jsonBody, ok } from "@/server/utils/http";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return endpoint(request, async () =>
    ok(
      await listProviderTypeOptions(
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    ),
  );
}
export async function POST(request: Request) {
  return endpoint(request, async (admin) =>
    ok(
      await createProviderTypeOption(
        admin.id,
        providerTypeOptionSchema.parse(await jsonBody(request)),
      ),
      201,
    ),
  );
}
