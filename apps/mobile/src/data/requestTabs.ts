export type RequestTab = "sent" | "received" | "notifications";

export function requestTabs(isSeller: boolean): RequestTab[] {
  return isSeller
    ? ["sent", "received", "notifications"]
    : ["sent", "notifications"];
}

export function availableRequestTab(
  isSeller: boolean,
  tab: RequestTab,
): RequestTab {
  return requestTabs(isSeller).includes(tab) ? tab : "sent";
}
