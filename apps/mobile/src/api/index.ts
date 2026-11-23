import { createApiClient } from "./client";
import { dummyFetcher } from "../dev/dummyFetcher";

// Dev-only: serve bundled sample data instead of calling the backend.
const useDummyData =
  __DEV__ && process.env.EXPO_PUBLIC_USE_DUMMY_DATA === "true";

export const api = createApiClient({
  baseUrl: useDummyData
    ? "http://localhost:3000/api/v1"
    : process.env.EXPO_PUBLIC_API_BASE_URL,
  development: __DEV__,
  ...(useDummyData ? { fetcher: dummyFetcher } : {}),
});
