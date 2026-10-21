import { z } from "zod";
import { LISTING_PRODUCT_GROUPS } from "@gaavli/constants";

export const productGroupSchema = z.enum(LISTING_PRODUCT_GROUPS);
export const productMasterImportRowSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[A-Z][A-Z0-9_]*$/),
    nameMr: z.string().trim().min(1).max(120),
    nameEn: z.string().trim().min(1).max(120),
    productGroup: productGroupSchema,
    defaultUnit: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .regex(/^[\p{L}\p{M}\p{N} ./-]+$/u),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    sortOrder: z.number().int().nonnegative(),
  })
  .strict();
export const productMasterImportSchema = z
  .array(productMasterImportRowSchema)
  .min(1)
  .superRefine((rows, context) => {
    const codes = new Set<string>();
    rows.forEach((row, index) => {
      if (codes.has(row.code))
        context.addIssue({
          code: "custom",
          message: "Duplicate product code",
          path: [index, "code"],
        });
      codes.add(row.code);
    });
  });
export const productMasterSchema = productMasterImportRowSchema
  .extend({ productId: z.string().regex(/^[a-f0-9]{24}$/i) })
  .strict();
export const productMasterPageSchema = z
  .object({
    products: z.array(
      productMasterSchema.refine((product) => product.status === "ACTIVE", {
        message: "Only active products are available for selection.",
      }),
    ),
  })
  .strict();
export const productMasterQuerySchema = z
  .object({ search: z.string().trim().max(100).default("") })
  .strict();
