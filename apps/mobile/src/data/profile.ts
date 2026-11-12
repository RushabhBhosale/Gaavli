import type { MobileProfile } from "@gaavli/types";
import { updateMobileProfileSchema } from "@gaavli/validation";
import { legacyNameParts } from "./names";

export function editableProfileDraft(
  profile: MobileProfile,
  displayName?: string | null,
) {
  // An older account may have only a display name; show it split in two.
  const legacy = profile.firstName
    ? null
    : legacyNameParts(displayName, profile.mobile);
  return {
    firstName: profile.firstName || legacy?.firstName || "",
    lastName: profile.lastName || legacy?.lastName || "",
    email: profile.email || "",
    address: profile.address || "",
    alternativeMobile: profile.alternativeMobile || "",
    occupation: profile.occupation || "",
    version: profile.version,
  };
}
export type ProfileDraft = ReturnType<typeof editableProfileDraft>;

// True when anything on the form differs from what is saved.
export function profileChanged(
  draft: ProfileDraft,
  saved: MobileProfile,
  displayName?: string | null,
) {
  const base = editableProfileDraft(saved, displayName);
  return (
    draft.firstName.trim() !== base.firstName ||
    draft.lastName.trim() !== base.lastName ||
    draft.email.trim() !== base.email ||
    draft.address.trim() !== base.address ||
    draft.alternativeMobile.trim() !== base.alternativeMobile ||
    draft.occupation.trim() !== base.occupation
  );
}
export function profileSaveBody(draft: ProfileDraft, saved?: MobileProfile) {
  const base = saved ? editableProfileDraft(saved) : null;
  // Names are sent when they changed, or when the account never stored them.
  const nameChanged =
    !!base &&
    (draft.firstName.trim() !== base.firstName ||
      draft.lastName.trim() !== base.lastName);
  // Explicit allowlist: the primary mobile and photo use no Save input. Only
  // changed name/email fields are sent, so an older server still accepts Save.
  return updateMobileProfileSchema.safeParse({
    ...(nameChanged
      ? { firstName: draft.firstName.trim(), lastName: draft.lastName.trim() }
      : {}),
    ...(base && draft.email.trim() !== base.email
      ? { email: draft.email.trim() }
      : {}),
    address: draft.address,
    alternativeMobile: draft.alternativeMobile.trim(),
    occupation: draft.occupation,
    version: draft.version,
  });
}
