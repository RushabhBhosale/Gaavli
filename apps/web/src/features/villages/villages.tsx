"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  X,
  Plus,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/shared/states";
import { api } from "@/lib/api";
import type { AdminVillageDto, VillagesPage } from "@/lib/contracts";
import { VillageForm } from "./village-form";
import { VillageDeleteDialog } from "./village-delete-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const PAGE_SIZE = 6;
const columns: ColumnDef<AdminVillageDto>[] = [
  {
    accessorKey: "name",
    header: "Village",
    cell: ({ row, table }) => (
      <div className="flex items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700"
          aria-hidden="true"
        >
          <MapPin size={20} />
        </span>
        <div>
          <button
            className="font-semibold text-emerald-800 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-700"
            aria-label={`Edit ${row.original.name}`}
            onClick={() =>
              (
                table.options.meta as {
                  editVillage: (village: AdminVillageDto) => void;
                }
              ).editVillage(row.original)
            }
          >
            {row.original.name}
          </button>
          <p className="mt-1 text-[11px] text-slate-400">
            {[row.original.taluka, row.original.district]
              .filter(Boolean)
              .join(", ") || row.original.nameMr}
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "coordinator",
    header: "Assigned Coordinator",
    cell: ({ row }) =>
      row.original.coordinators === null ? (
        <span className="text-xs text-slate-400">Not configured</span>
      ) : row.original.coordinators.length ? (
        <span>
          {row.original.coordinators
            .map((coordinator) => coordinator.name)
            .join(", ")}
        </span>
      ) : (
        <span className="text-slate-400">Unassigned</span>
      ),
  },
  {
    accessorKey: "users",
    header: "Users",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.users.toLocaleString("en-IN")}
      </span>
    ),
  },
  {
    accessorKey: "nearbyMapped",
    header: "Nearby Mapped",
    cell: ({ row }) =>
      row.original.nearbyMapped === null ? (
        <span className="text-xs text-slate-400">Not configured</span>
      ) : (
        <span className="tabular-nums">
          {row.original.nearbyMapped.toLocaleString("en-IN")} villages
        </span>
      ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span
        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-semibold ${row.original.status === "active" ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"}`}
      >
        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
        {row.original.status === "active" ? "Active" : "Inactive"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row, table }) => {
      const actions = table.options.meta as {
        editVillage: (village: AdminVillageDto) => void;
        deleteVillage: (village: AdminVillageDto) => void;
      };
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Actions for ${row.original.name}`}
            >
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onSelect={() => actions.editVillage(row.original)}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => actions.deleteVillage(row.original)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function VillagesManagement() {
  const client = useQueryClient();
  const [deleting, setDeleting] = useState<AdminVillageDto | null>(null);
  const [form, setForm] = useState<AdminVillageDto | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    ...(debounced ? { search: debounced } : {}),
    ...(district ? { district } : {}),
    ...(status ? { status } : {}),
  });
  const villages = useQuery({
    queryKey: ["admin-villages", debounced, district, status, page],
    queryFn: () => api<VillagesPage>(`/v1/admin/villages?${query}`),
  });
  // Retain district choices while a new filtered page is loading.
  const districtOptions = useQuery({
    queryKey: ["admin-villages", "district-options"],
    queryFn: () => api<VillagesPage>("/v1/admin/villages?limit=1"),
    select: (data) => data.districts,
  });
  const data = useMemo(() => villages.data?.villages ?? [], [villages.data]);
  // React Compiler is not enabled; TanStack Table v8 owns its memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
    meta: { editVillage: setForm, deleteVillage: setDeleting },
  });
  const total = villages.data?.total ?? 0;
  const currentPage = villages.data?.page ?? page;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstPage = Math.max(1, Math.min(currentPage - 2, pages - 4));
  const hasFilters = !!(search || district || status);
  function clearFilters() {
    setSearch("");
    setDebounced("");
    setDistrict("");
    setStatus("");
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Village Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            View villages, coordinators and nearby village mappings.
          </p>
        </div>
        <Button size="sm" onClick={() => setForm("new")}>
          <Plus size={15} />
          Add Village
        </Button>
      </div>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-52 flex-1">
            <Search
              size={16}
              className="absolute left-3 top-3 text-slate-400"
              aria-hidden="true"
            />
            <input
              aria-label="Search village, taluka or district"
              placeholder="Search village, taluka or district..."
              style={{ paddingLeft: 36 }}
              value={search}
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="w-full sm:w-44">
            <select
              aria-label="Filter by district"
              value={district}
              onChange={(event) => {
                setDistrict(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All Districts</option>
              {(districtOptions.data ?? villages.data?.districts ?? []).map(
                (name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="w-full sm:w-36">
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X size={14} />
              Clear
            </Button>
          )}
        </div>
        {districtOptions.error && !villages.error && (
          <ErrorState
            error={districtOptions.error}
            retry={() => void districtOptions.refetch()}
          />
        )}
        {villages.error ? (
          <ErrorState
            error={villages.error}
            retry={() => void villages.refetch()}
          />
        ) : villages.isPending ? (
          <div className="space-y-3 p-5" aria-label="Loading villages">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : !data.length ? (
          <EmptyState
            title="No villages found"
            description={
              hasFilters
                ? "Try a different search or clear your filters."
                : "Villages will appear here once they have been added."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">
                Village directory with coordinator assignments, user counts,
                nearby mappings and status
              </caption>
              <thead className="bg-slate-50 text-xs text-slate-500">
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th
                        key={header.id}
                        scope="col"
                        className="whitespace-nowrap px-5 py-3.5 font-semibold"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="text-slate-600">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-100 transition-colors hover:bg-emerald-50/30"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-5 py-4">
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
        {!villages.error && !villages.isPending && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
            <p role="status">
              Showing {total ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(currentPage * PAGE_SIZE, total)} of{" "}
              {total.toLocaleString("en-IN")} villages
            </p>
            <nav aria-label="Village pagination" className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                aria-label="Previous page"
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              {Array.from(
                { length: Math.min(5, pages) },
                (_, index) => firstPage + index,
              ).map((number) => (
                <Button
                  key={number}
                  variant={number === currentPage ? "default" : "outline"}
                  size="icon"
                  aria-label={`Page ${number}`}
                  aria-current={number === currentPage ? "page" : undefined}
                  onClick={() => setPage(number)}
                >
                  {number}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= pages}
                aria-label="Next page"
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </nav>
          </div>
        )}
      </div>
      {form && (
        <VillageForm
          key={form === "new" ? "new" : form.id}
          village={form === "new" ? undefined : form}
          onClose={() => {
            setForm(null);
            void client.invalidateQueries({ queryKey: ["admin-villages"] });
          }}
        />
      )}
      {deleting && (
        <VillageDeleteDialog
          village={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
