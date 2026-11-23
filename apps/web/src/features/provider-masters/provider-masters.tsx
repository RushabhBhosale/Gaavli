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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { ProviderMasterBulkActions } from "./provider-master-bulk-actions";

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
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [form, setForm] = useState<Master | "new" | null>(null);
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
  const providerTypeOptions = useQuery({
    queryKey: ["admin-provider-types"],
    queryFn: () => api<{ records: { code: string; name: { en: string }; isActive: boolean; sortOrder: number }[] }>("/v1/admin/provider-types"),
  });
  const providerTypeLabel = (type: ProviderType) =>
    providerTypeOptions.data?.records.find((row) => row.code === type)?.name.en ?? PROVIDER_TYPE_LABELS[type].en;
  const providerTypeChoices = providerTypeOptions.data?.records
    .filter((row) =>
      Object.values(ProviderType).includes(row.code as ProviderType) &&
      (row.isActive || row.code === providerType),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => row.code as ProviderType) ?? Object.values(ProviderType);
  const params = new URLSearchParams({
    providerType,
    masterType,
    search: debounced,
    status,
    page: String(page),
    limit: String(pageSize),
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
      pageSize,
      sorting,
    ],
    queryFn: ({ signal }) =>
      api<MasterPage>(`/v1/admin/provider-masters?${params}`, { signal }),
  });
  const data = useMemo(() => query.data?.records ?? [], [query.data]);
  const columns: ColumnDef<Master>[] = [
    {
      accessorKey: "name.en",
      id: "name.en",
      header: "English Name",
      cell: ({ row }) => (
        <span lang="en" className="font-semibold text-slate-800">
          {row.original.name.en}
        </span>
      ),
    },
    {
      accessorKey: "name.mr",
      id: "name.mr",
      header: "Marathi Name",
      cell: ({ row }) => (
        <span lang="mr" className="text-slate-600">
          {row.original.name.mr}
        </span>
      ),
    },
    {
      accessorKey: "name.hi",
      id: "name.hi",
      header: "Hindi Name",
      cell: ({ row }) => (
        <span lang="hi" className="text-slate-600">
          {row.original.name.hi}
        </span>
      ),
    },
    {
      accessorKey: "code",
      header: "Unique Code",
      cell: ({ row }) => (
        <span className="break-all font-mono text-xs text-slate-500">
          {row.original.code}
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
  function renderMasterRow(master: Master) {
    return (
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p lang="en" className="truncate font-semibold text-slate-800">
            {master.name.en}
          </p>
          <p lang="mr" className="mt-0.5 truncate text-xs text-slate-500">
            {master.name.mr}
          </p>
          <p lang="hi" className="truncate text-xs text-slate-500">
            {master.name.hi}
          </p>
          <p className="mt-1 break-all font-mono text-xs text-slate-400">
            {master.code}
          </p>
          <div className="mt-2">
            <Badge tone={master.isActive ? "success" : "neutral"} dot>
              {master.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <RowActions
          label={`Actions for ${master.name.en}`}
          items={[{ label: "Edit", onSelect: () => setForm(master) }]}
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
            label="Search master names or code"
            placeholder="Search English, Marathi, Hindi or code…"
            value={search}
            onChange={setSearch}
          />
        }
        actions={
          <ProviderMasterBulkActions
            filters={{
              providerType,
              masterType,
              search: debounced,
              status,
              sort: sorting[0]?.id || "sortOrder",
              direction: sorting[0]?.desc ? "desc" : "asc",
            }}
          >
            <Button
              size="sm"
              onClick={() => setForm("new")}
              className="bg-[#B9520A] hover:bg-[#9E4508] focus-visible:outline-[#B9520A]"
            >
              <Plus size={15} />
              Add New
            </Button>
          </ProviderMasterBulkActions>
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
          <>
            {PROVIDER_MASTER_GROUPS[providerType].length > 1 ? (
              <div
                role="tablist"
                aria-label="Master groups"
                className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1"
              >
                {PROVIDER_MASTER_GROUPS[providerType].map((group) => {
                  const active = masterType === group;
                  return (
                    <button
                      key={group}
                      role="tab"
                      type="button"
                      aria-selected={active}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9520A] ${
                        active
                          ? "bg-[#B9520A] text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      onClick={() => {
                        setMasterType(group);
                        setPage(1);
                      }}
                    >
                      {PROVIDER_MASTER_LABELS[group]}
                    </button>
                  );
                })}
              </div>
            ) : (
              <h2 className="text-sm font-semibold text-slate-700">
                {PROVIDER_MASTER_LABELS[masterType]}
              </h2>
            )}
            <div className="w-full sm:ml-auto sm:w-52">
              <select
                aria-label="Filter by provider type"
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
                {providerTypeChoices.map((type) => (
                  <option key={type} value={type}>
                    {providerTypeLabel(type)}
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
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </>
        }
        filters={<ListFilterBar items={chips} onClearAll={clearFilters} />}
        footer={
          <ListPagination
            page={current}
            pageSize={pageSize}
            total={query.data?.total ?? 0}
            disabled={query.isPending}
            label="Provider master pagination"
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        }
      >
        {query.data && (
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-4 py-2.5 text-xs text-slate-500">
            <span>
              Total{" "}
              <b className="tabular-nums font-semibold text-slate-700">
                {query.data.counts.total.toLocaleString("en-IN")}
              </b>
            </span>
            <span>
              Active{" "}
              <b className="tabular-nums font-semibold text-emerald-700">
                {query.data.counts.active.toLocaleString("en-IN")}
              </b>
            </span>
            <span>
              Inactive{" "}
              <b className="tabular-nums font-semibold text-amber-700">
                {query.data.counts.inactive.toLocaleString("en-IN")}
              </b>
            </span>
          </div>
        )}
        {query.error ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : query.isPending ? (
          <ListSkeleton rows={Math.min(pageSize, 8)} />
        ) : !data.length ? (
          <EmptyState
            title={
              hasFilters
                ? "No master options match these filters"
                : "No master options found"
            }
            description={
              hasFilters
                ? "Try a different search, or clear the filters to see every option."
                : "Change the search or filters, or add a master option."
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
            caption="Provider master options with names, code and status"
            mobileRow={renderMasterRow}
          />
        )}
      </ListCard>
      {form && (
        <MasterForm
          key={form === "new" ? `${providerType}:${masterType}` : form.id}
          record={form === "new" ? null : form}
          providerType={providerType}
          providerTypeLabel={providerTypeLabel(providerType)}
          masterType={masterType}
          onClose={() => setForm(null)}
          onSaved={() => setNotice("Master option saved.")}
        />
      )}
    </div>
  );
}

function MasterForm({
  record,
  providerType,
  providerTypeLabel,
  masterType,
  onClose,
  onSaved,
}: {
  record: Master | null;
  providerType: ProviderType;
  providerTypeLabel: string;
  masterType: ProviderMasterType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const client = useQueryClient();
  const [name, setName] = useState(record?.name ?? { en: "", mr: "", hi: "" });
  const [order, setOrder] = useState(String(record?.sortOrder ?? 0));
  const [isActive, setActive] = useState(record?.isActive ?? true);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
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
                isActive,
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
  // Clear a language's message as soon as that name is edited.
  function updateName(language: "en" | "mr" | "hi", value: string) {
    setName((previous) => ({ ...previous, [language]: value }));
    setErrors((previous) =>
      previous[`name.${language}`]
        ? { ...previous, [`name.${language}`]: "" }
        : previous,
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
          icon={<ListTree size={19} />}
          title={record ? "Edit master option" : "Add master option"}
          description={
            <>
              {providerTypeLabel} ·{" "}
              {PROVIDER_MASTER_LABELS[masterType]}. Codes stay fixed after
              creation.
            </>
          }
        />
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const values = {
              name,
              sortOrder: order.trim() ? Number(order) : 0,
            };
            const parsed = record
              ? providerMasterUpdateSchema.safeParse({
                  ...values,
                  isActive,
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
          <fieldset disabled={save.isPending} className="space-y-5">
            <FormSection title="Names" hint="Required in all three languages">
              <div className="field">
                <label htmlFor="master-name-en">
                  English Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="master-name-en"
                  lang="en"
                  value={name.en}
                  required
                  maxLength={160}
                  aria-required
                  aria-invalid={!!errors["name.en"]}
                  aria-describedby={errors["name.en"] ? "error-en" : undefined}
                  onChange={(event) => updateName("en", event.target.value)}
                />
                {errors["name.en"] && (
                  <FieldError id="error-en">{errors["name.en"]}</FieldError>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                <div className="field">
                  <label htmlFor="master-name-mr">
                    Marathi Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="master-name-mr"
                    lang="mr"
                    value={name.mr}
                    required
                    maxLength={160}
                    aria-required
                    aria-invalid={!!errors["name.mr"]}
                    aria-describedby={
                      errors["name.mr"] ? "error-mr" : undefined
                    }
                    onChange={(event) => updateName("mr", event.target.value)}
                  />
                  {errors["name.mr"] && (
                    <FieldError id="error-mr">{errors["name.mr"]}</FieldError>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="master-name-hi">
                    Hindi Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="master-name-hi"
                    lang="hi"
                    value={name.hi}
                    required
                    maxLength={160}
                    aria-required
                    aria-invalid={!!errors["name.hi"]}
                    aria-describedby={
                      errors["name.hi"] ? "error-hi" : undefined
                    }
                    onChange={(event) => updateName("hi", event.target.value)}
                  />
                  {errors["name.hi"] && (
                    <FieldError id="error-hi">{errors["name.hi"]}</FieldError>
                  )}
                </div>
              </div>
            </FormSection>
            <FormSection title="Ordering and visibility">
              <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                <div className="field">
                  <label htmlFor="master-code">Unique Code</label>
                  <input
                    id="master-code"
                    className="font-mono"
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
                    aria-invalid={!!errors.sortOrder}
                    aria-describedby={
                      errors.sortOrder ? "error-sort-order" : undefined
                    }
                    onChange={(event) => setOrder(event.target.value)}
                  />
                  {errors.sortOrder && (
                    <FieldError id="error-sort-order">
                      {errors.sortOrder}
                    </FieldError>
                  )}
                </div>
              </div>
              <label className="group flex cursor-pointer items-start rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50 has-[:checked]:border-emerald-600/40 has-[:checked]:bg-emerald-50/60">
                <span className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isActive}
                    className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-slate-300"
                    style={{ accentColor: "#087c50" }}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      if (record && isActive && !checked) {
                        setConfirmDeactivate(true);
                        return;
                      }
                      setActive(checked);
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">
                      Active
                    </span>
                    {record && (
                      <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                        Deactivating hides this option from future registration
                        dropdowns. Existing references are retained.
                      </span>
                    )}
                  </span>
                </span>
              </label>
            </FormSection>
          </fieldset>
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
            <FormSaveButton saving={save.isPending}>Save</FormSaveButton>
          </FormDialogFooter>
        </form>
      </DialogContent>
      <ConfirmDialog
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={() => {
          setActive(false);
          setConfirmDeactivate(false);
        }}
        title={`Deactivate ${record?.name.en ?? "option"}?`}
        description="This option will be hidden from future registration dropdowns. Existing references will be retained."
        confirmLabel="Deactivate"
        busy={false}
      />
    </Dialog>
  );
}
