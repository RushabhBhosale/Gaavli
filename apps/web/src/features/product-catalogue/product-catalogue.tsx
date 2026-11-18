"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { LISTING_PRODUCT_GROUPS } from "@gaavli/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/shared/states";
import { api } from "@/lib/api";
import { adminProductUpdateSchema } from "@/schemas";

type Product = {
  id: string;
  code: string;
  nameEn: string;
  nameMr: string;
  nameHi: string | null;
  productGroup: string;
  defaultUnit: string;
  status: "ACTIVE" | "INACTIVE";
  activeListings: number;
  updatedAt: string;
};
type ProductsPage = {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  summary: { active: number; inactive: number };
};
const LIMIT = 20;
const groupLabel = (group: string) =>
  group.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());

// Product Master: the catalogue sellers pick from when adding a product.
// Admins search it, correct names, units and groups, and switch products
// on or off. Switching one off hides it from sellers' product search only.
export function ProductCatalogueManagement() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [group, setGroup] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | null>(null);
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
    limit: String(LIMIT),
  });
  const query = useQuery({
    queryKey: ["admin-product-catalogue", debounced, status, group, page],
    queryFn: () => api<ProductsPage>(`/v1/admin/product-catalogue?${params}`),
  });
  const toggle = useMutation({
    mutationFn: (product: Product) =>
      api(`/v1/admin/product-catalogue/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        }),
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["admin-product-catalogue"] }),
  });
  const rows = query.data?.products ?? [];
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / LIMIT));
  const currentPage = query.data?.page ?? page;
  return (
    <section className="card min-h-[460px] p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Product Catalogue</h1>
          <p className="mt-1 text-sm text-slate-500">
            {query.data
              ? `${query.data.summary.active.toLocaleString("en-IN")} active · ${query.data.summary.inactive.toLocaleString("en-IN")} inactive`
              : "Products sellers can pick when they add a listing."}
          </p>
        </div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px_200px]">
        <div className="relative">
          <Search
            size={17}
            aria-hidden="true"
            className="absolute left-3 top-3 text-slate-400"
          />
          <input
            aria-label="Search products"
            placeholder="Search by name or code..."
            maxLength={100}
            style={{ paddingLeft: 38 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
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
      {toggle.error && (
        <p role="alert" className="field-error mb-3">
          {toggle.error.message}
        </p>
      )}
      {query.isPending ? (
        <Skeleton className="h-56" />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !rows.length ? (
        <EmptyState
          title="No products found"
          description="Try a different name, status or group."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[820px] text-left text-sm"
              aria-label="Product catalogue"
            >
              <thead>
                <tr className="border-b border-slate-300 text-xs font-semibold uppercase text-slate-500">
                  <th scope="col" className="px-3 py-3">Product</th>
                  <th scope="col" className="px-3 py-3">Marathi / Hindi</th>
                  <th scope="col" className="px-3 py-3">Group</th>
                  <th scope="col" className="px-3 py-3">Unit</th>
                  <th scope="col" className="px-3 py-3">Live listings</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-slate-200 hover:bg-slate-50"
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium">{product.nameEn}</div>
                      <div className="text-xs text-slate-500">
                        {product.code}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div lang="mr">{product.nameMr}</div>
                      <div lang="hi" className="text-xs text-slate-500">
                        {product.nameHi || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {groupLabel(product.productGroup)}
                    </td>
                    <td className="px-3 py-3">{product.defaultUnit}</td>
                    <td className="px-3 py-3">
                      {product.activeListings.toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {product.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(product)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={
                            toggle.isPending &&
                            toggle.variables?.id === product.id
                          }
                          onClick={() => toggle.mutate(product)}
                        >
                          {product.status === "ACTIVE"
                            ? "Deactivate"
                            : "Activate"}
                        </Button>
                      </div>
                    </td>
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
      {editing && (
        <ProductForm product={editing} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}

function ProductForm({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [input, setInput] = useState({
    nameEn: product.nameEn,
    nameMr: product.nameMr,
    nameHi: product.nameHi ?? "",
    productGroup: product.productGroup,
    defaultUnit: product.defaultUnit,
    status: product.status,
  });
  const [validation, setValidation] = useState("");
  const body = () => ({ ...input, nameHi: input.nameHi.trim() || null });
  const save = useMutation({
    mutationFn: () =>
      api(`/v1/admin/product-catalogue/${product.id}`, {
        method: "PUT",
        body: JSON.stringify(adminProductUpdateSchema.parse(body())),
      }),
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
        <DialogTitle className="text-xl font-bold">Edit product</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-slate-500">
          Code {product.code} stays unchanged. Listings already made from this
          product keep their own names.
        </DialogDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const result = adminProductUpdateSchema.safeParse(body());
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
              <input id="product-name-en" required maxLength={120} {...field("nameEn")} />
            </div>
            <div className="field">
              <label htmlFor="product-name-mr">Name (Marathi)</label>
              <input id="product-name-mr" lang="mr" required maxLength={120} {...field("nameMr")} />
            </div>
            <div className="field">
              <label htmlFor="product-name-hi">Name (Hindi)</label>
              <input id="product-name-hi" lang="hi" maxLength={120} {...field("nameHi")} />
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
              <input id="product-unit" required maxLength={30} {...field("defaultUnit")} />
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
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
