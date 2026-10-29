import type { MobileLanguage } from "@gaavli/types";
import type { HomeListing } from "../../types/home";
import { formatMessage, messages } from "../../i18n";
export function listingCountLabel(count: number, language: MobileLanguage) {
  const t = messages(language);
  return formatMessage(count === 1 ? t.listingCountOne : t.listingsCount, {
    count: new Intl.NumberFormat(
      language === "mr" ? "mr-IN-u-nu-deva" : "en-IN",
    ).format(count),
  });
}
export function listingUnit(unit: string | null, language: MobileLanguage) {
  const t = messages(language);
  const labels: Record<string, string> = {
    kg: t.unitKg,
    litre: t.unitLitre,
    dozen: t.unitDozen,
    bunch: t.unitBunch,
    pieces: t.unitPieces,
  };
  const value = unit?.trim();
  return value ? labels[value.toLowerCase()] || value : "";
}
export function listingRate(listing: HomeListing, language: MobileLanguage) {
  const t = messages(language);
  const unit = listingUnit(listing.unit, language);
  return listing.price === null
    ? t.rateNotProvided
    : `₹${listing.price}${unit ? ` / ${unit}` : ""}`;
}
export function listingPosted(
  listing: Pick<HomeListing, "postedMinutesAgo">,
  language: MobileLanguage,
) {
  const t = messages(language);
  const minutes = listing.postedMinutesAgo;
  const count = new Intl.NumberFormat(
    language === "mr" ? "mr-IN" : "en-IN",
  ).format(
    minutes < 60 ? minutes : Math.floor(minutes / (minutes < 1440 ? 60 : 1440)),
  );
  return formatMessage(
    minutes < 60 ? t.minutesAgo : minutes < 1440 ? t.hoursAgo : t.daysAgo,
    { count },
  );
}
export function listingQuantity(
  listing: HomeListing,
  language: MobileLanguage,
) {
  const t = messages(language);
  return listing.availableQuantity === null
    ? t.quantityNotProvided
    : formatMessage(t.quantityAvailable, {
        quantity: listing.availableQuantity,
        unit: listingUnit(listing.unit, language),
      });
}
