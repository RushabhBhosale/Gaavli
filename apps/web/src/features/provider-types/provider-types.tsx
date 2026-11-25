"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ListTree, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/shared/badge";
import {
  FieldError,
  FormAlert,
  FormDialogFooter,
  FormDialogHeader,
  FormSaveButton,
  FormSection,
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
import {
  providerTypeOptionSchema,
  providerTypeOptionUpdateSchema,
} from "@/schemas";

type Option = {
  code: string;
  name: { en: string; mr: string; hi: string };
  sortOrder: number;
  isActive: boolean;
  version: number;
  builtIn: boolean;
};
type Page = { records: Option[]; total: number; page: number; limit: number };
type Status = "all" | "active" | "inactive";
const queryKey = "admin-provider-types";

export function ProviderTypeManagement() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [form, setForm] = useState<Option | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
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
  useSearchShortcut(searchRef);
  const params = new URLSearchParams({
    search: debounced,
    status,
    page: String(page),
    limit: String(pageSize),
    sort: sorting[0]?.id ?? "sortOrder",
    direction: sorting[0]?.desc ? "desc" : "asc",
  });
  const query = useQuery({
    queryKey: [queryKey, debounced, status, page, pageSize, sorting],
    queryFn: ({ signal }) => api<Page>(`/v1/admin/provider-types?${params}`, { signal }),
  });
  const data = useMemo(() => query.data?.records ?? [], [query.data]);
  const columns = useMemo<ColumnDef<Option>[]>(
    () => [
      {
        accessorKey: "name.en",
        id: "name.en",
        header: "Provider type",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p lang="en" className="max-w-64 truncate font-semibold text-slate-800">
              {row.original.name.en}
            </p>
            <p className="mt-0.5 break-all font-mono text-xs text-slate-500">
              {row.original.code}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "name.mr",
        id: "name.mr",
        header: "Marathi",
        cell: ({ row }) => (
          <span lang="mr" className="text-slate-600">
            {row.original.name.mr}
          </span>
        ),
      },
      {
        accessorKey: "name.hi",
        id: "name.hi",
        header: "Hindi",
        cell: ({ row }) => (
          <span lang="hi" className="text-slate-600">
            {row.original.name.hi}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={row.original.isActive ? "success" : "neutral"} dot>
            {row.original.isActive ? "Active" : "Inactive"}
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
              label={`Actions for ${row.original.name.en}`}
              items={[{ label: "Edit", onSelect: () => setForm(row.original) }]}
            />
          </div>
        ),
      },
    ],
    [],
  );
  // TanStack Table v8 owns its memoization; the React Compiler is not enabled.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.code,
    manualPagination: true,
    manualSorting: true,
    enableMultiSort: false,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
    },
  });
  const hasFilters = Boolean(debounced) || status !== "all";
  function clearFilters() {
    setSearch("");
    setDebounced("");
    setStatus("all");
    setPage(1);
  }
  const chips = [
    ...(status !== "all"
      ? [
          {
            label: `Status: ${status === "active" ? "Active" : "Inactive"}`,
            onRemove: () => {
              setStatus("all");
              setPage(1);
            },
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
  function renderProviderTypeRow(option: Option) {
    return (
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p lang="en" className="truncate font-semibold text-slate-800">
            {option.name.en}
          </p>
          <p lang="mr" className="mt-0.5 truncate text-xs text-slate-500">
            {option.name.mr}
          </p>
          <p lang="hi" className="truncate text-xs text-slate-500">
            {option.name.hi}
          </p>
          <p className="mt-1 break-all font-mono text-xs text-slate-400">
            {option.code}
          </p>
          <div className="mt-2">
            <Badge tone={option.isActive ? "success" : "neutral"} dot>
              {option.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <RowActions
          label={`Actions for ${option.name.en}`}
          items={[{ label: "Edit", onSelect: () => setForm(option) }]}
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
            label="Search provider types"
            placeholder="Search by name or code…"
            value={search}
            onChange={setSearch}
          />
        }
        actions={
          <Button
            size="sm"
            className="bg-[#B9520A] hover:bg-[#9E4508] focus-visible:outline-[#B9520A]"
            onClick={() => setForm("new")}
          >
            <Plus size={15} />
            Add provider type
          </Button>
        }
      />
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}
      <ListCard
        toolbar={
          <div className="w-full sm:ml-auto sm:w-44">
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as Status);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        }
        filters={<ListFilterBar items={chips} onClearAll={clearFilters} />}
        footer={
          <ListPagination
            page={query.data?.page ?? page}
            pageSize={pageSize}
            total={query.data?.total ?? 0}
            disabled={query.isPending}
            label="Provider type pagination"
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
                ? "No provider types match these filters"
                : "No provider types found"
            }
            description={
              hasFilters
                ? "Try a different name or code, or clear the filters to see every provider type."
                : "Add a provider type to make it available in Admin dropdowns."
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
            caption="Provider types with translated names, code and status"
            mobileRow={renderProviderTypeRow}
          />
        )}
      </ListCard>
      {form && (
        <ProviderTypeForm
          key={form === "new" ? "new" : form.code}
          option={form === "new" ? null : form}
          onClose={() => setForm(null)}
          onSaved={() => setNotice("Provider type saved.")}
        />
      )}
    </div>
  );
}

function ProviderTypeForm({
  option,
  onClose,
  onSaved,
}: {
  option: Option | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const client = useQueryClient();
  const [code, setCode] = useState(option?.code ?? "");
  const [name, setName] = useState(
    option?.name ?? { en: "", mr: "", hi: "" },
  );
  const [isActive, setActive] = useState(option?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: () => {
      // Sort order is no longer edited here; keep the stored value on edit and
      // let the schema default it to 0 for a new type.
      const sortOrder = option?.sortOrder ?? 0;
      return api(
        option ? `/v1/admin/provider-types/${option.code}` : "/v1/admin/provider-types",
        {
          method: option ? "PATCH" : "POST",
          body: JSON.stringify(
            option
              ? providerTypeOptionUpdateSchema.parse({
                  name,
                  sortOrder,
                  isActive,
                  version: option.version,
                })
              : providerTypeOptionSchema.parse({
                  code: code.trim().toUpperCase(),
                  name,
                  sortOrder,
                  isActive,
                }),
          ),
        },
      );
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: [queryKey] });
      onSaved();
      onClose();
    },
  });
  // Clear a field's message as soon as the admin edits that field.
  function updateName(language: "en" | "mr" | "hi", value: string) {
    setName((previous) => ({ ...previous, [language]: value }));
    setErrors((previous) =>
      previous[`name.${language}`]
        ? { ...previous, [`name.${language}`]: "" }
        : previous,
    );
  }
  function updateCode(value: string) {
    setCode(value.toUpperCase());
    setErrors((previous) => (previous.code ? { ...previous, code: "" } : previous));
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
          icon={<ListTree size={19} />}
          title={option ? "Edit provider type" : "Add provider type"}
          description={
            <>
              Manage the provider type labels shown in Admin dropdowns. Mobile
              registration is unchanged.
              {option ? " The code stays unchanged." : ""}
            </>
          }
        />
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const sortOrder = option?.sortOrder ?? 0;
            const values = {
              code: code.trim().toUpperCase(),
              name,
              sortOrder,
              isActive,
            };
            const parsed = option
              ? providerTypeOptionUpdateSchema.safeParse({
                  name: values.name,
                  sortOrder: values.sortOrder,
                  isActive: values.isActive,
                  version: option.version,
                })
              : providerTypeOptionSchema.safeParse(values);
            const fields: Record<string, string> = {};
            if (!parsed.success)
              for (const issue of parsed.error.issues)
                fields[issue.path.length ? issue.path.join(".") : "form"] =
                  issue.message;
            setErrors(fields);
            if (parsed.success) save.mutate();
          }}
        >
          <fieldset disabled={save.isPending} className="space-y-5">
            <FormSection title="Code" hint="Fixed after creation">
              <div className="field">
                <label htmlFor="provider-type-code">
                  Unique code <span className="text-red-500">*</span>
                </label>
                <input
                  id="provider-type-code"
                  className="font-mono"
                  placeholder="LOCAL_SERVICE"
                  value={option ? option.code : code}
                  required
                  readOnly={!!option}
                  maxLength={80}
                  aria-required
                  aria-invalid={!!errors.code}
                  aria-describedby={
                    errors.code
                      ? "provider-type-code-error"
                      : option
                        ? undefined
                        : "provider-type-code-help"
                  }
                  onChange={(event) => updateCode(event.target.value)}
                />
                {!option && !errors.code && (
                  <p id="provider-type-code-help" className="text-xs text-slate-400">
                    Uppercase letters, numbers and underscores.
                  </p>
                )}
                {errors.code && (
                  <FieldError id="provider-type-code-error">
                    {errors.code}
                  </FieldError>
                )}
              </div>
            </FormSection>
            <FormSection title="Names" hint="Required in all three languages">
              <div className="field">
                <label htmlFor="provider-type-name-en">
                  English name <span className="text-red-500">*</span>
                </label>
                <input
                  id="provider-type-name-en"
                  lang="en"
                  value={name.en}
                  required
                  maxLength={160}
                  aria-required
                  aria-invalid={!!errors["name.en"]}
                  aria-describedby={
                    errors["name.en"] ? "provider-type-name-en-error" : undefined
                  }
                  onChange={(event) => updateName("en", event.target.value)}
                />
                {errors["name.en"] && (
                  <FieldError id="provider-type-name-en-error">
                    {errors["name.en"]}
                  </FieldError>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                <div className="field">
                  <label htmlFor="provider-type-name-mr">
                    Marathi name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="provider-type-name-mr"
                    lang="mr"
                    value={name.mr}
                    required
                    maxLength={160}
                    aria-required
                    aria-invalid={!!errors["name.mr"]}
                    aria-describedby={
                      errors["name.mr"]
                        ? "provider-type-name-mr-error"
                        : undefined
                    }
                    onChange={(event) => updateName("mr", event.target.value)}
                  />
                  {errors["name.mr"] && (
                    <FieldError id="provider-type-name-mr-error">
                      {errors["name.mr"]}
                    </FieldError>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="provider-type-name-hi">
                    Hindi name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="provider-type-name-hi"
                    lang="hi"
                    value={name.hi}
                    required
                    maxLength={160}
                    aria-required
                    aria-invalid={!!errors["name.hi"]}
                    aria-describedby={
                      errors["name.hi"]
                        ? "provider-type-name-hi-error"
                        : undefined
                    }
                    onChange={(event) => updateName("hi", event.target.value)}
                  />
                  {errors["name.hi"] && (
                    <FieldError id="provider-type-name-hi-error">
                      {errors["name.hi"]}
                    </FieldError>
                  )}
                </div>
              </div>
            </FormSection>
            <FormSection title="Visibility">
              <label className="group flex cursor-pointer items-start rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50 has-[:checked]:border-emerald-600/40 has-[:checked]:bg-emerald-50/60">
                <span className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isActive}
                    className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-slate-300"
                    style={{ accentColor: "#087c50" }}
                    onChange={(event) => setActive(event.target.checked)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">
                      Active
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      Inactive types stay in existing records but are hidden from
                      Admin dropdowns.
                    </span>
                  </span>
                </span>
              </label>
            </FormSection>
          </fieldset>
          {errors.form && <FormAlert>{errors.form}</FormAlert>}
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
              {option ? "Save changes" : "Add provider type"}
            </FormSaveButton>
          </FormDialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
