import { z } from "zod";
import { requireMobile } from "@/server/services/mobile-auth";
import {
  sendWhatsAppTest,
  whatsAppTestStatus,
} from "@/server/services/whatsapp-test";
import { jsonBody, ok } from "@/server/utils/http";
import { mobileEndpoint } from "@/server/utils/mobile-http";

export const runtime = "nodejs";
const testInput = z.object({}).strict();

export async function GET(request: Request) {
  return mobileEndpoint(request, async () =>
    ok(whatsAppTestStatus(await requireMobile(request))),
  );
}

export async function POST(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    testInput.parse(await jsonBody(request));
    return ok(await sendWhatsAppTest(user), 202);
  });
}
