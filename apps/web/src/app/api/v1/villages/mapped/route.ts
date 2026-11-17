import { z } from "zod";
import { mobileVillageSchema } from "@gaavli/validation";
import { optionalMobile } from "@/server/services/mobile-auth";
import { mappedVillages } from "@/server/repositories/mobile";
import { ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";
export const runtime = "nodejs";
const querySchema = z
  .object({
    villageId: z
      .string()
      .regex(/^[a-f0-9]{24}$/i)
      .toLowerCase(),
  })
  .strict();
// The villages mapped with one village: people there see each other's listings.
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    await optionalMobile(request);
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return ok({
      villages: z
        .array(mobileVillageSchema)
        .parse(await mappedVillages(query.villageId)),
    });
  });
}
