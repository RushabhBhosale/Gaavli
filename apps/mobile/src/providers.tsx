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

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30000, retry: 1 },
          mutations: { retry: false },
        },
      }),
  );
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
        <CoordinatorAccessSync />
        <NotificationSync />
        {children}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
