import type { z } from "zod";
import { apiFailureSchema, apiSuccessSchema } from "@gaavli/validation";
import { API_TIMEOUT_MS } from "@gaavli/constants";
import { validateApiBaseUrl } from "@gaavli/utils";

export class ApiError extends Error {
  constructor(
    public code: string,
    public status?: number,
    public requestId?: string,
  ) {
    super(code);
  }
}
type Options = {
  baseUrl: string | undefined;
  development: boolean;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};
export function createApiClient({
  baseUrl,
  development,
  fetcher = fetch,
  timeoutMs = API_TIMEOUT_MS,
}: Options) {
  return async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    init: RequestInit = {},
    requestTimeoutMs = timeoutMs,
  ): Promise<T> {
    let base: string;
    try {
      base = validateApiBaseUrl(baseUrl, development);
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : "API_URL_INVALID",
      );
    }
    if (!path.startsWith("/") || path.startsWith("//") || path.includes(".."))
      throw new ApiError("API_PATH_INVALID");
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    init.signal?.addEventListener("abort", cancel, { once: true });
    if (init.signal?.aborted) controller.abort();
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, requestTimeoutMs);
    try {
      const headers = new Headers(init.headers);
      headers.set("Accept", "application/json");
      if (
        init.body &&
        !(typeof FormData !== "undefined" && init.body instanceof FormData) &&
        !headers.has("Content-Type")
      )
        headers.set("Content-Type", "application/json");
      const response = await fetcher(`${base}${path}`, {
        ...init,
        headers,
        credentials: "omit",
        signal: controller.signal,
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error) {
        if (controller.signal.aborted) throw error;
        throw new ApiError("INVALID_RESPONSE", response.status);
      }
      const failure = apiFailureSchema.safeParse(payload);
      if (failure.success)
        throw new ApiError(
          failure.data.error.code,
          response.status,
          failure.data.requestId,
        );
      if (!response.ok) throw new ApiError("HTTP_ERROR", response.status);
      const success = apiSuccessSchema(schema).safeParse(payload);
      if (!success.success)
        throw new ApiError("INVALID_RESPONSE", response.status);
      return success.data.data;
    } catch (error) {
      if (timedOut) throw new ApiError("TIMEOUT");
      if (init.signal?.aborted) throw new ApiError("ABORTED");
      if (error instanceof ApiError) throw error;
      throw new ApiError("NETWORK_ERROR");
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener("abort", cancel);
    }
  };
}
