import { z } from "zod";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { ProviderMasterType, ProviderType } from "@gaavli/constants";
import {
  accountContactsOutputSchema,
  providerClaimResultSchema,
  providerCreatedSchema,
  providerDuplicateResultSchema,
  providerFacilityDetailSchema,
  providerProfilesResponseSchema,
  providerSearchResultSchema,
} from "@gaavli/validation";
import { api } from "./api";
import { authenticatedApi } from "./session";
import { useAppStore } from "./store";
import { ApiError } from "./api/client";

const retry = (count: number, error: unknown) =>
  count < 2 &&
  !(error instanceof ApiError && error.status && error.status < 500);

// The options of one select list, as managed in the admin.
const mastersSchema = z.object({
  records: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.object({ en: z.string(), mr: z.string(), hi: z.string() }),
    }),
  ),
});
export type MasterOption = z.infer<typeof mastersSchema>["records"][number];
export function useProviderMasters(
  providerType: ProviderType,
  masterType: ProviderMasterType,
) {
  return useQuery({
    queryKey: ["provider-masters", providerType, masterType],
    queryFn: ({ signal }) =>
      api(
        `/provider-masters?${new URLSearchParams({ providerType, masterType })}`,
        mastersSchema,
        { signal },
      ),
    staleTime: 10 * 60_000,
    retry,
  });
}

const KEY = "provider-profiles";
export function useMyProviderProfiles() {
  const session = useAppStore((state) => state.session);
  return useQuery({
    queryKey: [KEY, session?.user.id],
    enabled: !!session,
    queryFn: ({ signal }) =>
      authenticatedApi("/provider-profiles", providerProfilesResponseSchema, {
        signal,
      }),
    retry,
  });
}
export function useMyProviderProfile(id: string | undefined) {
  const session = useAppStore((state) => state.session);
  return useQuery({
    queryKey: [KEY, session?.user.id, id],
    enabled: !!session && !!id,
    queryFn: ({ signal }) =>
      authenticatedApi(
        `/provider-profiles/${id}`,
        providerFacilityDetailSchema,
        {
          signal,
        },
      ),
    retry,
  });
}
export function useAccountContacts() {
  const session = useAppStore((state) => state.session);
  return useQuery({
    queryKey: ["account-contacts", session?.user.id],
    enabled: !!session,
    queryFn: ({ signal }) =>
      authenticatedApi("/users/me/contacts", accountContactsOutputSchema, {
        signal,
      }),
    retry,
  });
}
export function useRefreshProfiles() {
  const client = useQueryClient();
  return () => refreshProfiles(client);
}
export function refreshProfiles(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: [KEY] }),
    client.invalidateQueries({ queryKey: ["directory"] }),
    client.invalidateQueries({ queryKey: ["directory-summary"] }),
    client.invalidateQueries({ queryKey: ["dashboard-directory"] }),
  ]);
}

type Body = Record<string, unknown>;
const json = (body: Body) => JSON.stringify(body);
export const createProfile = (body: Body) =>
  authenticatedApi("/provider-profiles", providerCreatedSchema, {
    method: "POST",
    body: json(body),
  });
export const updateProfile = (id: string, body: Body) =>
  authenticatedApi(`/provider-profiles/${id}`, providerCreatedSchema, {
    method: "PATCH",
    body: json(body),
  });
export const setProfileStatus = (id: string, status: string, version: number) =>
  authenticatedApi(`/provider-profiles/${id}/status`, providerCreatedSchema, {
    method: "PATCH",
    body: json({ status, version }),
  });
export const checkDuplicates = (body: Body) =>
  authenticatedApi("/provider-profiles/check", providerDuplicateResultSchema, {
    method: "POST",
    body: json(body),
  });
export const searchProfiles = (
  params: Record<string, string>,
  signal?: AbortSignal,
) =>
  authenticatedApi(
    `/provider-profiles/search?${new URLSearchParams(params)}`,
    providerSearchResultSchema,
    { signal },
  );
export const requestLink = (id: string, otherProfileId: string) =>
  authenticatedApi(
    `/provider-profiles/${id}/links`,
    providerProfilesResponseSchema,
    {
      method: "POST",
      body: json({ otherProfileId }),
    },
  );
export const answerLink = (
  linkId: string,
  action: "confirm" | "reject" | "remove",
) =>
  authenticatedApi(
    `/provider-profiles/links/${linkId}`,
    providerProfilesResponseSchema,
    { method: "PATCH", body: json({ action }) },
  );
export const claimProfile = (id: string, note?: string) =>
  authenticatedApi(
    `/provider-profiles/${id}/claim`,
    providerClaimResultSchema,
    {
      method: "POST",
      body: json(note ? { note } : {}),
    },
  );
export const saveAccountContacts = (body: Body) =>
  authenticatedApi("/users/me/contacts", accountContactsOutputSchema, {
    method: "PUT",
    body: json(body),
  });
