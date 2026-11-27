import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type QueryClient,
} from "@tanstack/react-query";

// Public browsing data only: listings, listing details, the village directory
// and public reference lists. Never contact details, notifications, account
// data or anything built from the phone's location.
const PERSISTED_QUERIES = new Set([
  "home-listings",
  "marketplace-listings",
  "search-index",
  "listing",
  "dashboard-directory",
  "directory",
  "directory-summary",
  "directory-entry",
  "browse-villages",
  "guest-villages",
  "listing-categories",
  "listing-tags",
]);
// Searched variants are throwaway; only the plain, unsearched lists are worth
// keeping for the next start.
const UNSEARCHED_ONLY = new Set(["marketplace-listings", "directory"]);
const DIRECTORY_QUERIES = new Set([
  "dashboard-directory",
  "directory",
  "directory-entry",
]);

function withoutContacts(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutContacts);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        key === "contacts" ? [] : withoutContacts(entry),
      ]),
    );
  return value;
}

function publicDirectoryQuery(query: DehydratedState["queries"][number]) {
  if (!DIRECTORY_QUERIES.has(String(query.queryKey[0]))) return query;
  return {
    ...query,
    state: { ...query.state, data: withoutContacts(query.state.data) },
  };
}

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
    const state = {
      ...parsed.state,
      queries: parsed.state.queries
        .filter((query) => PERSISTED_QUERIES.has(String(query.queryKey[0])))
        .map(publicDirectoryQuery),
    };
    hydrate(client, state);
    // Older cache files may contain directory contacts. Rewrite their safe
    // public data before the app resumes browsing.
    if (JSON.stringify(state) !== JSON.stringify(parsed.state))
      await storage.write(JSON.stringify({ ...parsed, state }));
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
      shouldDehydrateQuery: (query) => {
        const name = String(query.queryKey[0]);
        return (
          query.state.status === "success" &&
          PERSISTED_QUERIES.has(name) &&
          (!UNSEARCHED_ONLY.has(name) || !query.queryKey[4])
        );
      },
    });
    // Newest first, so a full cache drops the oldest lists instead of
    // refusing to save anything.
    const queries = state.queries
      .map(publicDirectoryQuery)
      .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt);
    const kept: typeof queries = [];
    let size = 0;
    for (const query of queries) {
      size += JSON.stringify(query).length;
      if (size > MAX_BYTES) break;
      kept.push(query);
    }
    const trimmed = { ...state, queries: kept };
    const serialized = JSON.stringify(trimmed);
    if (serialized === last) return;
    last = serialized;
    const value = JSON.stringify({
      version: 1,
      savedAt: Date.now(),
      state: trimmed,
    });
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
