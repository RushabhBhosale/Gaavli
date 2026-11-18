"use client";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Store, X } from "lucide-react";
import { PROVIDER_TYPE_LABELS, ProviderType } from "@gaavli/constants";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  ListCard,
  ListFilterBar,
  ListPageToolbar,
  ListSkeleton,
  RowActions,
  SearchField,
} from "@/components/shared/list-page";
import { ListPagination } from "@/components/shared/list-pagination";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { api } from "@/lib/api";
import { useSearchShortcut } from "@/lib/use-search-shortcut";

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
const label = (type: string) =>
  PROVIDER_TYPE_LABELS[type as ProviderType]?.en ?? type;

function ProfileIdentity({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FEF3EA] text-[#A84E0D]"
        aria-hidden="true"
      >
        <Store size={17} />
      </span>
      <div className="min-w-0">
        <p className="max-w-56 truncate font-semibold text-slate-800">
          {profile.name}
        </p>
        <p className="mt-0.5 max-w-56 truncate text-xs text-slate-500">
          {label(profile.providerType)}
        </p>
      </div>
    </div>
  );
}

export function ProviderProfileManagement() {
  const [providerType, setProviderType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const client = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  useSearchShortcut(searchRef);
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    search,
    sort: sorting[0]?.id ?? "createdAt",
    direction: sorting[0] ? (sorting[0].desc ? "desc" : "asc") : "desc",
  });
  if (providerType) params.set("providerType", providerType);
  if (status) params.set("status", status);
  const query = useQuery({
    queryKey: [
      "admin-provider-profiles",
      providerType,
      status,
      search,
      page,
      pageSize,
      sorting,
    ],
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
  const data = query.data?.profiles ?? [];
  const columns: ColumnDef<Profile>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <ProfileIdentity profile={row.original} />,
    },
    {
      accessorKey: "providerType",
      header: "Kind",
      cell: ({ row }) => (
        <span className="text-slate-600">
          {label(row.original.providerType)}
        </span>
      ),
    },
    {
      accessorKey: "village",
      header: "Village",
      cell: ({ row }) => (
        <span className="block max-w-56 truncate text-slate-600">
          {row.original.village}
        </span>
      ),
    },
    {
      accessorKey: "owner",
      header: "Owner",
      cell: ({ row }) => (
        <span>
          {row.original.owner}{" "}
          <span className="tabular-nums text-slate-500">
            {row.original.ownerMobile}
          </span>
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          tone={row.original.status === "ACTIVE" ? "success" : "neutral"}
          dot
        >
          {row.original.status === "ACTIVE" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex w-full justify-center">
          <RowActions
            label={`Actions for ${row.original.name}`}
            items={[
              {
                label:
                  row.original.status === "ACTIVE" ? "Deactivate" : "Activate",
                disabled: toggle.isPending,
                onSelect: () => toggle.mutate(row.original),
              },
            ]}
          />
        </div>
      ),
    },
  ];
  // TanStack Table v8 owns memoization; React Compiler is not enabled.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
    manualSorting: true,
    enableMultiSort: false,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
    },
  });
  const hasFilters = Boolean(search || providerType || status);
  function clearFilters() {
    setSearch("");
    setProviderType("");
    setStatus("");
    setPage(1);
  }
  const chips = [
    ...(providerType
      ? [
          {
            label: `Kind: ${label(providerType)}`,
            onRemove: () => {
              setProviderType("");
              setPage(1);
            },
          },
        ]
      : []),
    ...(status
      ? [
          {
            label: `Status: ${status === "ACTIVE" ? "Active" : "Inactive"}`,
            onRemove: () => {
              setStatus("");
              setPage(1);
            },
          },
        ]
      : []),
    ...(search
      ? [
          {
            label: `Search: “${search}”`,
            onRemove: () => {
              setSearch("");
              setPage(1);
            },
          },
        ]
      : []),
  ];
  function renderProfileRow(profile: Profile) {
    return (
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <ProfileIdentity profile={profile} />
          <p className="mt-2 truncate text-xs text-slate-500">
            {profile.village}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {profile.owner}{" "}
            <span className="tabular-nums">{profile.ownerMobile}</span>
          </p>
          <div className="mt-2">
            <Badge
              tone={profile.status === "ACTIVE" ? "success" : "neutral"}
              dot
            >
              {profile.status === "ACTIVE" ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <RowActions
          label={`Actions for ${profile.name}`}
          items={[
            {
              label: profile.status === "ACTIVE" ? "Deactivate" : "Activate",
              disabled: toggle.isPending,
              onSelect: () => toggle.mutate(profile),
            },
          ]}
        />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <ListPageToolbar
        search={
          <SearchField
            inputRef={searchRef}
            label="Search by name or village"
            placeholder="Search profile name or village…"
            value={search}
            onChange={setSearch}
          />
        }
      />
      <ListCard
        toolbar={
          <>
            <div className="w-full sm:w-52">
              <select
                aria-label="Filter by kind"
                value={providerType}
                onChange={(event) => {
                  setProviderType(event.target.value);
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
            <div className="w-full sm:w-32">
              <select
                aria-label="Filter by status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </>
        }
        filters={<ListFilterBar items={chips} onClearAll={clearFilters} />}
        footer={
          <ListPagination
            page={query.data?.page ?? page}
            pageSize={pageSize}
            total={query.data?.total ?? 0}
            disabled={query.isPending}
            label="Provider profile pagination"
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        }
      >
        {query.isError ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : query.isPending ? (
          <ListSkeleton rows={Math.min(pageSize, 8)} />
        ) : !data.length ? (
          <EmptyState
            title={
              hasFilters ? "No profiles match these filters" : "No profiles yet"
            }
            description={
              hasFilters
                ? "Try a different search, or clear the filters to see every profile."
                : "Profiles villagers register show up here."
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X size={14} />
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            table={table}
            caption="Provider profiles with kind, village, owner and status"
            mobileRow={renderProfileRow}
          />
        )}
      </ListCard>
    </div>
  );
}
