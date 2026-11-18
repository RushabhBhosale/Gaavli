import { useMutation, useQuery } from "@tanstack/react-query";
import {
  whatsAppTestResultSchema,
  whatsAppTestStatusSchema,
} from "@gaavli/validation";
import { ApiError } from "../api/client";
import { authenticatedApi } from "../session";
import { useAppStore } from "../store";

const path = "/notifications/whatsapp-test";

export function useWhatsAppTest() {
  const session = useAppStore((state) => state.session);
  const offline = useAppStore((state) => state.offline);
  const status = useQuery({
    queryKey: ["whatsapp-test", session?.user.id],
    enabled: !!session && !offline,
    queryFn: ({ signal }) =>
      authenticatedApi(path, whatsAppTestStatusSchema, { signal }),
    retry: false,
  });
  const send = useMutation({
    mutationFn: async () => {
      if (
        !session ||
        useAppStore.getState().session?.refreshToken !== session.refreshToken
      )
        throw new ApiError("AUTH_REQUIRED");
      return authenticatedApi(path, whatsAppTestResultSchema, {
        method: "POST",
        body: JSON.stringify({}),
      }).catch((error: unknown) => {
        if (
          error instanceof ApiError &&
          ["TIMEOUT", "NETWORK_ERROR", "INVALID_RESPONSE"].includes(error.code)
        )
          throw new ApiError("WATI_OUTCOME_UNKNOWN");
        throw error;
      });
    },
  });
  return { status, send };
}
