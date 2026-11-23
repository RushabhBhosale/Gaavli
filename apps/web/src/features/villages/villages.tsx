"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { MapPin, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { useSearchShortcut } from "@/lib/use-search-shortcut";
import type { AdminVillageDto, VillagesPage } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/shared/badge";
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
import { VillageForm } from "./village-form";
import { VillageBulkActions } from "./village-bulk-actions";
import { VillageDeleteDialog } from "./village-delete-dialog";

const STATUS_FILTERS = [
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
] as const;

function coordinatorLabel(village: AdminVillageDto) {
  if (village.coordinators === null) return "Not configured";
  if (!village.coordinators.length) return "Unassigned";
  return village.coordinators.map((item) => item.name).join(", ");
}

function locationLabel(village: AdminVillageDto) {
  const place =
    [village.taluka, village.district].filter(Boolean).join(", ") ||
    village.nameMr;
  return village.pinCode ? `${place} · PIN ${village.pinCode}` : place;
}

function StatusBadge({ status }: { status: AdminVillageDto["status"] }) {
  return (
    <Badge tone={status === "active" ? "success" : "neutral"} dot>
      {status === "active" ? "Active" : "Inactive"}
    </Badge>
  );
}

function VillageIdentity({
  village,
  onEdit,
}: {
  village: AdminVillageDto;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FEF3EA] text-[#A84E0D]"
        aria-hidden="true"
      >
        <MapPin size={18} />
      </span>
      <div className="min-w-0">
        {onEdit ? (
          <button
            className="block max-w-56 truncate text-left font-semibold text-slate-800 hover:text-[#A84E0D] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9520A]"
            aria-label={`Edit ${village.name}`}
            onClick={onEdit}
          >
            {village.name}
          </button>
        ) : (
          <p className="max-w-56 truncate font-semibold text-slate-800">
            {village.name}
          </p>
        )}
        <p className="mt-0.5 max-w-56 truncate text-xs text-slate-500">
          {locationLabel(village)}
        </p>
      </div>
    </div>
  );
}

export function VillagesManagement() {
  const client = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState<AdminVillageDto | null>(null);
  const [form, setForm] = useState<AdminVillageDto | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useSearchShortcut(searchRef);
  const query = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(debounced ? { search: debounced } : {}),
    ...(district ? { district } : {}),
    ...(status ? { status } : {}),
    sort: sorting[0]?.id ?? "name",
    direction: sorting[0]?.desc ? "desc" : "asc",
  });
  const villages = useQuery({
    queryKey: [
      "admin-villages",
      debounced,
      district,
      status,
      page,
      pageSize,
      sorting,
    ],
    queryFn: () => api<VillagesPage>(`/v1/admin/villages?${query}`),
  });
  // Retain district choices while a new filtered page is loading.
  const districtOptions = useQuery({
    queryKey: ["admin-villages", "district-options"],
    queryFn: () => api<VillagesPage>("/v1/admin/villages?limit=1"),
    select: (data) => data.districts,
  });
  const data = useMemo(() => villages.data?.villages ?? [], [villages.data]);
  const columns = useMemo<ColumnDef<AdminVillageDto>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Village",
        cell: ({ row }) => (
          <VillageIdentity
            village={row.original}
            onEdit={() => setForm(row.original)}
          />
        ),
      },
      {
        id: "coordinator",
        header: "Assigned Coordinators",
        cell: ({ row }) => {
          const label = coordinatorLabel(row.original);
          const muted =
            row.original.coordinators === null ||
            !row.original.coordinators.length;
          return (
            <span
              className={`block max-w-56 truncate ${muted ? "text-slate-400" : "text-slate-600"}`}
              title={label}
            >
              {label}
            </span>
          );
        },
      },
      {
        accessorKey: "users",
        header: "Users",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium text-slate-700">
            {row.original.users.toLocaleString("en-IN")}
          </span>
        ),
      },
      // Nearby Mapped stays defined for a later mapping view.
      // {
      //   accessorKey: "nearbyMapped",
      //   header: "Nearby Mapped",
      //   cell: ({ row }) =>
      //     row.original.nearbyMapped === null ? (
      //       <span className="text-xs text-slate-400">Not configured</span>
      //     ) : (
      //       <span className="tabular-nums">
      //         {row.original.nearbyMapped.toLocaleString("en-IN")} villages
      //       </span>
      //     ),
      // },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex w-full justify-center">
            <RowActions
              label={`Actions for ${row.original.name}`}
              items={[
                { label: "Edit", onSelect: () => setForm(row.original) },
                { label: "Delete", onSelect: () => setDeleting(row.original) },
              ]}
            />
          </div>
        ),
      },
    ],
    [],
  );
  // React Compiler is not enabled; TanStack Table v8 owns its memoization.
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
  const total = villages.data?.total ?? 0;
  const hasFilters = Boolean(debounced || district || status);
  function filter(action: () => void) {
    action();
    setPage(1);
  }
  function clearFilters() {
    filter(() => {
      setSearch("");
      setDebounced("");
      setDistrict("");
      setStatus("");
    });
  }
  const chips = [
    ...(status
      ? [
          {
            label: `Status: ${status === "active" ? "Active" : "Inactive"}`,
            onRemove: () => filter(() => setStatus("")),
          },
        ]
      : []),
    ...(district
      ? [
          {
            label: `District: ${district}`,
            onRemove: () => filter(() => setDistrict("")),
          },
        ]
      : []),
    ...(debounced
      ? [
          {
            label: `Search: “${debounced}”`,
            onRemove: () => {
              setSearch("");
              setDebounced("");
              setPage(1);
            },
          },
        ]
      : []),
  ];
  function renderVillageRow(village: AdminVillageDto) {
    return (
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <VillageIdentity village={village} />
          <p className="mt-2 truncate text-xs text-slate-500">
            {coordinatorLabel(village)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={village.status} />
            <span className="text-xs tabular-nums text-slate-500">
              {village.users.toLocaleString("en-IN")} users
            </span>
          </div>
        </div>
        <RowActions
          label={`Actions for ${village.name}`}
          items={[
            { label: "Edit", onSelect: () => setForm(village) },
            { label: "Delete", onSelect: () => setDeleting(village) },
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
            label="Search village, taluka, district or PIN"
            placeholder="Search village, taluka, district or PIN…"
            value={search}
            onChange={setSearch}
          />
        }
        actions={
          <VillageBulkActions filters={{ search: debounced, district, status }}>
            <Button
              size="sm"
              className="bg-[#B9520A] hover:bg-[#9E4508] focus-visible:outline-[#B9520A]"
              onClick={() => setForm("new")}
            >
              <Plus size={15} />
              Add Village
            </Button>
          </VillageBulkActions>
        }
      />
      <ListCard
        toolbar={
          <>
            <div
              role="group"
              aria-label="Filter by status"
              className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1"
            >
              {STATUS_FILTERS.map((tab) => {
                const active = status === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={active}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9520A] ${
                      active
                        ? "bg-[#B9520A] text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    onClick={() =>
                      filter(() => setStatus(active ? "" : tab.key))
                    }
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="w-full sm:ml-auto sm:w-44">
              <select
                aria-label="Filter by district"
                value={district}
                onChange={(event) =>
                  filter(() => setDistrict(event.target.value))
                }
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
          </>
        }
        filters={<ListFilterBar items={chips} onClearAll={clearFilters} />}
        footer={
          <ListPagination
            page={villages.data?.page ?? page}
            pageSize={pageSize}
            total={total}
            disabled={villages.isPending}
            label="Village pagination"
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        }
      >
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
          <ListSkeleton rows={Math.min(pageSize, 8)} />
        ) : !data.length ? (
          <EmptyState
            title={
              hasFilters ? "No villages match these filters" : "No villages yet"
            }
            description={
              hasFilters
                ? "Try a different search, or clear the filters to see every village."
                : "Add a village, or import a CSV to create several at once."
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
            caption="Village directory with coordinator assignments, user counts and status"
            mobileRow={renderVillageRow}
          />
        )}
      </ListCard>
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
