"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { LISTING_PRODUCT_GROUPS } from "@gaavli/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { api } from "@/lib/api";
import { useSearchShortcut } from "@/lib/use-search-shortcut";
import { adminProductCreateSchema, adminProductUpdateSchema } from "@/schemas";

type Product = {
  id: string;
  code: string;
  nameEn: string;
  nameMr: string;
  nameHi: string | null;
  productGroup: string;
  defaultUnit: string;
  tagIds: string[];
  status: "ACTIVE" | "INACTIVE";
  activeListings: number;
  updatedAt: string;
};
type TagOption = { id: string; en: string; status: "ACTIVE" | "INACTIVE" };
type ProductsPage = {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  summary: { active: number; inactive: number };
};
const DEFAULT_PAGE_SIZE = 20;
const STATUS_TABS = [
  { key: "ACTIVE", label: "Active" },
  { key: "INACTIVE", label: "Inactive" },
] as const;
const groupLabel = (group: string) =>
  group.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());

// Product Master: the catalogue sellers pick from when adding a product.
// Admins search it, correct names, units and groups, and switch products
// on or off. Switching one off hides it from sellers' product search only.
export function ProductCatalogueManagement() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [group, setGroup] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useSearchShortcut(searchRef);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const params = new URLSearchParams({
    search: debounced,
    status,
    group,
    page: String(page),
    limit: String(pageSize),
  });
  const query = useQuery({
    queryKey: [
      "admin-product-catalogue",
      debounced,
      status,
      group,
      page,
      pageSize,
    ],
    queryFn: () => api<ProductsPage>("/v1/admin/product-catalogue?" + params),
  });
  const toggle = useMutation({
    mutationFn: (product: Product) =>
      api("/v1/admin/product-catalogue/" + product.id, {
        method: "PATCH",
        body: JSON.stringify({
          status: product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        }),
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["admin-product-catalogue"] }),
  });
  const rows = query.data?.products ?? [];
  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: "nameEn",
        header: "Product",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="max-w-64 truncate font-semibold text-slate-800">
              {row.original.nameEn}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{row.original.code}</p>
          </div>
        ),
      },
      {
        id: "names",
        header: "Marathi / Hindi",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p lang="mr" className="max-w-56 truncate text-slate-700">
              {row.original.nameMr}
            </p>
            <p
              lang="hi"
              className="mt-0.5 max-w-56 truncate text-xs text-slate-500"
            >
              {row.original.nameHi || "—"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "productGroup",
        header: "Group",
        cell: ({ row }) => (
          <span className="capitalize text-slate-600">
            {groupLabel(row.original.productGroup)}
          </span>
        ),
      },
      {
        accessorKey: "defaultUnit",
        header: "Unit",
        cell: ({ row }) => (
          <span className="text-slate-600">{row.original.defaultUnit}</span>
        ),
      },
      {
        accessorKey: "activeListings",
        header: "Live listings",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium text-slate-700">
            {row.original.activeListings.toLocaleString("en-IN")}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            tone={row.original.status === "ACTIVE" ? "success" : "neutral"}
            dot
          >
            {row.original.status === "ACTIVE" ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <RowActions
              label={"Actions for " + row.original.nameEn}
              items={[
                { label: "Edit", onSelect: () => setEditing(row.original) },
                {
                  label:
                    row.original.status === "ACTIVE"
                      ? "Deactivate"
                      : "Activate",
                  disabled:
                    toggle.isPending &&
                    toggle.variables?.id === row.original.id,
                  onSelect: () => toggle.mutate(row.original),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [toggle.isPending, toggle.mutate, toggle.variables?.id],
  );
  // TanStack Table v8 owns memoization; React Compiler is not enabled.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const hasFilters = Boolean(debounced) || group !== "all";
  function clearFilters() {
    setSearch("");
    setDebounced("");
    setGroup("all");
    setPage(1);
  }
  const filterChips: { label: string; onRemove: () => void }[] = [
    ...(debounced
      ? [
          {
            label: `Search: "${debounced}"`,
            onRemove: () => {
              setSearch("");
              setDebounced("");
              setPage(1);
            },
          },
        ]
      : []),
    ...(group !== "all"
      ? [
          {
            label: "Group: " + groupLabel(group),
            onRemove: () => {
              setGroup("all");
              setPage(1);
            },
          },
        ]
      : []),
  ];

  function renderProductRow(product: Product) {
    return (
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-800">
            {product.nameEn}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{product.code}</p>
          <p lang="mr" className="mt-2 truncate text-sm text-slate-700">
            {product.nameMr}
          </p>
          <p lang="hi" className="truncate text-xs text-slate-500">
            {product.nameHi || "—"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              {groupLabel(product.productGroup)} · {product.defaultUnit}
            </span>
            <Badge
              tone={product.status === "ACTIVE" ? "success" : "neutral"}
              dot
            >
              {product.status === "ACTIVE" ? "Active" : "Inactive"}
            </Badge>
            <span className="text-xs tabular-nums text-slate-500">
              {product.activeListings.toLocaleString("en-IN")} live listings
            </span>
          </div>
        </div>
        <RowActions
          label={"Actions for " + product.nameEn}
          items={[
            { label: "Edit", onSelect: () => setEditing(product) },
            {
              label: product.status === "ACTIVE" ? "Deactivate" : "Activate",
              disabled: toggle.isPending && toggle.variables?.id === product.id,
              onSelect: () => toggle.mutate(product),
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ListPageToolbar
        leading={
          <div
            role="tablist"
            aria-label="Filter by status"
            className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1"
          >
            {STATUS_TABS.map((tab) => {
              const active = status === tab.key;
              const count =
                tab.key === "ACTIVE"
                  ? query.data?.summary.active
                  : query.data?.summary.inactive;
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
                  onClick={() => {
                    setStatus(tab.key);
                    setPage(1);
                  }}
                >
                  {tab.label}{" "}
                  <span className={active ? "text-white/80" : "text-slate-400"}>
                    {count === undefined ? "–" : count.toLocaleString("en-IN")}
                  </span>
                </button>
              );
            })}
          </div>
        }
        search={
          <SearchField
            inputRef={searchRef}
            label="Search products"
            placeholder="Search by name or code…"
            value={search}
            onChange={setSearch}
          />
        }
        actions={
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div className="w-full sm:w-52">
            <select
              aria-label="Filter by group"
              value={group}
              onChange={(event) => {
                setGroup(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All groups</option>
              {LISTING_PRODUCT_GROUPS.map((value) => (
                <option key={value} value={value}>
                  {groupLabel(value)}
                </option>
              ))}
            </select>
            </div>
            <Button onClick={() => setAdding(true)}>Add product</Button>
          </div>
        }
      />
      <ListCard
        filters={
          <ListFilterBar items={filterChips} onClearAll={clearFilters} />
        }
        footer={
          <ListPagination
            page={query.data?.page ?? page}
            pageSize={query.data?.limit ?? pageSize}
            pageSizeOptions={[10, 20, 50]}
            total={query.data?.total ?? 0}
            disabled={query.isFetching}
            label="Product catalogue pagination"
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        }
      >
        {toggle.error && (
          <p role="alert" className="field-error px-4 pt-3">
            {toggle.error.message}
          </p>
        )}
        {query.error ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : query.isPending ? (
          <ListSkeleton rows={Math.min(pageSize, 8)} />
        ) : !rows.length ? (
          <EmptyState
            title={
              hasFilters
                ? "No products match these filters"
                : "No products found"
            }
            description={
              hasFilters
                ? "Try a different name, status or group, or clear the filters."
                : "Products sellers can pick when they add a listing."
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
            caption="Product catalogue with names, groups, units, active listings and status"
            mobileRow={renderProductRow}
          />
        )}
      </ListCard>
      {editing && (
        <ProductForm product={editing} onClose={() => setEditing(null)} />
      )}
      {adding && <ProductForm product={null} onClose={() => setAdding(false)} />}
    </div>
  );
}
// Adds a product (product = null) or edits one.
function ProductForm({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [input, setInput] = useState({
    nameEn: product?.nameEn ?? "",
    nameMr: product?.nameMr ?? "",
    nameHi: product?.nameHi ?? "",
    productGroup: product?.productGroup ?? LISTING_PRODUCT_GROUPS[0],
    defaultUnit: product?.defaultUnit ?? "kg",
    status: product?.status ?? ("ACTIVE" as Product["status"]),
    tagIds: product?.tagIds ?? [],
  });
  const [validation, setValidation] = useState("");
  const schema = product ? adminProductUpdateSchema : adminProductCreateSchema;
  const tags = useQuery({
    queryKey: ["admin-listing-tags"],
    queryFn: () => api<{ tags: TagOption[] }>("/v1/admin/listing-tags"),
  });
  const tagOptions = (tags.data?.tags ?? []).filter(
    (tag) => tag.status === "ACTIVE" || input.tagIds.includes(tag.id),
  );
  const body = () => ({ ...input, nameHi: input.nameHi.trim() || null });
  const save = useMutation({
    mutationFn: () =>
      api(
        product
          ? `/v1/admin/product-catalogue/${product.id}`
          : "/v1/admin/product-catalogue",
        {
          method: product ? "PUT" : "POST",
          body: JSON.stringify(schema.parse(body())),
        },
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin-product-catalogue"] });
      onClose();
    },
  });
  const field = (key: "nameEn" | "nameMr" | "nameHi" | "defaultUnit") => ({
    value: input[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setInput({ ...input, [key]: event.target.value }),
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
          {product ? "Edit product" : "Add product"}
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-slate-500">
          {product
            ? `Code ${product.code} stays unchanged. Listings already made from this product keep their own names.`
            : "The product appears in sellers' product search as soon as it is active. A code is made from the English name."}
        </DialogDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const result = schema.safeParse(body());
            setValidation(
              result.success
                ? ""
                : (result.error.issues[0]?.message ??
                    "Check the product details."),
            );
            if (result.success) save.mutate();
          }}
        >
          <fieldset disabled={save.isPending} className="space-y-4">
            <div className="field">
              <label htmlFor="product-name-en">Name (English)</label>
              <input
                id="product-name-en"
                required
                maxLength={120}
                {...field("nameEn")}
              />
            </div>
            <div className="field">
              <label htmlFor="product-name-mr">Name (Marathi)</label>
              <input
                id="product-name-mr"
                lang="mr"
                required
                maxLength={120}
                {...field("nameMr")}
              />
            </div>
            <div className="field">
              <label htmlFor="product-name-hi">Name (Hindi)</label>
              <input
                id="product-name-hi"
                lang="hi"
                maxLength={120}
                {...field("nameHi")}
              />
            </div>
            <div className="field">
              <label htmlFor="product-group">Group</label>
              <select
                id="product-group"
                value={input.productGroup}
                onChange={(event) =>
                  setInput({ ...input, productGroup: event.target.value })
                }
              >
                {LISTING_PRODUCT_GROUPS.map((value) => (
                  <option key={value} value={value}>
                    {groupLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="product-unit">Default unit</label>
              <input
                id="product-unit"
                required
                maxLength={30}
                {...field("defaultUnit")}
              />
            </div>
            <div className="field">
              <label htmlFor="product-status">Status</label>
              <select
                id="product-status"
                value={input.status}
                onChange={(event) =>
                  setInput({
                    ...input,
                    status: event.target.value as Product["status"],
                  })
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="field">
              <span id="product-tags-label">Extra tags</span>
              <p className="text-xs text-slate-500">
                Sellers always see the tags set for the group. Tick more to
                offer them for this product only.
              </p>
              <div
                role="group"
                aria-labelledby="product-tags-label"
                className="choice-group"
              >
                {tagOptions.map((tag) => {
                  const on = input.tagIds.includes(tag.id);
                  return (
                    <label key={tag.id} className="choice-chip">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setInput({
                            ...input,
                            tagIds: on
                              ? input.tagIds.filter((id) => id !== tag.id)
                              : [...input.tagIds, tag.id],
                          })
                        }
                      />
                      {tag.en}
                    </label>
                  );
                })}
                {!tagOptions.length && (
                  <span className="text-xs text-slate-500">
                    {tags.isPending ? "Loading tags…" : "No tags yet."}
                  </span>
                )}
              </div>
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
              {save.isPending ? "Saving…" : product ? "Save changes" : "Add product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
