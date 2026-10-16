import { z } from "zod";
import { LISTING_ASSET_PHOTOS } from "@gaavli/constants";
import {
  createListingSchema,
  listingOperationKeySchema,
  listingPhotoKeySchema,
  updateListingSchema,
  ownedListingSchema,
} from "@gaavli/validation";
import type { MobileLanguage, OwnedListing } from "@gaavli/types";

export const localListingPhotoSchema = z.object({
  fileName: z.string().regex(/^[a-zA-Z0-9_-]+\.(jpg|png|webp)$/),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  operationKey: listingOperationKeySchema,
  uploadedKey: listingPhotoKeySchema.nullable(),
});
export type LocalListingPhoto = z.infer<typeof localListingPhotoSchema>;
export const listingFormSchema = z.object({
  name: z.string().max(120),
  categoryId: z.string(),
  group: z.enum(["vegetables", "fruits", "grain", "dairy", "other"]),
  quantity: z.string().max(40),
  unit: z.string().max(30),
  price: z.string().max(40),
  minimum: z.string().max(40),
  days: z.string().max(10),
  photo: z.string(),
  existingPhotoKey: listingPhotoKeySchema.nullable().default(null),
  localPhoto: localListingPhotoSchema.nullable().default(null),
  farmPickup: z.boolean(),
  localTransport: z.boolean(),
});
export type ListingForm = z.infer<typeof listingFormSchema>;
export const pendingListingSchema = z.object({
  key: listingOperationKeySchema,
  body: createListingSchema,
});
export const listingDraftSchema = z.object({
  form: listingFormSchema,
  pending: pendingListingSchema.nullable(),
  editBase: ownedListingSchema.nullable().default(null),
  editInitialForm: listingFormSchema.nullable().default(null),
  editLanguage: z.enum(["mr", "en"]).nullable().default(null),
  editPending: z
    .object({ key: listingOperationKeySchema, body: updateListingSchema })
    .nullable()
    .default(null),
});
export type ListingDraft = z.infer<typeof listingDraftSchema>;
export const emptyListingDraft: ListingDraft = {
  form: {
    name: "",
    categoryId: "",
    group: "vegetables",
    quantity: "",
    unit: "kg",
    price: "",
    minimum: "1",
    days: "2",
    photo: "",
    existingPhotoKey: null,
    localPhoto: null,
    farmPickup: true,
    localTransport: false,
  },
  pending: null,
  editBase: null,
  editInitialForm: null,
  editLanguage: null,
  editPending: null,
};
export class ListingFormError extends Error {
  constructor(public field: string) {
    super("LISTING_FORM_INVALID");
  }
}
function number(value: string, field: string) {
  const normalized = value
    .trim()
    .replace(/[०-९]/g, (digit) => String("०१२३४५६७८९".indexOf(digit)));
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new ListingFormError(field);
  return Number(normalized);
}
export function prepareListing(
  form: ListingForm,
  villageId: string,
  language: MobileLanguage,
  categoryCode: string,
  now = Date.now(),
) {
  const photo = LISTING_ASSET_PHOTOS.find((item) => item.id === form.photo);
  if (form.localPhoto && !form.localPhoto.uploadedKey)
    throw new ListingFormError("photo");
  if (form.photo && !photo) throw new ListingFormError("photo");
  const days =
    categoryCode === "RECURRING_SUPPLY" ? null : number(form.days, "days");
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 365))
    throw new ListingFormError("days");
  const parsed = createListingSchema.safeParse({
    productName: form.name.trim(),
    productNameMr: language === "mr" ? form.name.trim() : null,
    villageId,
    categoryId: form.categoryId,
    productGroup: form.group === "other" ? null : form.group,
    quantity: number(form.quantity, "quantity"),
    unit: form.unit,
    price: number(form.price, "price"),
    minimumPurchaseQuantity: form.minimum.trim()
      ? number(form.minimum, "minimum")
      : null,
    expiresAt:
      days === null ? null : new Date(now + days * 86400000).toISOString(),
    photoObjectKey:
      form.localPhoto?.uploadedKey ?? photo?.key ?? form.existingPhotoKey,
    fulfillmentOptions: [
      ...(form.farmPickup ? ["farm_pickup"] : []),
      ...(form.localTransport ? ["local_transport"] : []),
    ],
  });
  if (!parsed.success)
    throw new ListingFormError(
      String(parsed.error.issues[0]?.path[0] ?? "name"),
    );
  return parsed.data;
}
export function newListingOperation(body: z.infer<typeof createListingSchema>) {
  // Uniqueness only; not an authentication token. Persist before sending.
  return pendingListingSchema.parse({
    key: listingOperationId(),
    body,
  });
}
export function listingOperationId() {
  return `listing-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function formFromListing(
  row: OwnedListing,
  language: MobileLanguage,
  now = Date.now(),
): ListingForm {
  return listingFormSchema.parse({
    ...emptyListingDraft.form,
    name:
      language === "mr"
        ? row.productNameMr || row.productName
        : row.productName,
    categoryId: row.categoryId || "",
    group: row.productGroup || "other",
    quantity: row.quantity === null ? "" : String(row.quantity),
    unit: row.unit || "kg",
    price: row.price === null ? "" : String(row.price),
    minimum:
      row.minimumPurchaseQuantity === null
        ? ""
        : String(row.minimumPurchaseQuantity),
    days: row.expiresAt
      ? String(
          Math.max(1, Math.ceil((Date.parse(row.expiresAt) - now) / 86400000)),
        )
      : "2",
    existingPhotoKey: row.photoObjectKey,
    farmPickup: row.fulfillmentOptions.includes("farm_pickup"),
    localTransport: row.fulfillmentOptions.includes("local_transport"),
  });
}
export function prepareListingEdit(
  form: ListingForm,
  row: OwnedListing,
  initialForm: ListingForm,
  language: MobileLanguage,
  categoryCode: string,
  now = Date.now(),
) {
  const candidate = prepareListing(
    form,
    row.villageId,
    language,
    categoryCode,
    now,
  );
  const originalName = initialForm.name.trim();
  candidate.productName =
    form.name.trim() !== originalName && language === "en"
      ? form.name.trim()
      : row.productName;
  candidate.productNameMr =
    form.name.trim() !== originalName && language === "mr"
      ? form.name.trim()
      : row.productNameMr;
  if (
    form.categoryId === initialForm.categoryId &&
    form.days === initialForm.days
  )
    candidate.expiresAt = row.expiresAt;
  const patch: Record<string, unknown> = { version: row.version };
  for (const [key, value] of Object.entries(candidate)) {
    if (key === "villageId") continue;
    const previous = row[key as keyof OwnedListing];
    const normalize = (input: unknown) =>
      Array.isArray(input) ? [...input].sort() : input;
    if (
      JSON.stringify(normalize(value)) !== JSON.stringify(normalize(previous))
    )
      patch[key] = value;
  }
  if (Object.keys(patch).length === 1) throw new ListingFormError("unchanged");
  return updateListingSchema.parse(patch);
}
