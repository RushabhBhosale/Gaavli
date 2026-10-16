import { z } from "zod";
import { listingIdSchema, listingOperationKeySchema } from "@gaavli/validation";
import {
  emptyListingDraft,
  listingDraftSchema,
  listingFormSchema,
} from "./listingForm";

export const pendingListingDeleteSchema = z
  .object({
    id: listingIdSchema,
    version: z.number().int().positive(),
    villageId: listingIdSchema.optional(),
    key: listingOperationKeySchema,
  })
  .strict();
export type PendingListingDelete = z.infer<typeof pendingListingDeleteSchema>;
export function savedProductDrafts(
  rows: { key: string; value: string }[],
  accountId: string,
  villageId: string,
) {
  const prefix = `${accountId}:${villageId}`;
  const empty = JSON.stringify(listingFormSchema.parse(emptyListingDraft.form));
  return rows
    .filter(
      (row) => row.key === prefix || row.key.startsWith(`${prefix}:edit:`),
    )
    .map((row) => {
      const draft = listingDraftSchema.parse(JSON.parse(row.value));
      if (
        (row.key === prefix && (draft.editBase || draft.editPending)) ||
        (row.key !== prefix && !draft.editBase)
      )
        throw new Error("Invalid draft type");
      if (draft.editBase && draft.editBase.villageId !== villageId)
        throw new Error("Invalid edit village");
      if (draft.editBase && row.key !== `${prefix}:edit:${draft.editBase.id}`)
        throw new Error("Invalid edit draft scope");
      if (draft.pending && draft.pending.body.villageId !== villageId)
        throw new Error("Invalid draft village");
      return { key: row.key, draft };
    })
    .filter(
      ({ draft }) =>
        draft.pending ||
        draft.editPending ||
        draft.editBase ||
        JSON.stringify(draft.form) !== empty,
    );
}
