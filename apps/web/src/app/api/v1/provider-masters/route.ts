import { providerMasterGroupSchema } from "@gaavli/validation";
import { activeProviderMasters } from "@/server/services/provider-masters";
import { safe, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return safe(async () =>
    ok(
      await activeProviderMasters(
        providerMasterGroupSchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    ),
  );
}
