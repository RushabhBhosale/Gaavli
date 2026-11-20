// Five slots with the mic always in the middle. Guests get the market, Gram
// Seva and Settings. A buyer gets Requests, Profile and More.
// Sellers and coordinators get their own work first and a "More" button for
// everything else (market, Gram Seva, Settings). Transport lives inside
// Services, so it has no tab of its own.
export function tabSlots(account: {
  signedIn: boolean;
  seller: boolean;
  coordinator: boolean;
}): { second: string; fourth: string; fifth: string; more: string[] } {
  const rest = ["marketplace", "services", "profile"];
  if (!account.signedIn)
    return {
      second: "marketplace",
      fourth: "services",
      fifth: "profile",
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
  // A new buyer: Home, Requests, the mic, Profile and More (market, services,
  // Settings tab). Selling or coordinating changes the bar, as above.
  return {
    second: "activity",
    fourth: "profile",
    fifth: "more",
    more: ["marketplace", "services"],
  };
}
