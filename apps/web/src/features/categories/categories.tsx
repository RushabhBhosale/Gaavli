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
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/shared/states";
import { api } from "@/lib/api";
import type { AdminCategoryDto, CategoriesPage } from "@/lib/contracts";
import { categorySchema } from "@/schemas";

const modes = {
  daily_digest: "Daily digest",
  change_only: "Change only",
  weekly_digest: "Weekly digest",
};
const columns: ColumnDef<AdminCategoryDto>[] = [
  { accessorKey: "name", header: "Category" },
  { accessorKey: "defaultShelfLife", header: "Default shelf life" },
  {
    accessorKey: "notifyMode",
    header: "Notify mode",
    cell: ({ row }) => modes[row.original.notifyMode],
  },
  {
    accessorKey: "activeListings",
    header: "Active listings",
    cell: ({ row }) => row.original.activeListings.toLocaleString("en-IN"),
  },
];

export function CategoriesManagement() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({
    page: String(page),
    limit: "10",
    search: debounced,
    sort: sorting[0]?.id ?? "sortOrder",
    direction: sorting[0]?.desc ? "desc" : "asc",
  });
  const query = useQuery({
    queryKey: ["admin-categories", debounced, page, sorting],
    queryFn: () => api<CategoriesPage>(`/v1/admin/categories?${params}`),
  });
  const data = useMemo(() => query.data?.categories ?? [], [query.data]);
  // React Compiler is not enabled; TanStack Table v8 owns its memoization.
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
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 10));
  return (
    <section className="card min-h-[460px] p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Categories &amp; notify rules</h1>
        <Button
          onClick={() => setAdding(true)}
          className="bg-slate-900 hover:bg-slate-800"
        >
          <Plus size={16} />
          Add category
        </Button>
      </div>
      <div className="relative mb-5">
        <Search
          size={17}
          aria-hidden="true"
          className="absolute left-3 top-3 text-slate-400"
        />
        <input
          aria-label="Search by category name"
          placeholder="Search by category name..."
          maxLength={100}
          style={{ paddingLeft: 38 }}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {query.isPending ? (
        <Skeleton className="h-56" />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !data.length ? (
        <EmptyState
          title="No categories found"
          description={
            debounced
              ? "Try a different category name."
              : "Add a category to configure its shelf life and notification mode."
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[600px] text-left text-sm"
              aria-label="Categories and notification rules"
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
                        className="px-3 py-3 text-xs font-semibold uppercase text-slate-500"
                      >
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
          {pages > 1 && (
            <div className="mt-5 flex items-center justify-end gap-3 text-xs text-slate-500">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || query.isFetching}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span>
                Page {currentPage} of {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pages || query.isFetching}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
      {adding && <CategoryForm onClose={() => setAdding(false)} />}
    </section>
  );
}

function CategoryForm({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [input, setInput] = useState({
    code: "",
    name: "",
    nameMr: "",
    defaultShelfLife: "",
    notifyMode: "daily_digest",
  });
  const [validation, setValidation] = useState("");
  const save = useMutation({
    mutationFn: () =>
      api("/v1/admin/categories", {
        method: "POST",
        body: JSON.stringify(categorySchema.parse(input)),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin-categories"] });
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
        <DialogTitle className="text-xl font-bold">Add category</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-slate-500">
          Set the category name, default shelf life and notification mode.
        </DialogDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const result = categorySchema.safeParse(input);
            setValidation(
              result.success
                ? ""
                : (result.error.issues[0]?.message ??
                    "Check the category details."),
            );
            if (result.success) save.mutate();
          }}
        >
          <fieldset disabled={save.isPending} className="space-y-4">
            <div className="field">
              <label htmlFor="category-name">Category name</label>
              <input
                id="category-name"
                value={input.name}
                required
                maxLength={100}
                onChange={(event) =>
                  setInput({ ...input, name: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="category-name-mr">Category name (Marathi)</label>
              <input
                id="category-name-mr"
                lang="mr"
                value={input.nameMr}
                required
                maxLength={100}
                onChange={(event) =>
                  setInput({ ...input, nameMr: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="category-code">Category code</label>
              <input
                id="category-code"
                placeholder="PERISHABLE"
                value={input.code}
                required
                maxLength={40}
                onChange={(event) =>
                  setInput({ ...input, code: event.target.value.toUpperCase() })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="category-shelf-life">Default shelf life</label>
              <input
                id="category-shelf-life"
                placeholder="e.g. 1–2 days or Standing"
                value={input.defaultShelfLife}
                required
                maxLength={100}
                onChange={(event) =>
                  setInput({ ...input, defaultShelfLife: event.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="category-notify-mode">Notify mode</label>
              <select
                id="category-notify-mode"
                value={input.notifyMode}
                onChange={(event) =>
                  setInput({ ...input, notifyMode: event.target.value })
                }
              >
                {Object.entries(modes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
          {(validation || save.error) && (
            <p role="alert" className="field-error">
              {validation || save.error?.message}
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
              {save.isPending ? "Saving…" : "Add category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
