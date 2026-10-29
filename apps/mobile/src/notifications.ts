import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  notificationPageSchema,
  notificationReadResultSchema,
} from "@gaavli/validation";
import { authenticatedApi } from "./session";
import { useAppStore } from "./store";
import { ApiError } from "./api/client";
import { applyNotificationReads } from "./data/notificationReadState";

export function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  return active;
}

export function useUnreadNotifications(poll = false) {
  const accountId = useAppStore((state) => state.session?.user.id);
  const offline = useAppStore((state) => state.offline);
  const active = useAppActive();
  return useQuery({
    queryKey: ["notification-unread", accountId],
    enabled: !!accountId && !offline && active,
    queryFn: ({ signal }) =>
      authenticatedApi(
        "/notifications?includeUnreadCount=true&limit=1",
        notificationPageSchema.required({ unreadCount: true }),
        { signal },
      ),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: poll ? 15000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
}

export function NotificationSync() {
  useUnreadNotifications(true);
  return null;
}

export function useReadNotifications() {
  const accountId = useAppStore((state) => state.session?.user.id);
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!accountId || useAppStore.getState().session?.user.id !== accountId)
        throw new ApiError("AUTH_REQUIRED", 401);
      const result = await authenticatedApi(
        "/notifications",
        notificationReadResultSchema,
        {
          method: "PATCH",
          body: JSON.stringify({ ids }),
        },
      );
      if (useAppStore.getState().session?.user.id !== accountId)
        throw new ApiError("ABORTED");
      return result;
    },
    onSuccess: async (result) => {
      if (!accountId || useAppStore.getState().session?.user.id !== accountId)
        return;
      // Cancel old GETs so stale unread state cannot overwrite this confirmed read.
      await Promise.all([
        client.cancelQueries({ queryKey: ["notification-unread", accountId] }),
        client.cancelQueries({ queryKey: ["notifications", accountId] }),
        client.cancelQueries({ queryKey: ["activity-requests", accountId] }),
      ]);
      if (useAppStore.getState().session?.user.id !== accountId) return;
      applyNotificationReads(client, accountId, result);
      void client.invalidateQueries({
        queryKey: ["notification-unread", accountId],
      });
    },
    retry: false,
  });
}
