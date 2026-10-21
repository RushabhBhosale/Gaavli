import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  mobileListingPageSchema,
  mobileListingSchema,
  listingIdSchema,
  ownListingPageSchema,
} from "@gaavli/validation";
import { authenticatedApi } from "./session";
import { useAppStore } from "./store";
import { ApiError } from "./api/client";

const retry = (count: number, error: unknown) =>
  count < 1 &&
  !(error instanceof ApiError && error.status && error.status < 500);
export function useOwnListings(
  status: "active" | "sold_out" | "all" | "low_stock" = "active",
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
  return useQuery({
    queryKey: ["home-listings", session?.user.id, session?.user.village?.id],
    enabled: !!session?.user.village,
    refetchOnMount: "always",
    queryFn: ({ signal }) =>
      authenticatedApi("/listings?limit=5", mobileListingPageSchema, {
        signal,
      }),
    retry,
  });
}
export function useMarketplaceListings(
  search: string,
  category: string,
  villageId?: string,
) {
  const session = useAppStore((state) => state.session);
  return useInfiniteQuery({
    queryKey: [
      "marketplace-listings",
      session?.user.id,
      session?.user.village?.id,
      search,
      category,
      villageId,
    ],
    enabled: !!session?.user.village,
    refetchOnMount: "always",
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      const query = new URLSearchParams({
        search,
        page: String(pageParam),
        limit: "20",
      });
      if (category !== "all") query.set("productGroup", category);
      if (villageId) query.set("villageId", villageId);
      return authenticatedApi(`/listings?${query}`, mobileListingPageSchema, {
        signal,
      });
    },
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    retry,
  });
}
export function useListing(id: unknown) {
  const session = useAppStore((state) => state.session);
  const parsed = listingIdSchema.safeParse(id);
  return useQuery({
    queryKey: [
      "listing",
      session?.user.id,
      session?.user.village?.id,
      typeof id === "string" ? id : null,
    ],
    enabled: parsed.success && !!session?.user.village,
    refetchOnMount: "always",
    queryFn: ({ signal }) =>
      authenticatedApi(
        `/listings/${parsed.success ? parsed.data : ""}`,
        mobileListingSchema,
        { signal },
      ),
    retry,
  });
}
