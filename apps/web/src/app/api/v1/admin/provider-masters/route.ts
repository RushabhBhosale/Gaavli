import {
  providerMasterCreateSchema,
  providerMasterQuerySchema,
} from "@gaavli/validation";
import {
  createProviderMaster,
  listProviderMasters,
} from "@/server/services/provider-masters";
import { endpoint, jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return endpoint(request, async () =>
    ok(
      await listProviderMasters(
        providerMasterQuerySchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    ),
  );
}
export async function POST(request: Request) {
  return endpoint(request, async (admin) =>
    ok(
      await createProviderMaster(
        admin.id,
        providerMasterCreateSchema.parse(await jsonBody(request)),
      ),
      201,
    ),
  );
}
