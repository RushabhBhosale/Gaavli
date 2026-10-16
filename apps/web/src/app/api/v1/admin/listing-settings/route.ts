import { listingSettingsInputSchema } from "@gaavli/validation";
import {
  getListingSettings,
  setListingSettings,
} from "@/server/services/listing-settings";
import { endpoint, jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return endpoint(request, async () => ok(await getListingSettings()));
}
export async function PATCH(request: Request) {
  return endpoint(request, async (admin) =>
    ok(
      await setListingSettings(
        admin.id,
        listingSettingsInputSchema.parse(await jsonBody(request)),
      ),
    ),
  );
}
