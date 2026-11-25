"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  adminListingTagCreateSchema,
  adminListingTagUpdateSchema,
} from "@/schemas";

type Tag = {
  id: string;
  en: string;
  mr: string;
  hi: string;
  groups: string[];
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
  products: number;
};
const groupLabel = (group: string) =>
  group.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());

// The tags sellers can put on a listing. Admins add tags, correct their
// names in each language, choose which product groups offer them and switch
// them off. Products can also get extra tags from the Product Catalogue.
// Listings that already carry a switched-off tag keep showing it.
export function ListingTagsManagement() {
  const client = useQueryClient();
  const [editing, setEditing] = useState<Tag | null>(null);
  const [adding, setAdding] = useState(false);
  const query = useQuery({
    queryKey: ["admin-listing-tags"],
    queryFn: () => api<{ tags: Tag[] }>("/v1/admin/listing-tags"),
  });
  const toggle = useMutation({
    mutationFn: (tag: Tag) =>
      api(`/v1/admin/listing-tags/${tag.id}`, {
        method: "PUT",
        body: JSON.stringify(
          adminListingTagUpdateSchema.parse({
            en: tag.en,
            mr: tag.mr,
            hi: tag.hi,
            groups: tag.groups,
            status: tag.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
          }),
        ),
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["admin-listing-tags"] }),
  });
  const rows = query.data?.tags ?? [];
  return (
    <section className="card min-h-[320px] p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Product Tags</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sellers pick up to 5 of these on a listing. Buyers see them on the
            product.
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>Add tag</Button>
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
          title="No tags yet"
          description="Add a tag to offer it to sellers."
        />
      ) : (
        <div className="overflow-x-auto">
          <table
            className="w-full min-w-[820px] text-left text-sm"
            aria-label="Product tags"
          >
            <thead>
              <tr className="border-b border-slate-300 text-xs font-semibold uppercase text-slate-500">
                <th scope="col" className="px-3 py-3">Tag</th>
                <th scope="col" className="px-3 py-3">Marathi / Hindi</th>
                <th scope="col" className="px-3 py-3">Offered for groups</th>
                <th scope="col" className="px-3 py-3">Products</th>
                <th scope="col" className="px-3 py-3">Status</th>
                <th scope="col" className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tag) => (
                <tr
                  key={tag.id}
                  className="border-b border-slate-200 hover:bg-slate-50"
                >
                  <td className="px-3 py-3">
                    <div className="font-medium">{tag.en}</div>
                    <div className="text-xs text-slate-500">{tag.id}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div lang="mr">{tag.mr}</div>
                    <div lang="hi" className="text-xs text-slate-500">
                      {tag.hi}
                    </div>
                  </td>
                  <td className="max-w-[260px] px-3 py-3 text-xs text-slate-600">
                    {tag.groups.length
                      ? tag.groups.map(groupLabel).join(", ")
                      : "—"}
                  </td>
                  <td className="px-3 py-3">{tag.products}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tag.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      {tag.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(tag)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={
                          toggle.isPending && toggle.variables?.id === tag.id
                        }
                        onClick={() => toggle.mutate(tag)}
                      >
                        {tag.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <TagForm tag={editing} onClose={() => setEditing(null)} />}
      {adding && <TagForm tag={null} onClose={() => setAdding(false)} />}
    </section>
  );
}

function TagForm({ tag, onClose }: { tag: Tag | null; onClose: () => void }) {
  const client = useQueryClient();
  const [input, setInput] = useState({
    en: tag?.en ?? "",
    mr: tag?.mr ?? "",
    hi: tag?.hi ?? "",
    groups: tag?.groups ?? ([] as string[]),
    status: tag?.status ?? ("ACTIVE" as Tag["status"]),
  });
  const [validation, setValidation] = useState("");
  const schema = tag ? adminListingTagUpdateSchema : adminListingTagCreateSchema;
  const save = useMutation({
    mutationFn: () =>
      api(
        tag ? `/v1/admin/listing-tags/${tag.id}` : "/v1/admin/listing-tags",
        {
          method: tag ? "PUT" : "POST",
          body: JSON.stringify(schema.parse(input)),
        },
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin-listing-tags"] });
      onClose();
    },
  });
  const text = (key: "en" | "mr" | "hi") => ({
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
          {tag ? "Edit tag" : "Add tag"}
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-slate-500">
          {tag
            ? `Id ${tag.id} stays unchanged. Listings keep the tag when you rename it.`
            : "An id is made from the English name and cannot change later."}
        </DialogDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const result = schema.safeParse(input);
            setValidation(
              result.success
                ? ""
                : (result.error.issues[0]?.message ?? "Check the tag details."),
            );
            if (result.success) save.mutate();
          }}
        >
          <fieldset disabled={save.isPending} className="space-y-4">
            <div className="field">
              <label htmlFor="tag-en">Name (English)</label>
              <input id="tag-en" required maxLength={40} {...text("en")} />
            </div>
            <div className="field">
              <label htmlFor="tag-mr">Name (Marathi)</label>
              <input id="tag-mr" lang="mr" required maxLength={40} {...text("mr")} />
            </div>
            <div className="field">
              <label htmlFor="tag-hi">Name (Hindi)</label>
              <input id="tag-hi" lang="hi" required maxLength={40} {...text("hi")} />
            </div>
            <div className="field">
              <span id="tag-groups-label">Offer for these product groups</span>
              <div
                role="group"
                aria-labelledby="tag-groups-label"
                className="mt-2 flex flex-wrap gap-2"
              >
                {LISTING_PRODUCT_GROUPS.map((group) => {
                  const on = input.groups.includes(group);
                  return (
                    <label
                      key={group}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm ${on ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-300"}`}
                    >
                      <input
                        type="checkbox"
                        className="!w-auto"
                        checked={on}
                        onChange={() =>
                          setInput({
                            ...input,
                            groups: on
                              ? input.groups.filter((item) => item !== group)
                              : [...input.groups, group],
                          })
                        }
                      />
                      {groupLabel(group)}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="field">
              <label htmlFor="tag-status">Status</label>
              <select
                id="tag-status"
                value={input.status}
                onChange={(event) =>
                  setInput({
                    ...input,
                    status: event.target.value as Tag["status"],
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
              {save.isPending ? "Saving…" : tag ? "Save changes" : "Add tag"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
