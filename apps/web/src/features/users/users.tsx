"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Plus,
  MoreVertical,
  Search,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Counts, UserDto, UsersPage, VillageDto } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/shared/list-pagination";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { EmptyState, ErrorState, Skeleton } from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { UserForm } from "./user-form";
import { UserBulkActions } from "./user-bulk-actions";
export function UsersManagement() {
  const client = useQueryClient();
  const [role, setRole] = useState(""),
    [village, setVillage] = useState(""),
    [status, setStatus] = useState(""),
    [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10),
    [form, setForm] = useState<UserDto | "new" | null>(null),
    [confirm, setConfirm] = useState<UserDto | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [selection, setSelection] = useState({});
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
      setSelection({});
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...(role ? { role } : {}),
    ...(village ? { village } : {}),
    ...(status ? { status } : {}),
    ...(debounced ? { search: debounced } : {}),
    sort: sorting[0]?.id ?? "createdAt",
    direction: sorting[0]?.desc ? "desc" : "asc",
  });
  const users = useQuery({
    queryKey: [
      "users",
      role,
      village,
      status,
      debounced,
      page,
      pageSize,
      sorting,
    ],
    queryFn: () => api<UsersPage>(`/users?${query}`),
  });
  const counts = useQuery({
    queryKey: ["counts"],
    queryFn: () => api<Counts>("/users/counts"),
  });
  const villages = useQuery({
    queryKey: ["villages"],
    queryFn: () => api<VillageDto[]>("/villages"),
  });
  const changeStatus = useMutation({
    mutationFn: (user: UserDto) =>
      api(`/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: user.status === "blocked" ? "active" : "blocked",
          version: user.version,
        }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["users"] });
      setConfirm(null);
    },
  });
  const columns = useMemo<ColumnDef<UserDto>[]>(
    () => [
      // Selection stays in place for a later bulk-actions pass.
      // {
      //   id: "select",
      //   header: ({ table }) => (
      //     <input
      //       type="checkbox"
      //       aria-label="Select all users on this page"
      //       checked={table.getIsAllRowsSelected()}
      //       onChange={table.getToggleAllRowsSelectedHandler()}
      //     />
      //   ),
      //   cell: ({ row }) => (
      //     <input
      //       type="checkbox"
      //       aria-label={`Select ${row.original.name}`}
      //       checked={row.getIsSelected()}
      //       onChange={row.getToggleSelectedHandler()}
      //     />
      //   ),
      // },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-800">
              {row.original.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span className="font-semibold text-slate-700">
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        id: "roles",
        header: "Role",
        cell: ({ row }) => (
          <div className="flex gap-1">
            {["seller", "buyer", "coordinator"]
              .filter((r) => row.original.roles.includes(r))
              .map((r) => (
                <span
                  key={r}
                  className={`rounded px-2 py-1 text-[10px] font-medium ${r === "seller" ? "bg-emerald-50 text-emerald-700" : r === "coordinator" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-600"}`}
                >
                  {r === "seller"
                    ? "Seller"
                    : r === "coordinator"
                      ? "Coordinator"
                      : "Buyer"}
                </span>
              ))}
          </div>
        ),
      },
      { accessorKey: "mobile", header: "Mobile Number" },
      {
        id: "village",
        header: "Village",
        cell: ({ row }) =>
          row.original.roles.includes("coordinator")
            ? row.original.coordinatorVillages?.map((v) => v.name).join(", ") ||
              "—"
            : row.original.village?.name || "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={`rounded px-2 py-1 text-[10px] font-semibold capitalize ${row.original.status === "active" ? "bg-green-100 text-green-700" : row.original.status === "blocked" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Joined On",
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
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
              <DropdownMenuItem onSelect={() => setForm(row.original)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  changeStatus.reset();
                  setConfirm(row.original);
                }}
              >
                {row.original.status === "blocked" ? "Unblock" : "Block"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [changeStatus],
  );
  // React Compiler is not enabled; TanStack Table v8 owns its memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: users.data?.users || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    onRowSelectionChange: setSelection,
    enableRowSelection: true,
    manualPagination: true,
    manualSorting: true,
    enableMultiSort: false,
    state: { rowSelection: selection, sorting },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
      setSelection({});
    },
  });
  const total = users.data?.total || 0;
  function filter(action: () => void) {
    action();
    setPage(1);
    setSelection({});
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <UserBulkActions filters={{ role, village, status, search: debounced }}>
          <Button
            size="sm"
            disabled={!villages.data?.length}
            onClick={() => setForm("new")}
          >
            <Plus size={15} />
            Add User
          </Button>
        </UserBulkActions>
      </div>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div
            role="tablist"
            aria-label="User roles"
            className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1"
          >
            {[
              // { key: "", label: "All", count: counts.data?.all },
              { key: "seller", label: "Sellers", count: counts.data?.seller },
              { key: "buyer", label: "Buyers", count: counts.data?.buyer },
              {
                key: "coordinator",
                label: "Coordinators",
                count: counts.data?.coordinator,
              },
            ].map((tab) => (
              <button
                role="tab"
                aria-selected={role === tab.key}
                key={tab.key}
                className={`rounded px-3 py-2 text-xs font-semibold ${role === tab.key ? "bg-emerald-800 text-white" : "text-slate-500 hover:bg-slate-200"}`}
                onClick={() => filter(() => setRole(tab.key))}
              >
                {tab.label} ({tab.count?.toLocaleString("en-IN") ?? "…"})
              </button>
            ))}
          </div>
          <div className="relative min-w-44 flex-1">
            <Search
              size={15}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              aria-label="Search by name or mobile"
              placeholder="Search name or mobile..."
              style={{ paddingLeft: 34 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-40">
            <select
              aria-label="Filter by village"
              value={village}
              onChange={(e) => filter(() => setVillage(e.target.value))}
            >
              <option value="">All Villages</option>
              {villages.data?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => filter(() => setStatus(e.target.value))}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
        {counts.error && (
          <ErrorState
            error={counts.error}
            retry={() => void counts.refetch()}
          />
        )}
        {villages.error && (
          <ErrorState
            error={villages.error}
            retry={() => void villages.refetch()}
          />
        )}
        {users.error ? (
          <ErrorState error={users.error} retry={() => void users.refetch()} />
        ) : users.isPending ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: Math.min(pageSize, 8) }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !users.data?.users.length ? (
          <EmptyState
            title="No users found"
            description="Try a different search or filter, or add your first user."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] text-slate-500">
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
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
                        className="whitespace-nowrap px-4 py-3 font-semibold"
                      >
                        {header.column.getCanSort() ? (
                          <button
                            className="flex items-center gap-1.5 text-left"
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
              <tbody className="text-slate-500">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-t border-slate-100 hover:bg-emerald-50/30 ${row.getIsSelected() ? "bg-emerald-50/50" : ""}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="whitespace-nowrap px-4 py-3">
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
        <ListPagination
          page={page}
          pageSize={pageSize}
          total={total}
          disabled={users.isPending}
          label="User pagination"
          onPageChange={(next) => {
            setPage(next);
            setSelection({});
          }}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
            setSelection({});
          }}
        />
      </div>
      {form && (
        <UserForm
          key={form === "new" ? "new" : form.id}
          user={form === "new" ? undefined : form}
          villages={villages.data || []}
          onClose={() => setForm(null)}
        />
      )}
      <ConfirmDialog
        open={!!confirm}
        title={`${confirm?.status === "blocked" ? "Unblock" : "Block"} ${confirm?.name || "user"}?`}
        onClose={() => setConfirm(null)}
        busy={changeStatus.isPending}
        error={changeStatus.error?.message}
        onConfirm={() => {
          if (confirm) changeStatus.mutate(confirm);
        }}
      />
    </div>
  );
}
