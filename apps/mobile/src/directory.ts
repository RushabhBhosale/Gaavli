import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { DirectoryGroupId } from "@gaavli/constants";
import {
  dashboardDirectorySchema,
  directoryEntrySchema,
  directoryPageSchema,
  directorySummarySchema,
  productShopsSchema,
} from "@gaavli/validation";
import { useAppStore } from "./store";
import { browsingVillageFor } from "./storage/browsingVillage";
import { api } from "./api";
import { authenticatedApi } from "./session";
import { ApiError } from "./api/client";

const retry = (count: number, error: unknown) =>
  count < 2 &&
  !(error instanceof ApiError && error.status && error.status < 500);
export function useDashboardDirectory() {
  const session = useAppStore((state) => state.session);
  const village = useAppStore(browsingVillageFor);
  return useQuery({
    queryKey: ["dashboard-directory", session?.user.id ?? "guest", village?.id],
    enabled: !!village && (!session || !!session.user.village),
    queryFn: ({ signal }) =>
      (session ? authenticatedApi : api)(
        `/dashboard?sourceVillageId=${village!.id}`,
        dashboardDirectorySchema,
        { signal },
      ),
    retry,
  });
}
export function useDirectorySummary(module: "services" | "transport") {
  const session = useAppStore((state) => state.session);
  const village = useAppStore(browsingVillageFor);
  return useQuery({
    queryKey: [
      "directory-summary",
      session?.user.id ?? "guest",
      village?.id,
      module,
    ],
    enabled: !!village && (!session || !!session.user.village),
    queryFn: ({ signal }) =>
      (session ? authenticatedApi : api)(
        `/directory/summary?${new URLSearchParams({ sourceVillageId: village!.id, module })}`,
        directorySummarySchema,
        { signal },
      ),
    retry,
  });
}
export function useDirectory(
  module: "services" | "transport",
  search: string,
  category: DirectoryGroupId | null = null,
) {
  const session = useAppStore((state) => state.session);
  const village = useAppStore(browsingVillageFor);
  return useInfiniteQuery({
    queryKey: [
      "directory",
      session?.user.id ?? "guest",
      village?.id,
      module,
      search,
      category,
    ],
    enabled: !!village && (!session || !!session.user.village),
    initialPageParam: 1,
    queryFn: ({ signal, pageParam }) =>
      (session ? authenticatedApi : api)(
        `/directory?${new URLSearchParams({ sourceVillageId: village!.id, module, search, ...(category ? { category } : {}), page: String(pageParam), limit: "50" })}`,
        directoryPageSchema,
        { signal },
      ),
    getNextPageParam: (page) =>
      page.page * page.limit < page.total ? page.page + 1 : undefined,
    retry,
  });
}
export function useDirectoryEntry(id: string) {
  const session = useAppStore((state) => state.session);
  const village = useAppStore(browsingVillageFor);
  return useQuery({
    queryKey: ["directory-entry", session?.user.id ?? "guest", village?.id, id],
    staleTime: 0,
    refetchOnMount: "always",
    enabled:
      !!village &&
      /^[a-f0-9]{24}$/i.test(id) &&
      (!session || !!session.user.village),
    queryFn: ({ signal }) =>
      (session ? authenticatedApi : api)(
        `/directory/${id}?sourceVillageId=${village!.id}`,
        directoryEntrySchema,
        { signal },
      ),
    retry,
  });
}
// Shops that sell the searched product (not persisted: entries carry contacts).
export function useProductShops(search: string, limit = 5) {
  const session = useAppStore((state) => state.session);
  const village = useAppStore(browsingVillageFor);
  return useQuery({
    queryKey: [
      "product-shops",
      session?.user.id ?? "guest",
      village?.id,
      search,
      limit,
    ],
    enabled: !!village && !!search && (!session || !!session.user.village),
    queryFn: ({ signal }) =>
      (session ? authenticatedApi : api)(
        `/directory/product-shops?${new URLSearchParams({ sourceVillageId: village!.id, q: search, limit: String(limit) })}`,
        productShopsSchema,
        { signal },
      ),
    retry,
  });
}
