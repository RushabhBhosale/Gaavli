"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Plus, Search } from "lucide-react";
import {
  ProviderType,
  PROVIDER_MASTER_GROUPS,
  PROVIDER_MASTER_LABELS,
  PROVIDER_TYPE_LABELS,
  type ProviderMasterType,
} from "@gaavli/constants";
import {
  providerMasterCreateSchema,
  providerMasterUpdateSchema,
} from "@gaavli/validation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/shared/states";
import { api } from "@/lib/api";

type Master = {
  id: string;
  providerType: ProviderType;
  masterType: ProviderMasterType;
  code: string;
  name: { en: string; mr: string; hi: string };
  sortOrder: number;
  isActive: boolean;
  version: number;
};
type MasterPage = {
  records: Master[];
  total: number;
  page: number;
  limit: number;
  counts: { total: number; active: number; inactive: number };
};
const queryKey = "admin-provider-masters";

export function ProviderMasterManagement() {
  const [providerType, setProviderType] = useState(ProviderType.SHOP_BUSINESS);
  const [masterType, setMasterType] = useState<ProviderMasterType>("SHOP_TYPE");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [form, setForm] = useState<Master | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<Master | null>(null);
  const [notice, setNotice] = useState("");
  const client = useQueryClient();
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const params = new URLSearchParams({
    providerType,
    masterType,
    search: debounced,
    status,
    page: String(page),
    limit: "10",
    sort: sorting[0]?.id || "sortOrder",
    direction: sorting[0]?.desc ? "desc" : "asc",
  });
  const query = useQuery({
    queryKey: [
      queryKey,
      providerType,
      masterType,
      debounced,
      status,
      page,
      sorting,
    ],
    queryFn: ({ signal }) =>
      api<MasterPage>(`/v1/admin/provider-masters?${params}`, { signal }),
  });
  const statusChange = useMutation({
    mutationFn: (record: Master) =>
      api<Master>(`/v1/admin/provider-masters/${record.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          isActive: !record.isActive,
          version: record.version,
        }),
      }),
    onSuccess: async (record) => {
      setNotice(
        record.isActive
          ? "Master option activated."
          : "Master option deactivated.",
      );
      setDeactivating(null);
      await client.invalidateQueries({ queryKey: [queryKey] });
    },
  });
  const data = useMemo(() => query.data?.records ?? [], [query.data]);
  const columns: ColumnDef<Master>[] = [
    {
      accessorKey: "name.en",
      id: "name.en",
      header: "English Name",
      cell: ({ row }) => <span lang="en">{row.original.name.en}</span>,
    },
    {
      accessorKey: "name.mr",
      id: "name.mr",
      header: "Marathi Name",
      cell: ({ row }) => <span lang="mr">{row.original.name.mr}</span>,
    },
    {
      accessorKey: "name.hi",
      id: "name.hi",
      header: "Hindi Name",
      cell: ({ row }) => <span lang="hi">{row.original.name.hi}</span>,
    },
    {
      accessorKey: "code",
      header: "Unique Code",
      cell: ({ row }) => (
        <span className="break-all font-mono text-xs">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${row.original.isActive ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setForm(row.original)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={statusChange.isPending}
            onClick={() => {
              statusChange.reset();
              if (row.original.isActive) setDeactivating(row.original);
              else statusChange.mutate(row.original);
            }}
          >
            {row.original.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];
  // TanStack Table v8 owns its memoization; the React Compiler is not enabled.
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
  const current = query.data?.page ?? page;
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 10));
  return (
    <section className="card p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-medium text-emerald-700">
            Service Providers
          </p>
          <h1 className="text-xl font-bold">Master Management</h1>
        </div>
        <Button onClick={() => setForm("new")}>
          <Plus size={16} />
          Add New
        </Button>
      </div>
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800"
        >
          {notice}
        </p>
      )}
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="provider-type">Provider Type</label>
          <select
            id="provider-type"
            value={providerType}
            onChange={(event) => {
              const next = event.target.value as ProviderType;
              setProviderType(next);
              setMasterType(PROVIDER_MASTER_GROUPS[next][0]);
              setPage(1);
              setSearch("");
              setDebounced("");
              setSorting([]);
            }}
          >
            {Object.values(ProviderType).map((type) => (
              <option key={type} value={type}>
                {PROVIDER_TYPE_LABELS[type].en}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="master-status">Status</label>
          <select
            id="master-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      {PROVIDER_MASTER_GROUPS[providerType].length > 1 ? (
        <div
          role="tablist"
          aria-label="Master groups"
          className="mb-5 flex flex-wrap gap-2"
        >
          {PROVIDER_MASTER_GROUPS[providerType].map((group) => (
            <Button
              key={group}
              role="tab"
              aria-selected={masterType === group}
              variant={masterType === group ? "default" : "outline"}
              onClick={() => {
                setMasterType(group);
                setPage(1);
              }}
            >
              {PROVIDER_MASTER_LABELS[group]}
            </Button>
          ))}
        </div>
      ) : (
        <h2 className="mb-4 font-semibold">
          {PROVIDER_MASTER_LABELS[masterType]}
        </h2>
      )}
      <div className="relative mb-4">
        <Search
          size={17}
          aria-hidden="true"
          className="absolute left-3 top-3 text-slate-400"
        />
        <input
          aria-label="Search master names or code"
          placeholder="Search English, Marathi, Hindi or code…"
          maxLength={100}
          style={{ paddingLeft: 38 }}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {query.data && (
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-slate-50 px-3 py-2">
            Total: {query.data.counts.total}
          </span>
          <span className="rounded-lg bg-emerald-50 px-3 py-2">
            Active: {query.data.counts.active}
          </span>
          <span className="rounded-lg bg-amber-50 px-3 py-2">
            Inactive: {query.data.counts.inactive}
          </span>
        </div>
      )}
      {statusChange.error && !deactivating && (
        <p role="alert" className="field-error mb-4">
          {statusChange.error.message}
        </p>
      )}
      {query.isPending ? (
        <Skeleton className="h-56" />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !data.length ? (
        <EmptyState
          title="No master options found"
          description="Change the search or filters, or add a master option."
        />
      ) : (
        <div className="overflow-x-auto">
          <table
            className="w-full min-w-[850px] text-left text-sm"
            aria-label="Provider master options"
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
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-2 text-left"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <ArrowUpDown size={13} />
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
        <div className="mt-5 flex items-center justify-end gap-3 text-xs text-slate-500">
          <Button
            variant="outline"
            size="sm"
            disabled={current <= 1 || query.isFetching}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </Button>
          <span>
            Page {current} of {pages} · {query.data.total} matching
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={current >= pages || query.isFetching}
            onClick={() => setPage(current + 1)}
          >
            Next
          </Button>
        </div>
      )}
      {form && (
        <MasterForm
          key={form === "new" ? `${providerType}:${masterType}` : form.id}
          record={form === "new" ? null : form}
          providerType={providerType}
          masterType={masterType}
          onClose={() => setForm(null)}
          onSaved={() => setNotice("Master option saved.")}
        />
      )}
      <ConfirmDialog
        open={!!deactivating}
        onClose={() => {
          setDeactivating(null);
          statusChange.reset();
        }}
        onConfirm={() => {
          if (deactivating) statusChange.mutate(deactivating);
        }}
        title={`Deactivate ${deactivating?.name.en ?? "option"}?`}
        description="This option will be hidden from future registration dropdowns. Existing references will be retained."
        busy={statusChange.isPending}
        error={statusChange.error?.message}
      />
    </section>
  );
}

function MasterForm({
  record,
  providerType,
  masterType,
  onClose,
  onSaved,
}: {
  record: Master | null;
  providerType: ProviderType;
  masterType: ProviderMasterType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const client = useQueryClient();
  const [name, setName] = useState(record?.name ?? { en: "", mr: "", hi: "" });
  const [order, setOrder] = useState(String(record?.sortOrder ?? 0));
  const [isActive, setActive] = useState(record?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: () =>
      record
        ? api(`/v1/admin/provider-masters/${record.id}`, {
            method: "PATCH",
            body: JSON.stringify(
              providerMasterUpdateSchema.parse({
                name,
                sortOrder: order.trim() ? Number(order) : 0,
                version: record.version,
              }),
            ),
          })
        : api("/v1/admin/provider-masters", {
            method: "POST",
            body: JSON.stringify(
              providerMasterCreateSchema.parse({
                providerType,
                masterType,
                name,
                sortOrder: order.trim() ? Number(order) : 0,
                isActive,
              }),
            ),
          }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: [queryKey] });
      onSaved();
      onClose();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle className="text-xl font-bold">
          {record ? "Edit master option" : "Add master option"}
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-slate-500">
          {PROVIDER_TYPE_LABELS[providerType].en} ·{" "}
          {PROVIDER_MASTER_LABELS[masterType]}. Codes stay fixed after creation.
        </DialogDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const values = {
              name,
              sortOrder: order.trim() ? Number(order) : 0,
            };
            const parsed = record
              ? providerMasterUpdateSchema.safeParse({
                  ...values,
                  version: record.version,
                })
              : providerMasterCreateSchema.safeParse({
                  ...values,
                  providerType,
                  masterType,
                  isActive,
                });
            const fields: Record<string, string> = {};
            if (!parsed.success)
              for (const issue of parsed.error.issues)
                fields[issue.path.join(".")] = issue.message;
            setErrors(fields);
            if (parsed.success) save.mutate();
          }}
        >
          <fieldset disabled={save.isPending} className="space-y-4">
            {(["en", "mr", "hi"] as const).map((language) => (
              <div className="field" key={language}>
                <label htmlFor={`master-name-${language}`}>
                  {{ en: "English", mr: "Marathi", hi: "Hindi" }[language]} Name
                  *
                </label>
                <input
                  id={`master-name-${language}`}
                  lang={language}
                  value={name[language]}
                  required
                  maxLength={160}
                  aria-invalid={!!errors[`name.${language}`]}
                  aria-describedby={
                    errors[`name.${language}`] ? `error-${language}` : undefined
                  }
                  onChange={(event) =>
                    setName({ ...name, [language]: event.target.value })
                  }
                />
                {errors[`name.${language}`] && (
                  <p
                    id={`error-${language}`}
                    role="alert"
                    className="field-error"
                  >
                    {errors[`name.${language}`]}
                  </p>
                )}
              </div>
            ))}
            <div className="field">
              <label htmlFor="master-code">Unique Code</label>
              <input
                id="master-code"
                readOnly
                value={record?.code ?? "Generated automatically on save"}
              />
            </div>
            <div className="field">
              <label htmlFor="master-order">Sort Order</label>
              <input
                id="master-order"
                type="number"
                min={0}
                max={1000000}
                step={1}
                value={order}
                onChange={(event) => setOrder(event.target.value)}
              />
              {errors.sortOrder && (
                <p role="alert" className="field-error">
                  {errors.sortOrder}
                </p>
              )}
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                disabled={!!record}
                onChange={(event) => setActive(event.target.checked)}
              />
              Active
            </label>
            {record && (
              <p className="text-xs text-slate-500">
                Use Activate or Deactivate in the table to change status.
              </p>
            )}
          </fieldset>
          {save.error && (
            <p role="alert" className="field-error">
              {save.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
