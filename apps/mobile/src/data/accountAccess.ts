import type { MobileUser } from "@gaavli/types";

// Older cached sessions only contain assignments; new responses distinguish
// an admin-granted role from the village scope needed for protected operations.
export function hasCoordinatorRole(account: MobileUser | null | undefined) {
  return account?.isCoordinator ?? !!account?.coordinatorVillages?.length;
}
