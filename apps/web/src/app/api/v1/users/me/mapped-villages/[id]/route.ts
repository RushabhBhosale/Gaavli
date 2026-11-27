import { z } from "zod";
import { mobileVillageSchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import { removeUserMappedVillage } from "@/server/services/user-village-mappings";
import { ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";
export const runtime = "nodejs";
const output = z.object({ villages: z.array(mobileVillageSchema) });
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const { id } = await context.params;
    const target = z
      .string()
      .regex(/^[a-f0-9]{24}$/i)
      .parse(id)
      .toLowerCase();
    return ok(output.parse(await removeUserMappedVillage(user, target)));
  });
}
