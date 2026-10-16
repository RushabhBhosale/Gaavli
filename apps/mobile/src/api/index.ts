import { createApiClient } from "./client";

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  development: __DEV__,
});
