import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileUserSchema } from "@gaavli/validation";
import { useAppStore } from "../store";
import { authenticatedApi } from "../session";

// Refresh role assignments on foreground and while the app is open. Tokens do
// not grant coordinator scope; every operation is checked again by the server.
export function CoordinatorAccessSync() {
  const { session, offline } = useAppStore();
  const client = useQueryClient();
  const accountId = session?.user.id;
  const query = useQuery({
    queryKey: ["coordinator-access", accountId],
    enabled: !!session && !offline,
    queryFn: ({ signal }) =>
      authenticatedApi("/users/me", mobileUserSchema, { signal }),
    refetchInterval: 30000,
    refetchOnWindowFocus: "always",
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  useEffect(() => {
    const current = useAppStore.getState().session;
    if (!query.data || !current || current.user.id !== accountId) return;
    if (
      current.user.isCoordinator !== query.data.isCoordinator ||
      JSON.stringify(current.user.coordinatorVillages || []) !==
        JSON.stringify(query.data.coordinatorVillages)
    ) {
      const allowed = new Set(
        query.data.coordinatorVillages.map((row) => row.id),
      );
      client.removeQueries({
        predicate: (entry) =>
          entry.queryKey[0] === "coordinator" &&
          (!allowed.has(String(entry.queryKey[2])) ||
            entry.queryKey[1] !== accountId),
      });
      const next = {
        ...current,
        user: {
          ...current.user,
          isCoordinator: query.data.isCoordinator,
          coordinatorVillages: query.data.coordinatorVillages,
        },
      };
      useAppStore.getState().setSession(next);
    }
  }, [query.data, query.dataUpdatedAt, accountId, client]);
  return null;
}
