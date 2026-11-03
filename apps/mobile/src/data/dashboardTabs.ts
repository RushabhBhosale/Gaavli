import type { MobileUser } from "@gaavli/types";
import { hasCoordinatorRole } from "./accountAccess";

export type DashboardTab = "coordinator" | "buyer" | "seller";

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
