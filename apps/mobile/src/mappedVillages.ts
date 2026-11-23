import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { mobileVillageSchema } from "@gaavli/validation";
import { api } from "./api";
import { ApiError } from "./api/client";

// Villages mapped with one village: listings are shared between them.
export function useMappedVillages(
  villageId: string | undefined,
  radiusKm = 50,
) {
  return useQuery({
    queryKey: ["mapped-villages", villageId, radiusKm],
    enabled: !!villageId,
    queryFn: ({ signal }) =>
      api(
        `/villages/mapped?villageId=${villageId}&radiusKm=${radiusKm}`,
        z.object({
          villages: z.array(mobileVillageSchema),
          nearby: z.array(mobileVillageSchema).default([]),
        }),
        { signal },
      ),
    retry: (count, error) =>
      count < 2 &&
      !(error instanceof ApiError && error.status && error.status < 500),
  });
}
