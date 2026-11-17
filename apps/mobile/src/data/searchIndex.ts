import type { MobileLanguage, MobileListing } from "@gaavli/types";
import { matchesProductSearch } from "./productMaster";

// The village's products, kept on the phone so typing in the search box needs
// no network round trip. Names in every language are searched, so "tom",
// "टोमॅटो" and a close misspelling all find the tomato.
export function searchIndexMatches(
  listings: readonly MobileListing[],
  text: string,
  language: MobileLanguage,
  limit = 8,
) {
  const term = text.normalize("NFKC").toLocaleLowerCase().trim();
  if (!term) return [];
  const rank = (listing: MobileListing) => {
    const shown = (
      language === "en"
        ? [listing.productName]
        : language === "hi"
          ? [listing.productNameHi, listing.productNameMr, listing.productName]
          : [listing.productNameMr, listing.productName]
    )
      .filter((name): name is string => !!name)
      .map((name) => name.normalize("NFKC").toLocaleLowerCase());
    // Names that start with the typed letters come first, then names that
    // contain them, then close misspellings.
    if (shown.some((name) => name.startsWith(term))) return 0;
    if (shown.some((name) => name.includes(term))) return 1;
    return 2;
  };
  return listings
    .filter((listing) =>
      matchesProductSearch(
        [listing.productName, listing.productNameMr, listing.productNameHi]
          .filter(Boolean)
          .join(" "),
        term,
      ),
    )
    .map((listing, index) => ({ listing, index, rank: rank(listing) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.listing);
}
