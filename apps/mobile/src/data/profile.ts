import type { MobileProfile } from "@gaavli/types";
import { updateMobileProfileSchema } from "@gaavli/validation";

export function editableProfileDraft(profile: MobileProfile) {
  return {
    address: profile.address || "",
    alternativeMobile: profile.alternativeMobile || "",
    occupation: profile.occupation || "",
    version: profile.version,
  };
}
export type ProfileDraft = ReturnType<typeof editableProfileDraft>;
export function profileSaveBody(draft: ProfileDraft) {
  // Explicit allowlist: registered names, primary mobile and photo use no Save input.
  return updateMobileProfileSchema.safeParse({
    address: draft.address,
    alternativeMobile: draft.alternativeMobile.trim(),
    occupation: draft.occupation,
    version: draft.version,
  });
}
