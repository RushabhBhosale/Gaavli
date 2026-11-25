import { z } from "zod";
import { mobileVillageSchema } from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import {
  addUserMappedVillage,
  listUserMappedVillages,
} from "@/server/services/user-village-mappings";
import { jsonBody, ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";
export const runtime = "nodejs";
const output = z.object({ villages: z.array(mobileVillageSchema) });
const input = z
  .object({ targetVillageId: z.string().regex(/^[a-f0-9]{24}$/i) })
  .strict();
// Villages the signed-in user added for themselves; other users are unaffected.
export async function GET(request: Request) {
  return mobileEndpoint(request, async () =>
    ok(
      output.parse(await listUserMappedVillages(await requireMobile(request))),
    ),
  );
}
export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const body = input.parse(await jsonBody(request));
    return ok(
      output.parse(
        await addUserMappedVillage(user, body.targetVillageId.toLowerCase()),
      ),
    );
  });
}
