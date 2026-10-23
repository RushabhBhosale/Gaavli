import type { MobileLanguage, RegistrationDraft } from "@gaavli/types";
import { loginSchema, registrationSchema } from "@gaavli/validation";

export function parseOtpRequest(
  mode: "login" | "register",
  draft: RegistrationDraft,
  language: MobileLanguage,
) {
  if (mode === "register")
    return registrationSchema.safeParse({
      firstName: draft.firstName,
      lastName: draft.lastName,
      mobile: draft.mobile,
      language,
    });
  return loginSchema.safeParse({ mobile: draft.mobile, language });
}
