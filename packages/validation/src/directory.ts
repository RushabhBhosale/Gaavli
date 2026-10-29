import { z } from "zod";
const id = z
  .string()
  .regex(/^[a-f0-9]{24}$/i)
  .toLowerCase();
export const directoryQuerySchema = z
  .object({
    sourceVillageId: id,
    module: z.enum(["services", "transport"]).optional(),
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
    price: z.number().nonnegative().nullable(),
    unit: z.string().nullable(),
    village: z.object({ id, name: z.string(), nameMr: z.string() }).strict(),
    createdAt: z.string().datetime(),
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
