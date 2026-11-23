import { z } from "zod";
import { mobileVillageSchema } from "@gaavli/validation";
import { optionalMobile } from "@/server/services/mobile-auth";
import {
  mappedVillages,
  nearbyVillagesFor,
} from "@/server/repositories/mobile";
import { ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";
export const runtime = "nodejs";
const querySchema = z
  .object({
    villageId: z
      .string()
      .regex(/^[a-f0-9]{24}$/i)
      .toLowerCase(),
    radiusKm: z.coerce
      .number()
      .int()
      .refine((value) => [0, 10, 20, 50, 100].includes(value))
      .default(50),
  })
  .strict();
// The villages mapped with one village: people there see each other's listings.
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    await optionalMobile(request);
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const mapped = z
      .array(mobileVillageSchema)
      .parse(await mappedVillages(query.villageId));
    const nearby = z.array(mobileVillageSchema).parse(
      await nearbyVillagesFor(
        query.villageId,
        query.radiusKm,
        mapped.map((village) => village.id),
      ),
    );
    return ok({ villages: mapped, nearby });
  });
}
