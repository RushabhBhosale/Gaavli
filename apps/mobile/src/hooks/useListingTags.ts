import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_LISTING_TAG_DEFINITIONS,
  type ListingTagDefinition,
} from "@gaavli/constants";
import { listingTagCatalogueSchema } from "@gaavli/validation";
import { api } from "../api";

// The tags admins currently offer, in order. Until the list has downloaded
// (or when offline with nothing saved) the built-in tags stand in, so the
// listing form and product pages always work.
export function useListingTags(): readonly ListingTagDefinition[] {
  const query = useQuery({
    queryKey: ["listing-tags"],
    queryFn: ({ signal }) =>
      api("/listing-tags", listingTagCatalogueSchema, { signal }),
    staleTime: 60 * 60 * 1000,
  });
  return query.data?.tags ?? DEFAULT_LISTING_TAG_DEFINITIONS;
}
