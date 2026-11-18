import { z } from "zod";
import { DIRECTORY_GROUP_IDS } from "@gaavli/constants";
const id = z
  .string()
  .regex(/^[a-f0-9]{24}$/i)
  .toLowerCase();
export const directoryQuerySchema = z
  .object({
    sourceVillageId: id,
    module: z.enum(["services", "transport"]).optional(),
    category: z.enum(DIRECTORY_GROUP_IDS).optional(),
    search: z.string().trim().max(100).default(""),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
export const directoryEntrySchema = z
  .object({
    id,
    module: z.enum(["services", "transport"]),
    name: z.string().min(1),
    nameMr: z.string().nullable(),
    description: z.string().nullable(),
    category: z.enum(["Utility", "Medical", "Shop", "Other"]),
    // Public phone numbers in the order villagers should try them, and the
    // kind of registered provider (null for older entries).
    contacts: z
      .array(
        z
          .object({
            label: z.string(),
            mobile: z.string().regex(/^[6-9]\d{9}$/),
            whatsapp: z.boolean().default(false),
          })
          .strict(),
      )
      .default([]),
    providerType: z.string().nullable().default(null),
    mine: z.boolean().default(false),
    hours: z.string().nullable().default(null),
    // Shop or service photos (at most two), already resolved to URLs.
    images: z
      .array(z.object({ key: z.string(), url: z.string() }).strict())
      .default([]),
    price: z.number().nonnegative().nullable(),
    unit: z.string().nullable(),
    village: z.object({ id, name: z.string(), nameMr: z.string() }).strict(),
    createdAt: z.string().datetime(),
  })
  .strict();
// Counts for the category tiles of one module.
export const directorySummaryQuerySchema = directoryQuerySchema
  .pick({ sourceVillageId: true })
  .extend({
    module: z.enum(["services", "transport"]),
    // "2": the 15 Services categories of 2026-11-18.
    tiles: z.literal("2").optional(),
  })
  .strict();
export const directorySummarySchema = z
  .object({
    total: z.number().int().nonnegative(),
    groups: z.array(
      z
        .object({
          id: z.enum(DIRECTORY_GROUP_IDS),
          count: z.number().int().nonnegative(),
        })
        .strict(),
    ),
  })
  .strict();
export const directoryPageSchema = z
  .object({
    entries: z.array(directoryEntrySchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  })
  .strict();
export const dashboardDirectorySchema = z
  .object({
    coordinator: z
      .object({
        name: z.string(),
        village: z
          .object({ id, name: z.string(), nameMr: z.string() })
          .strict(),
        publicContactPhone: z
          .string()
          .regex(/^\+91[6-9]\d{9}$/)
          .nullable(),
      })
      .strict()
      .nullable(),
    services: directoryPageSchema,
    transport: directoryPageSchema,
  })
  .strict();

// Shops that sell what the buyer searched for. See docs/03-api/SHOP_PRODUCTS.md.
export const productShopsQuerySchema = z
  .object({
    sourceVillageId: id,
    q: z.string().trim().max(80).default(""),
    limit: z.coerce.number().int().min(1).max(20).default(5),
  })
  .strict();
const shopSection = z
  .object({
    entries: z.array(directoryEntrySchema),
    total: z.number().int().nonnegative(),
  })
  .strict();
export const productShopsSchema = z
  .object({
    // The catalogue product the search text matched, or null for none.
    product: z
      .object({
        code: z.string(),
        nameEn: z.string(),
        nameMr: z.string(),
        nameHi: z.string().nullable(),
        productGroup: z.string(),
      })
      .strict()
      .nullable(),
    // Shops that ticked this exact product.
    haveIt: shopSection,
    // Other shops that sell the product's group.
    sellsGroup: shopSection,
  })
  .strict();

// What one shop in the directory says it sells (groups, then popular items).
export const directoryShopProductsSchema = z
  .object({
    groups: z.array(z.string()),
    products: z.array(
      z
        .object({
          code: z.string(),
          nameEn: z.string(),
          nameMr: z.string(),
          nameHi: z.string().nullable(),
          productGroup: z.string(),
        })
        .strict(),
    ),
  })
  .strict();
