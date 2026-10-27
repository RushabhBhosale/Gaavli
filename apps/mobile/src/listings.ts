import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  mobileListingPageSchema,
  mobileListingSchema,
  listingIdSchema,
  ownListingPageSchema,
} from "@gaavli/validation";
import { api } from "./api";
import { authenticatedApi } from "./session";
import { useAppStore } from "./store";
import { ApiError } from "./api/client";
import {
  browsingListingsQuery,
  browsingVillageFor,
} from "./storage/browsingVillage";

const retry = (count: number, error: unknown) =>
  count < 1 &&
  !(error instanceof ApiError && error.status && error.status < 500);
export function useOwnListings(
  status: "active" | "sold_out" | "all" | "low_stock" | "expired" = "active",
  enabled = true,
  search = "",
  sort: "newest" | "price_asc" | "price_desc" | "stock_asc" = "newest",
) {
  const session = useAppStore((state) => state.session);
  return useInfiniteQuery({
    queryKey: ["own-listings", session?.user.id, status, search, sort],
    enabled: !!session?.user.isSeller && enabled,
    refetchOnMount: "always",
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      authenticatedApi(
        `/listings/mine?status=${status}&page=${pageParam}&limit=20&search=${encodeURIComponent(search)}&sort=${sort}`,
        ownListingPageSchema,
        { signal },
      ),
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    retry,
  });
}
export function useHomeListings() {
  const session = useAppStore((state) => state.session);
  const browsingVillage = useAppStore(browsingVillageFor);
  const sourceId = browsingVillage?.id;
  return useQuery({
    queryKey: ["home-listings", session?.user.id ?? "guest", sourceId],
    enabled: !!sourceId && (!session || !!session.user.village),
    refetchOnMount: "always",
    queryFn: ({ signal }) =>
      session
        ? authenticatedApi(
            `/listings?${browsingListingsQuery(sourceId!, { limit: "5" })}`,
            mobileListingPageSchema,
            {
              signal,
            },
          )
        : api(
            `/listings?${browsingListingsQuery(sourceId!, { limit: "5" })}`,
            mobileListingPageSchema,
            { signal },
          ),
    retry,
  });
}
export function useMarketplaceListings(search: string, category: string) {
  const session = useAppStore((state) => state.session);
  const browsingVillage = useAppStore(browsingVillageFor);
  const sourceId = browsingVillage?.id;
  return useInfiniteQuery({
    queryKey: [
      "marketplace-listings",
      session?.user.id ?? "guest",
      sourceId,
      search,
      category,
    ],
    enabled: !!sourceId && (!session || !!session.user.village),
    refetchOnMount: "always",
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      const params: Record<string, string> = {
        search,
        includeProductGroupCounts: "true",
        page: String(pageParam),
        limit: "20",
      };
      if (category !== "all") params.productGroup = category;
      return (session ? authenticatedApi : api)(
        `/listings?${browsingListingsQuery(sourceId!, params)}`,
        mobileListingPageSchema,
        { signal },
      );
    },
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    retry,
  });
}
export function useListing(id: unknown) {
  const session = useAppStore((state) => state.session);
  const browsingVillage = useAppStore(browsingVillageFor);
  const sourceId = browsingVillage?.id;
  const parsed = listingIdSchema.safeParse(id);
  return useQuery({
    queryKey: [
      "listing",
      session?.user.id ?? "guest",
      sourceId,
      typeof id === "string" ? id : null,
    ],
    enabled:
      parsed.success && !!sourceId && (!session || !!session.user.village),
    refetchOnMount: "always",
    queryFn: ({ signal }) => {
      const listingId = parsed.success ? parsed.data : "";
      const path = `/listings/${listingId}?sourceVillageId=${sourceId}`;
      return (session ? authenticatedApi : api)(path, mobileListingSchema, {
        signal,
      });
    },
    retry,
  });
}
