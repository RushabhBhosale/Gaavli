import "server-only";
import { indianMobileSchema } from "@gaavli/validation";
import type { UserRecord } from "../models";
import { watiProvider } from "../providers/wati";
import { limitRequests } from "../repositories/mobile";
import { AppError } from "../utils/errors";

function testDestination(user: UserRecord) {
  const recipient = indianMobileSchema.safeParse(
    process.env.WATI_TEST_RECIPIENT,
  );
  const mobile = indianMobileSchema.safeParse(user.mobile);
  if (
    user.mobileVerified &&
    recipient.success &&
    mobile.success &&
    recipient.data === mobile.data
  )
    return mobile.data;
}

export function whatsAppTestStatus(user: UserRecord) {
  return { available: !!testDestination(user) && !!watiProvider() };
}

export async function sendWhatsAppTest(user: UserRecord) {
  const destination = testDestination(user);
  const provider = watiProvider();
  if (!destination || !provider)
    throw new AppError(
      404,
      "WATI_TEST_UNAVAILABLE",
      "WhatsApp testing is unavailable for this account.",
    );
  await limitRequests("wati-test", destination, 5, 3600_000);
  await provider.sendTestTemplate(`91${destination}`);
  return { status: "accepted" as const };
}
