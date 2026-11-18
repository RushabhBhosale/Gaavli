"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  FieldError,
  FormAlert,
  FormDialogFooter,
  FormDialogHeader,
  FormSaveButton,
} from "@/components/shared/form-dialog";
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
import type { AdminCategoryDto, CategoriesPage } from "@/lib/contracts";
import { categorySchema } from "@/schemas";

const modes = {
  daily_digest: "Daily digest",
  change_only: "Change only",
  weekly_digest: "Weekly digest",
};

function CategoryIdentity({ category }: { category: AdminCategoryDto }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FEF3EA] text-[#A84E0D]"
        aria-hidden="true"
      >
        <Tag size={17} />
      </span>
      <div className="min-w-0">
        <p className="max-w-56 truncate font-semibold text-slate-800">
          {category.name}
        </p>
        <p className="mt-0.5 max-w-56 truncate text-xs text-slate-500">
          {category.nameMr}
        </p>
      </div>
    </div>
  );
}

export function CategoriesManagement() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AdminCategoryDto | null>(null);
  const [deleting, setDeleting] = useState<AdminCategoryDto | null>(null);
  const client = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useSearchShortcut(searchRef);
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    search: debounced,
    sort: sorting[0]?.id ?? "sortOrder",
    direction: sorting[0]?.desc ? "desc" : "asc",
  });
  const query = useQuery({
    queryKey: ["admin-categories", debounced, page, pageSize, sorting],
    queryFn: () => api<CategoriesPage>(`/v1/admin/categories?${params}`),
  });
  const data = useMemo(() => query.data?.categories ?? [], [query.data]);
  const columns = useMemo<ColumnDef<AdminCategoryDto>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Category",
        cell: ({ row }) => <CategoryIdentity category={row.original} />,
      },
      {
        accessorKey: "defaultShelfLife",
        header: "Default shelf life",
        cell: ({ row }) => (
          <span className="text-slate-600">
            {row.original.defaultShelfLife}
          </span>
        ),
      },
      {
        accessorKey: "notifyMode",
        header: "Notify mode",
        cell: ({ row }) => (
          <span className="text-slate-600">
            {modes[row.original.notifyMode]}
          </span>
        ),
      },
      {
        accessorKey: "activeListings",
        header: "Active listings",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium text-slate-700">
            {row.original.activeListings.toLocaleString("en-IN")}
          </span>
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
                { label: "Edit", onSelect: () => setEditing(row.original) },
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
  const remove = useMutation({
    mutationFn: (category: AdminCategoryDto) =>
      api(`/v1/admin/categories/${category.id}`, {
        method: "DELETE",
        body: JSON.stringify({ version: category.version }),
      }),
    onSuccess: async () => {
      setDeleting(null);
      await client.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });
  const hasFilters = Boolean(debounced);
  function clearFilters() {
    setSearch("");
    setDebounced("");
    setPage(1);
  }
  const chips = debounced
    ? [
        {
          label: `Search: “${debounced}”`,
          onRemove: clearFilters,
        },
      ]
    : [];
  function renderCategoryRow(category: AdminCategoryDto) {
    return (
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <CategoryIdentity category={category} />
          <p className="mt-2 truncate text-xs text-slate-500">
            Shelf life: {category.defaultShelfLife}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500">
              {modes[category.notifyMode]}
            </span>
            <span className="text-xs tabular-nums text-slate-500">
              {category.activeListings.toLocaleString("en-IN")} active listings
            </span>
          </div>
        </div>
        <RowActions
          label={`Actions for ${category.name}`}
          items={[
            { label: "Edit", onSelect: () => setEditing(category) },
            { label: "Delete", onSelect: () => setDeleting(category) },
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
            label="Search by category name"
            placeholder="Search by category name…"
            value={search}
            onChange={setSearch}
          />
        }
        actions={
          <Button
            size="sm"
            className="bg-[#B9520A] hover:bg-[#9E4508] focus-visible:outline-[#B9520A]"
            onClick={() => setAdding(true)}
          >
            <Plus size={15} />
            Add category
          </Button>
        }
      />
      <ListCard
        filters={<ListFilterBar items={chips} onClearAll={clearFilters} />}
        footer={
          <ListPagination
            page={query.data?.page ?? page}
            pageSize={pageSize}
            total={query.data?.total ?? 0}
            disabled={query.isPending}
            label="Category pagination"
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        }
      >
        {query.error ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : query.isPending ? (
          <ListSkeleton rows={Math.min(pageSize, 8)} />
        ) : !data.length ? (
          <EmptyState
            title={
              hasFilters
                ? "No categories match these filters"
                : "No categories found"
            }
            description={
              hasFilters
                ? "Try a different category name, or clear the filters to see every category."
                : "Add a category to configure its shelf life and notification mode."
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            table={table}
            caption="Categories with default shelf life, notification mode and active listings"
            mobileRow={renderCategoryRow}
          />
        )}
      </ListCard>
      {adding && <CategoryForm onClose={() => setAdding(false)} />}
      {editing && (
        <CategoryForm category={editing} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name || "category"}?`}
        description="Categories used by listings stay in place. This only removes a category with no listings."
        confirmLabel="Delete"
        busyLabel="Deleting…"
        busy={remove.isPending}
        error={remove.error?.message}
        onClose={() => {
          setDeleting(null);
          remove.reset();
        }}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting);
        }}
      />
    </div>
  );
}

function CategoryForm({
  category,
  onClose,
}: {
  category?: AdminCategoryDto;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [input, setInput] = useState({
    code: category?.code ?? "",
    name: category?.name ?? "",
    nameMr: category?.nameMr ?? "",
    defaultShelfLife: category?.defaultShelfLife ?? "",
    notifyMode: (category?.notifyMode ?? "daily_digest") as string,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: () => {
      const parsed = categorySchema.parse(input);
      return api(
        category
          ? `/v1/admin/categories/${category.id}`
          : "/v1/admin/categories",
        {
          method: category ? "PUT" : "POST",
          body: JSON.stringify(
            category
              ? {
                  name: parsed.name,
                  nameMr: parsed.nameMr,
                  defaultShelfLife: parsed.defaultShelfLife,
                  notifyMode: parsed.notifyMode,
                  version: category.version,
                }
              : parsed,
          ),
        },
      );
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin-categories"] });
      onClose();
    },
  });
  // Clear a field's message as soon as the admin edits that field.
  function update(key: keyof typeof input, value: string) {
    setInput((previous) => ({ ...previous, [key]: value }));
    setFieldErrors((previous) =>
      previous[key] ? { ...previous, [key]: "" } : previous,
    );
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <FormDialogHeader
          icon={<Tag size={19} />}
          title={category ? "Edit category" : "Add category"}
          description={
            <>
              Set the category name, default shelf life and notification mode.
              {category ? " The category code stays unchanged." : ""}
            </>
          }
        />
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const result = categorySchema.safeParse(input);
            if (!result.success) {
              const next: Record<string, string> = {};
              for (const issue of result.error.issues)
                next[String(issue.path[0] ?? "form")] = issue.message;
              setFieldErrors(next);
              return;
            }
            setFieldErrors({});
            save.mutate();
          }}
        >
          <fieldset disabled={save.isPending} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
              <div className="field">
                <label htmlFor="category-name">
                  Category name <span className="text-red-500">*</span>
                </label>
                <input
                  id="category-name"
                  value={input.name}
                  required
                  maxLength={100}
                  aria-required
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={
                    fieldErrors.name ? "category-name-error" : undefined
                  }
                  onChange={(event) => update("name", event.target.value)}
                />
                {fieldErrors.name && (
                  <FieldError id="category-name-error">
                    {fieldErrors.name}
                  </FieldError>
                )}
              </div>
              <div className="field">
                <label htmlFor="category-name-mr">
                  Category name (Marathi){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="category-name-mr"
                  lang="mr"
                  value={input.nameMr}
                  required
                  maxLength={100}
                  aria-required
                  aria-invalid={!!fieldErrors.nameMr}
                  aria-describedby={
                    fieldErrors.nameMr ? "category-name-mr-error" : undefined
                  }
                  onChange={(event) => update("nameMr", event.target.value)}
                />
                {fieldErrors.nameMr && (
                  <FieldError id="category-name-mr-error">
                    {fieldErrors.nameMr}
                  </FieldError>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
              <div className="field">
                <label htmlFor="category-code">
                  Category code <span className="text-red-500">*</span>
                </label>
                <input
                  id="category-code"
                  className="font-mono"
                  placeholder="PERISHABLE"
                  value={input.code}
                  required
                  readOnly={!!category}
                  maxLength={40}
                  aria-required
                  aria-invalid={!!fieldErrors.code}
                  aria-describedby={
                    fieldErrors.code
                      ? "category-code-error"
                      : category
                        ? undefined
                        : "category-code-help"
                  }
                  onChange={(event) =>
                    update("code", event.target.value.toUpperCase())
                  }
                />
                {!category && !fieldErrors.code && (
                  <p id="category-code-help" className="text-xs text-slate-400">
                    Uppercase letters, numbers and underscores.
                  </p>
                )}
                {fieldErrors.code && (
                  <FieldError id="category-code-error">
                    {fieldErrors.code}
                  </FieldError>
                )}
              </div>
              <div className="field">
                <label htmlFor="category-shelf-life">
                  Default shelf life <span className="text-red-500">*</span>
                </label>
                <input
                  id="category-shelf-life"
                  placeholder="e.g. 1–2 days or Standing"
                  value={input.defaultShelfLife}
                  required
                  maxLength={100}
                  aria-required
                  aria-invalid={!!fieldErrors.defaultShelfLife}
                  aria-describedby={
                    fieldErrors.defaultShelfLife
                      ? "category-shelf-life-error"
                      : undefined
                  }
                  onChange={(event) =>
                    update("defaultShelfLife", event.target.value)
                  }
                />
                {fieldErrors.defaultShelfLife && (
                  <FieldError id="category-shelf-life-error">
                    {fieldErrors.defaultShelfLife}
                  </FieldError>
                )}
              </div>
            </div>
            <div className="field">
              <label htmlFor="category-notify-mode">Notify mode</label>
              <select
                id="category-notify-mode"
                value={input.notifyMode}
                aria-invalid={!!fieldErrors.notifyMode}
                aria-describedby={
                  fieldErrors.notifyMode
                    ? "category-notify-mode-error"
                    : undefined
                }
                onChange={(event) => update("notifyMode", event.target.value)}
              >
                {Object.entries(modes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {fieldErrors.notifyMode && (
                <FieldError id="category-notify-mode-error">
                  {fieldErrors.notifyMode}
                </FieldError>
              )}
            </div>
          </fieldset>
          {fieldErrors.form && <FormAlert>{fieldErrors.form}</FormAlert>}
          {save.error && <FormAlert>{save.error.message}</FormAlert>}
          <FormDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <FormSaveButton saving={save.isPending}>
              {category ? "Save changes" : "Add category"}
            </FormSaveButton>
          </FormDialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
