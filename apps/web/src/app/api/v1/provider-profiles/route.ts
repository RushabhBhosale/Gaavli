import {
  createProviderProfileSchema,
  providerCreatedSchema,
  providerProfilesResponseSchema,
} from "@gaavli/validation";
import {
  createProviderProfile,
  listMyProfiles,
} from "@/server/services/provider-profiles";
import { requireMobile } from "@/server/services/mobile-auth";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    return ok(providerProfilesResponseSchema.parse(await listMyProfiles(user)));
  });
}
export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const input = createProviderProfileSchema.parse(await jsonBody(request));
    return ok(
      providerCreatedSchema.parse(await createProviderProfile(user, input)),
      201,
    );
  });
}
