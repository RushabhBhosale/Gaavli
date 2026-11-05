import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type QueryClient,
} from "@tanstack/react-query";

// Public browsing data only: listings, listing details and the village
// directory. Never contact details, notifications or account data.
const PERSISTED_QUERIES = new Set([
  "home-listings",
  "marketplace-listings",
  "listing",
  "dashboard-directory",
  "directory",
  "directory-entry",
  "browse-villages",
]);
export const QUERY_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BYTES = 2_000_000;

export interface QueryCacheStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}

export async function restoreQueryCache(
  client: QueryClient,
  storage: QueryCacheStorage,
  now = Date.now(),
) {
  const saved = await storage.read();
  if (!saved) return false;
  try {
    const parsed = JSON.parse(saved) as {
      version?: number;
      savedAt?: number;
      state?: DehydratedState;
    };
    if (
      parsed.version !== 1 ||
      typeof parsed.savedAt !== "number" ||
      !parsed.state ||
      now - parsed.savedAt > QUERY_CACHE_MAX_AGE_MS
    )
      return false;
    hydrate(client, parsed.state);
    return true;
  } catch {
    return false;
  }
}

// Writes shortly after the cache settles, so scrolling and typing never wait
// on storage.
export function persistQueryCache(
  client: QueryClient,
  storage: QueryCacheStorage,
  delayMs = 1500,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = "";
  const save = () => {
    timer = undefined;
    const state = dehydrate(client, {
      shouldDehydrateQuery: (query) =>
        query.state.status === "success" &&
        PERSISTED_QUERIES.has(String(query.queryKey[0])),
    });
    const value = JSON.stringify({ version: 1, savedAt: Date.now(), state });
    if (value.length > MAX_BYTES) return;
    const unchanged = JSON.stringify(state) === last;
    if (unchanged) return;
    last = JSON.stringify(state);
    void storage.write(value).catch(() => undefined);
  };
  const unsubscribe = client.getQueryCache().subscribe(() => {
    timer ??= setTimeout(save, delayMs);
  });
  return () => {
    unsubscribe();
    if (timer) clearTimeout(timer);
  };
}
