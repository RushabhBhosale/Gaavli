import { z } from "zod";
import {
  ProviderType,
  PROVIDER_MASTER_GROUPS,
  PROVIDER_MASTER_TYPES,
} from "@gaavli/constants";

const group = {
  providerType: z.enum(ProviderType),
  masterType: z.enum(PROVIDER_MASTER_TYPES),
};
function validGroup(value: { providerType: ProviderType; masterType: string }) {
  return (
    PROVIDER_MASTER_GROUPS[value.providerType] as readonly string[]
  ).includes(value.masterType);
}
const groupError = {
  path: ["masterType"],
  message: "Choose a master group belonging to this provider type.",
};
export const providerMasterGroupSchema = z
  .object(group)
  .strict()
  .refine(validGroup, groupError);
export const providerMasterNameSchema = z
  .object({
    en: z.string().trim().min(1, "English name is required.").max(160),
    mr: z.string().trim().min(1, "Marathi name is required.").max(160),
    hi: z.string().trim().min(1, "Hindi name is required.").max(160),
  })
  .strict();
const sortOrder = z.number().int().min(0).max(1000000);
export const providerMasterCreateSchema = z
  .object({
    ...group,
    name: providerMasterNameSchema,
    sortOrder: sortOrder.default(0),
    isActive: z.boolean().default(true),
  })
  .strict()
  .refine(validGroup, groupError);
export const providerMasterUpdateSchema = z
  .object({
    name: providerMasterNameSchema,
    sortOrder,
    version: z.number().int().nonnegative(),
  })
  .strict();
export const providerMasterStatusSchema = z
  .object({ isActive: z.boolean(), version: z.number().int().nonnegative() })
  .strict();
export const providerMasterIdSchema = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, "Invalid master ID.");
export const providerMasterQuerySchema = z
  .object({
    ...group,
    search: z.string().trim().max(100).default(""),
    status: z.enum(["all", "active", "inactive"]).default("all"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sort: z
      .enum(["sortOrder", "name.en", "name.mr", "name.hi", "code", "isActive"])
      .default("sortOrder"),
    direction: z.enum(["asc", "desc"]).default("asc"),
  })
  .strict()
  .refine(validGroup, groupError);
export const providerMasterSeedRowSchema = z
  .object({
    ...group,
    code: z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/),
    name: providerMasterNameSchema,
    isActive: z.boolean(),
    sortOrder,
  })
  .strict()
  .refine(validGroup, groupError);
export const providerMasterSeedSchema = z
  .array(providerMasterSeedRowSchema)
  .min(1)
  .superRefine((rows, ctx) => {
    const seen = new Set<string>();
    rows.forEach((row, index) => {
      const key = `${row.providerType}:${row.masterType}:${row.code}`;
      if (seen.has(key))
        ctx.addIssue({
          code: "custom",
          path: [index, "code"],
          message: "Duplicate seed identity.",
        });
      seen.add(key);
    });
  });
export function normalizeProviderMasterName(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("en-IN");
}
