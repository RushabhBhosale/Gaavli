import {
  accountContactsOutputSchema,
  accountContactsSchema,
} from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import {
  getAccountContacts,
  saveAccountContacts,
} from "@/server/services/user-contacts";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    return ok(
      accountContactsOutputSchema.parse(await getAccountContacts(user)),
    );
  });
}
export async function PUT(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const input = accountContactsSchema.parse(await jsonBody(request));
    return ok(
      accountContactsOutputSchema.parse(await saveAccountContacts(user, input)),
    );
  });
}
