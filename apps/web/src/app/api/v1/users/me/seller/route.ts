import { z } from "zod";
import { requireMobile } from "@/server/services/mobile-auth";
import { activateSeller } from "@/server/services/seller";
import { jsonBody, ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    z.object({})
      .strict()
      .parse(await jsonBody(request));
    return ok(await activateSeller(String(user._id)));
  });
}
