"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { PROVIDER_TYPE_LABELS, ProviderType } from "@gaavli/constants";
import { ListPagination } from "@/components/shared/list-pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
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
const label = (type: string) =>
  PROVIDER_TYPE_LABELS[type as ProviderType]?.en ?? type;

export function ProviderProfileManagement() {
  return (
    <section className="card p-4 sm:p-6">
      <div className="mb-5">
        <p className="mb-1 text-xs font-medium text-emerald-700">
          Service Providers
        </p>
        <h1 className="text-xl font-bold">Provider Profiles</h1>
      </div>
      <Profiles />
    </section>
  );
}

function Profiles() {
  const [providerType, setProviderType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const client = useQueryClient();
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
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "providerType",
      header: "Kind",
      cell: ({ row }) => label(row.original.providerType),
    },
    { accessorKey: "village", header: "Village" },
    {
      accessorKey: "owner",
      header: "Owner",
      cell: ({ row }) => (
        <>
          {row.original.owner}{" "}
          <span className="text-slate-500">{row.original.ownerMobile}</span>
        </>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.status === "ACTIVE" ? "Active" : "Inactive",
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(row.original)}
        >
          {row.original.status === "ACTIVE" ? "Deactivate" : "Activate"}
        </Button>
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
    manualSorting: true,
    enableMultiSort: false,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
    },
  });
  const currentPage = query.data?.page ?? page;
  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="pp-search">Search by name or village</label>
          <input
            id="pp-search"
            placeholder="Search profile name or village..."
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
          <table
            className="w-full min-w-[850px] text-left text-sm"
            aria-label="Provider profiles"
          >
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className="border-b border-slate-300">
                  {group.headers.map((header) => (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        header.column.getIsSorted() === "asc"
                          ? "ascending"
                          : header.column.getIsSorted() === "desc"
                            ? "descending"
                            : "none"
                      }
                      className="px-3 py-3 text-xs font-semibold text-slate-500"
                    >
                      {header.column.getCanSort() ? (
                        <button
                          className="flex items-center gap-2 text-left"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {header.column.getIsSorted() === "asc" ? (
                            <ArrowUp size={13} />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ArrowDown size={13} />
                          ) : (
                            <ArrowUpDown size={13} />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-200 hover:bg-slate-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {query.data && (
        <div className="-mx-4 -mb-4 mt-5 sm:-mx-6 sm:-mb-6">
          <ListPagination
            page={currentPage}
            pageSize={pageSize}
            total={query.data.total}
            disabled={query.isFetching}
            label="Provider profile pagination"
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </div>
      )}
    </>
  );
}
