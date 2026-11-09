"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PROVIDER_TYPE_LABELS, ProviderType } from "@gaavli/constants";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/shared/states";
import { api } from "@/lib/api";

type Profile = {
  id: string;
  providerType: ProviderType;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  village: string;
  owner: string;
  ownerMobile: string;
  contacts: number;
  createdAt: string;
};
type ProfilePage = {
  profiles: Profile[];
  total: number;
  page: number;
  limit: number;
};
type Claim = {
  id: string;
  status: string;
  note: string;
  profileName: string;
  providerType: string;
  claimant: string;
  claimantMobile: string;
  currentOwner: string;
  currentOwnerMobile: string;
  createdAt: string;
};
const label = (type: string) =>
  PROVIDER_TYPE_LABELS[type as ProviderType]?.en ?? type;

// What villagers registered, and the "this is mine" claims waiting for a
// decision. Approving a claim hands the profile to the claimant.
export function ProviderProfileManagement() {
  const [tab, setTab] = useState<"profiles" | "claims">("claims");
  return (
    <section className="card p-4 sm:p-6">
      <div className="mb-5">
        <p className="mb-1 text-xs font-medium text-emerald-700">
          Service Providers
        </p>
        <h1 className="text-xl font-bold">Provider Profiles</h1>
      </div>
      <div role="tablist" aria-label="Sections" className="mb-5 flex gap-2">
        {(
          [
            ["claims", "Ownership claims"],
            ["profiles", "All profiles"],
          ] as const
        ).map(([value, text]) => (
          <Button
            key={value}
            role="tab"
            aria-selected={tab === value}
            variant={tab === value ? "default" : "outline"}
            onClick={() => setTab(value)}
          >
            {text}
          </Button>
        ))}
      </div>
      {tab === "claims" ? <Claims /> : <Profiles />}
    </section>
  );
}

function Claims() {
  const [status, setStatus] = useState("PENDING");
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-provider-claims", status],
    queryFn: ({ signal }) =>
      api<{ claims: Claim[] }>(`/v1/admin/provider-claims?status=${status}`, {
        signal,
      }),
  });
  const resolve = useMutation({
    mutationFn: (input: { id: string; action: "approve" | "reject" }) =>
      api(`/v1/admin/provider-claims/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: input.action }),
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["admin-provider-claims"] }),
  });
  return (
    <>
      <div className="field mb-4 max-w-xs">
        <label htmlFor="claim-status">Status</label>
        <select
          id="claim-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="PENDING">Waiting for a decision</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      {resolve.isError && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800"
        >
          {(resolve.error as Error).message}
        </p>
      )}
      {query.isPending ? (
        <Skeleton className="h-24" />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data.claims.length ? (
        <EmptyState
          title="No claims here"
          description="Claims appear when someone says a listing is theirs."
        />
      ) : (
        <ul className="grid gap-3">
          {query.data.claims.map((claim) => (
            <li key={claim.id} className="rounded-lg border p-4">
              <p className="font-semibold">
                {claim.profileName}{" "}
                <span className="text-xs font-normal text-slate-500">
                  {label(claim.providerType)}
                </span>
              </p>
              <p className="mt-1 text-sm">
                Claimed by <b>{claim.claimant}</b> ({claim.claimantMobile}).
                Listed by {claim.currentOwner} ({claim.currentOwnerMobile}).
              </p>
              {claim.note && (
                <p className="mt-1 text-sm text-slate-600">“{claim.note}”</p>
              )}
              {claim.status === "PENDING" && (
                <div className="mt-3 flex gap-2">
                  <Button
                    disabled={resolve.isPending}
                    onClick={() =>
                      resolve.mutate({ id: claim.id, action: "approve" })
                    }
                  >
                    Hand over to claimant
                  </Button>
                  <Button
                    variant="outline"
                    disabled={resolve.isPending}
                    onClick={() =>
                      resolve.mutate({ id: claim.id, action: "reject" })
                    }
                  >
                    Reject
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Profiles() {
  const [providerType, setProviderType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const client = useQueryClient();
  const params = new URLSearchParams({ page: String(page), search });
  if (providerType) params.set("providerType", providerType);
  if (status) params.set("status", status);
  const query = useQuery({
    queryKey: ["admin-provider-profiles", providerType, status, search, page],
    queryFn: ({ signal }) =>
      api<ProfilePage>(`/v1/admin/provider-profiles?${params}`, { signal }),
  });
  const toggle = useMutation({
    mutationFn: (row: Profile) =>
      api(`/v1/admin/provider-profiles/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        }),
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["admin-provider-profiles"] }),
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 15));
  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="pp-search">Search by name</label>
          <input
            id="pp-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="pp-type">Kind</label>
          <select
            id="pp-type"
            value={providerType}
            onChange={(e) => {
              setProviderType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All kinds</option>
            {Object.values(ProviderType).map((type) => (
              <option key={type} value={type}>
                {label(type)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pp-status">Status</label>
          <select
            id="pp-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>
      {query.isPending ? (
        <Skeleton className="h-32" />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data.profiles.length ? (
        <EmptyState
          title="No profiles yet"
          description="Profiles villagers register show up here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-500">
                <th className="py-2">Name</th>
                <th>Kind</th>
                <th>Village</th>
                <th>Owner</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data.profiles.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2 font-medium">{row.name}</td>
                  <td>{label(row.providerType)}</td>
                  <td>{row.village}</td>
                  <td>
                    {row.owner}{" "}
                    <span className="text-slate-500">{row.ownerMobile}</span>
                  </td>
                  <td>{row.status === "ACTIVE" ? "Active" : "Inactive"}</td>
                  <td>
                    <Button
                      variant="outline"
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate(row)}
                    >
                      {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {page} of {pages}
        </span>
        <Button
          variant="outline"
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </>
  );
}
