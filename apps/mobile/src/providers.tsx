import { useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAppStore } from "./store";
import { CoordinatorAccessSync } from "./coordinator/access";
import { NotificationSync } from "./notifications";
import { persistQueryCache, restoreQueryCache } from "./storage/queryCache";
import { queryCacheStorage } from "./storage/sqlite";

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000,
            gcTime: 60 * 60 * 1000,
            retry: 1,
            // Saved listings show instantly; fresh ones replace them once the
            // connection is back.
            refetchOnReconnect: "always",
          },
          mutations: { retry: false },
        },
      }),
  );
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    void restoreQueryCache(client, queryCacheStorage)
      .catch(() => false)
      .then(() => {
        if (!active) return;
        stop = persistQueryCache(client, queryCacheStorage);
        setRestored(true);
      });
    return () => {
      active = false;
      stop?.();
    };
  }, [client]);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected !== false && state.isInternetReachable !== false;
      onlineManager.setOnline(online);
      useAppStore.getState().setOffline(!online);
    });
    focusManager.setFocused(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        {restored && (
          <>
            <CoordinatorAccessSync />
            <NotificationSync />
            {children}
          </>
        )}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
