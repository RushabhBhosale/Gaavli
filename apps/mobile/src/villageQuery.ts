import { infiniteQueryOptions, type QueryClient } from "@tanstack/react-query";
import { villagePageSchema } from "@gaavli/validation";
import { api } from "./api";

// The village list almost never changes, so one shared query (and one cache
// entry) serves every village picker and is prefetched at launch.
const VILLAGE_STALE_MS = 6 * 60 * 60 * 1000;

export const villageListOptions = (search: string) =>
  infiniteQueryOptions({
    queryKey: ["browse-villages", search],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api(
        `/villages?page=${pageParam}&limit=20&search=${encodeURIComponent(search)}`,
        villagePageSchema,
        { signal },
      ),
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    staleTime: VILLAGE_STALE_MS,
  });

export function prefetchVillages(client: QueryClient) {
  return client
    .prefetchInfiniteQuery({ ...villageListOptions(""), retry: 1 })
    .catch(() => undefined);
}
