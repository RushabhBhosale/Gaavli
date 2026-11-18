"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { useSearchShortcut } from "@/lib/use-search-shortcut";
import type { Counts, UserDto, UsersPage, VillageDto } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/shared/badge";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { UserForm } from "./user-form";
import { UserBulkActions } from "./user-bulk-actions";

const ROLE_LABELS: Record<string, string> = {
  seller: "Seller",
  buyer: "Buyer",
  coordinator: "Coordinator",
};
// Order is stable so a user with several roles always renders the same pills.
// Provider (service_provider) is managed from Provider Profiles, not here.
const ROLE_ORDER = ["seller", "buyer", "coordinator"];
const ROLE_TABS = [
  { key: "seller", label: "Sellers" },
  { key: "buyer", label: "Buyers" },
  { key: "coordinator", label: "Coordinators" },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function statusTone(status: string): BadgeTone {
  if (status === "active") return "success";
  if (status === "blocked") return "danger";
  return "warning";
}
function villageLabel(user: UserDto) {
  if (user.roles.includes("coordinator")) {
    return user.coordinatorVillages?.map((v) => v.name).join(", ") || "—";
  }
  return user.village?.name || "—";
}
function formatJoined(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function UserIdentity({ user }: { user: UserDto }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FEF3EA] text-[11px] font-bold text-[#A84E0D]"
      >
        {initials(user.name)}
      </span>
      <span className="font-semibold text-slate-800">{user.name}</span>
    </div>
  );
}

function RoleBadges({ roles }: { roles: string[] }) {
  const present = ROLE_ORDER.filter((role) => roles.includes(role));
  if (!present.length) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {present.map((role) => (
        <Badge key={role} tone="neutral">
          {ROLE_LABELS[role] ?? role}
        </Badge>
      ))}
    </div>
  );
}

export function UsersManagement() {
  const client = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
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
  useSearchShortcut(searchRef);
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
  const openBlock = useCallback(
    (user: UserDto) => {
      changeStatus.reset();
      setConfirm(user);
    },
    [changeStatus],
  );
  const columns = useMemo<ColumnDef<UserDto>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <UserIdentity user={row.original} />,
      },
      {
        id: "roles",
        header: "Role",
        cell: ({ row }) => <RoleBadges roles={row.original.roles} />,
      },
      {
        accessorKey: "mobile",
        header: "Mobile Number",
        cell: ({ row }) => (
          <span className="tabular-nums text-slate-600">
            {row.original.mobile}
          </span>
        ),
      },
      {
        id: "village",
        header: "Village",
        cell: ({ row }) => {
          const label = villageLabel(row.original);
          return (
            <span
              className="block max-w-56 truncate text-slate-600"
              title={label}
            >
              {label}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={statusTone(row.original.status)} dot>
            <span className="capitalize">{row.original.status}</span>
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Joined On",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-slate-500">
            {formatJoined(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex w-full justify-center">
            <RowActions
              label={`Actions for ${row.original.name}`}
              items={[
                {
                  label: "Edit",
                  onSelect: () => setForm(row.original),
                },
                {
                  label:
                    row.original.status === "blocked" ? "Unblock" : "Block",
                  onSelect: () => openBlock(row.original),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [openBlock],
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
  const hasFilters = Boolean(role || village || status || debounced);
  const villageName =
    villages.data?.find((item) => item.id === village)?.name ?? "";
  const roleLabel =
    ROLE_TABS.find((tab) => tab.key === role)?.label ?? "Selected role";
  function filter(action: () => void) {
    action();
    setPage(1);
    setSelection({});
  }
  function clearFilters() {
    filter(() => {
      setRole("");
      setVillage("");
      setStatus("");
      setSearch("");
      setDebounced("");
    });
  }
  const chips = [
    ...(role
      ? [
          {
            label: `Role: ${roleLabel}`,
            onRemove: () => filter(() => setRole("")),
          },
        ]
      : []),
    ...(village
      ? [
          {
            label: `Village: ${villageName || "selected"}`,
            onRemove: () => filter(() => setVillage("")),
          },
        ]
      : []),
    ...(status
      ? [
          {
            label: `Status: ${status}`,
            onRemove: () => filter(() => setStatus("")),
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
              setSelection({});
            },
          },
        ]
      : []),
  ];
  function renderUserRow(user: UserDto) {
    return (
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <UserIdentity user={user} />
          <p className="mt-1 text-xs tabular-nums text-slate-500">
            {user.mobile}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {villageLabel(user)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <RoleBadges roles={user.roles} />
            <Badge tone={statusTone(user.status)} dot>
              <span className="capitalize">{user.status}</span>
            </Badge>
          </div>
        </div>
        <RowActions
          label={`Actions for ${user.name}`}
          items={[
            { label: "Edit", onSelect: () => setForm(user) },
            {
              label: user.status === "blocked" ? "Unblock" : "Block",
              onSelect: () => openBlock(user),
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
            label="Search by name or mobile"
            placeholder="Search name or mobile…"
            value={search}
            onChange={setSearch}
          />
        }
        actions={
          <UserBulkActions
            filters={{ role, village, status, search: debounced }}
          >
            <Button
              size="sm"
              className="bg-[#B9520A] hover:bg-[#9E4508] focus-visible:outline-[#B9520A]"
              disabled={!villages.data?.length}
              onClick={() => setForm("new")}
            >
              <Plus size={15} />
              Add User
            </Button>
          </UserBulkActions>
        }
      />
      <ListCard
        toolbar={
          <>
            <div
              role="tablist"
              aria-label="Filter by role"
              className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1"
            >
              {ROLE_TABS.map((tab) => {
                const count = counts.data?.[tab.key];
                const active = role === tab.key;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    type="button"
                    aria-selected={active}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9520A] ${
                      active
                        ? "bg-[#B9520A] text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    onClick={() => filter(() => setRole(tab.key))}
                  >
                    {tab.label}{" "}
                    <span
                      className={active ? "text-white/80" : "text-slate-400"}
                    >
                      {count?.toLocaleString("en-IN") ?? "…"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="w-full sm:ml-auto sm:w-44">
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
            <div className="w-full sm:w-36">
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
          </>
        }
        filters={<ListFilterBar items={chips} onClearAll={clearFilters} />}
        footer={
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
        }
      >
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
          <ListSkeleton rows={Math.min(pageSize, 8)} />
        ) : !users.data?.users.length ? (
          <EmptyState
            title={hasFilters ? "No users match these filters" : "No users yet"}
            description={
              hasFilters
                ? "Try a different search, or clear the filters to see everyone."
                : "Add your first user, or import a CSV to create several at once."
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
            caption="Users with role, mobile number, village, status and join date"
            mobileRow={renderUserRow}
          />
        )}
      </ListCard>
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
