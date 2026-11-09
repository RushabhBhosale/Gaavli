// Five slots with the mic always in the middle. Guests get the market, Gram
// Seva and Transport. A buyer gets the market, their requests and Settings.
// Sellers and coordinators get their own work first and a "More" button for
// everything else (market, Gram Seva, Transport, Settings).
export function tabSlots(account: {
  signedIn: boolean;
  seller: boolean;
  coordinator: boolean;
}): { second: string; fourth: string; fifth: string; more: string[] } {
  const rest = ["marketplace", "services", "transport", "profile"];
  if (!account.signedIn)
    return {
      second: "marketplace",
      fourth: "services",
      fifth: "transport",
      more: [],
    };
  if (account.coordinator)
    return {
      second: "manage",
      fourth: "activity",
      fifth: "more",
      more: rest,
    };
  if (account.seller)
    return {
      second: "my-listings",
      fourth: "activity",
      fifth: "more",
      more: rest,
    };
  return {
    second: "marketplace",
    fourth: "activity",
    fifth: "profile",
    more: [],
  };
}
