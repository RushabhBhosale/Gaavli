import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { mobileVillageSchema } from "@gaavli/validation";
import { authenticatedApi } from "./session";
import { useAppStore } from "./store";

const schema = z.object({ villages: z.array(mobileVillageSchema) });
const KEY = "user-mapped-villages";
// Everything that depends on which villages a person sees.
const AFFECTED = [
  "marketplace-listings",
  "home-listings",
  "search-index",
  "search-suggest",
  "listing",
  "listing-offers",
  "dashboard-directory",
  "directory",
  "directory-summary",
  "directory-entry",
  "product-shops",
];

// Villages this user added next to their own. Only this user sees them.
export function useUserMappedVillages() {
  const userId = useAppStore((state) => state.session?.user.id);
  return useQuery({
    queryKey: [KEY, userId],
    enabled: !!userId,
    queryFn: () => authenticatedApi("/users/me/mapped-villages", schema),
  });
}

export function useChangeUserMappedVillage() {
  const client = useQueryClient();
  const userId = useAppStore((state) => state.session?.user.id);
  return useMutation({
    mutationFn: ({ id, remove }: { id: string; remove: boolean }) =>
      remove
        ? authenticatedApi(`/users/me/mapped-villages/${id}`, schema, {
            method: "DELETE",
          })
        : authenticatedApi("/users/me/mapped-villages", schema, {
            method: "POST",
            body: JSON.stringify({ targetVillageId: id }),
          }),
    onSuccess: (data) => {
      client.setQueryData([KEY, userId], data);
      for (const key of AFFECTED)
        void client.invalidateQueries({ queryKey: [key] });
    },
  });
}
