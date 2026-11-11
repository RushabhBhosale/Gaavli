import type { MobileUser } from "@gaavli/types";
import { mobileUserSchema } from "@gaavli/validation";
import { authenticatedApi, saveSession } from "../session";
import { saveAccountContacts } from "../providerProfiles";
import { useAppStore, type RegistrationExtras } from "../store";
import { activeContacts, contactsPayload } from "./contactNumbers";

// Right after the OTP is verified: put the chosen village on the account and
// save the numbers, email and promo choice from the registration screen.
// Failures here never block signing in; the details can be edited later.
export async function finishRegistration(
  user: MobileUser,
  extras: RegistrationExtras,
): Promise<MobileUser> {
  let next = user;
  if (extras.village && user.village?.id !== extras.village.id) {
    try {
      next = await authenticatedApi("/users/me", mobileUserSchema, {
        method: "PATCH",
        body: JSON.stringify({ villageId: extras.village.id }),
      });
      const current = useAppStore.getState().session;
      if (current?.user.id === next.id)
        await saveSession({ ...current, user: next });
    } catch {
      /* The village screen stays available when this cannot be confirmed. */
    }
  }
  try {
    await saveAccountContacts({
      contacts: contactsPayload(activeContacts(extras.contacts)),
      email: extras.email.trim() || null,
      promoWhatsapp: extras.promoWhatsapp,
    });
  } catch {
    /* Numbers can be added again from Settings. */
  }
  return next;
}
export function splitFullName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}
