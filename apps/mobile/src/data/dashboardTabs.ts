import type { MobileUser } from "@gaavli/types";
import { hasCoordinatorRole } from "./accountAccess";

export type DashboardTab = "coordinator" | "buyer" | "seller";

export function availableDashboardTab(
  account: MobileUser | null | undefined,
  selected: DashboardTab | null,
): DashboardTab {
  const tabs = dashboardTabs(account);
  return selected && tabs.includes(selected) ? selected : tabs[0];
}

export function dashboardTabs(
  account: MobileUser | null | undefined,
): DashboardTab[] {
  return [
    ...(hasCoordinatorRole(account) ? ["coordinator" as const] : []),
    "buyer",
    ...(account?.isSeller ? ["seller" as const] : []),
  ];
}

export function homeDashboardTab(
  account: MobileUser | null | undefined,
  requested: string | string[] | undefined,
): "coordinator" | "buyer" {
  return hasCoordinatorRole(account) && requested !== "buyer"
    ? "coordinator"
    : "buyer";
}

// Five slots with the mic always in the middle. The second and fourth slots
// follow the account: guests get the market and Gram Seva; once signed in,
// sellers get their products and everyone gets their requests.
export function tabSlots(account: {
  signedIn: boolean;
  seller: boolean;
  coordinator: boolean;
}): [string, string] {
  if (!account.signedIn) return ["marketplace", "services"];
  if (account.coordinator) return ["manage", "activity"];
  if (account.seller) return ["my-listings", "activity"];
  return ["marketplace", "activity"];
}
