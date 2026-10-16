import type { MobileLanguage } from "@gaavli/types";
import type { HomeListing } from "../../types/home";
import { formatMessage, messages } from "../../i18n";
export function listingUnit(unit: string | null, language: MobileLanguage) {
  const t = messages(language);
  const labels: Record<string, string> = {
    kg: t.unitKg,
    litre: t.unitLitre,
    dozen: t.unitDozen,
    bunch: t.unitBunch,
    pieces: t.unitPieces,
  };
  return unit ? labels[unit] || unit : "";
}
export function listingRate(listing: HomeListing, language: MobileLanguage) {
  const t = messages(language);
  const unit = listingUnit(listing.unit, language);
  return listing.price === null
    ? t.rateNotProvided
    : `₹${listing.price}${unit ? ` / ${unit}` : ""}`;
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
