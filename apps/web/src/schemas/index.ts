import { z } from "zod";
import {
  LISTING_PRODUCT_GROUPS,
  LISTING_TAG_ID_PATTERN,
} from "@gaavli/constants";
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
export const statusSchema = z.enum(["active", "blocked", "pending"]);
export const loginSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .toLowerCase()
      .refine(
        (v) => z.email().safeParse(v).success || /^[6-9]\d{9}$/.test(v),
        "Enter a valid email or 10-digit mobile number",
      ),
    password: z.string().min(1, "Enter your password").max(72),
    remember: z.boolean(),
  })
  .strict();
export const userSchema = z
  .object({
    name: z.string().trim().min(2, "Enter at least 2 characters").max(100),
    mobile: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    roles: z
      .array(z.enum(["buyer", "seller", "coordinator"]))
      .min(1, "Select at least one role")
      .refine((v) => new Set(v).size === v.length, "Duplicate roles"),
    village: objectId,
    status: statusSchema,
  })
  .strict();
export const editUserSchema = userSchema.extend({
  version: z.number().int().nonnegative(),
});
export const statusUpdateSchema = z
  .object({ status: statusSchema, version: z.number().int().nonnegative() })
  .strict();
export const usersFilterSchema = z
  .object({
    role: z.enum(["buyer", "seller", "coordinator"]).optional(),
    village: objectId.optional(),
    status: statusSchema.optional(),
    search: z.string().trim().max(100).optional(),
  })
  .strict();
export const usersQuerySchema = usersFilterSchema
  .extend({
    sort: z
      .enum(["name", "mobile", "status", "createdAt"])
      .default("createdAt"),
    direction: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(7),
  })
  .strict();
export type UserInput = z.infer<typeof userSchema>;
export const categorySchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(
        /^[A-Z][A-Z0-9_]{1,39}$/,
        "Use 2–40 uppercase letters, numbers or underscores for the code",
      ),
    name: z.string().trim().min(2, "Enter the category name").max(100),
    nameMr: z
      .string()
      .trim()
      .min(2, "Enter the Marathi category name")
      .max(100),
    defaultShelfLife: z
      .string()
      .trim()
      .min(1, "Enter the default shelf life")
      .max(100),
    notifyMode: z.enum(["daily_digest", "change_only", "weekly_digest"]),
  })
  .strict();
export const editCategorySchema = categorySchema
  .omit({ code: true })
  .extend({ version: z.number().int().nonnegative() })
  .strict();
export const deleteCategorySchema = z
  .object({ version: z.number().int().nonnegative() })
  .strict();
export const categoriesQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    sort: z
      .enum([
        "name",
        "defaultShelfLife",
        "notifyMode",
        "activeListings",
        "sortOrder",
      ])
      .default("sortOrder"),
    direction: z.enum(["asc", "desc"]).default("asc"),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict();
export const villagesFilterSchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    district: z.string().trim().min(1).max(100).optional(),
    taluka: z.string().trim().min(1).max(100).optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .strict();
export const villagesQuerySchema = villagesFilterSchema
  .extend({
    sort: z.enum(["name", "users", "status"]).default("name"),
    direction: z.enum(["asc", "desc"]).default("asc"),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(6),
  })
  .strict();
export const providerTypeOptionSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z][A-Z0-9_]{1,79}$/, "Use uppercase letters, numbers and underscores"),
    name: z.object({
      en: z.string().trim().min(2).max(160),
      mr: z.string().trim().min(2).max(160),
      hi: z.string().trim().min(2).max(160),
    }).strict(),
    sortOrder: z.number().int().min(0).max(1000000).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();
export const providerTypeOptionUpdateSchema = providerTypeOptionSchema
  .omit({ code: true })
  .extend({ version: z.number().int().nonnegative() })
  .strict();
export const providerTypeOptionsQuerySchema = z
  .object({
    search: z.string().trim().max(100).default(""),
    status: z.enum(["all", "active", "inactive"]).default("all"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    // Dropdown consumers call this endpoint without paging parameters and need
    // every active type, so an omitted limit returns the full vocabulary.
    limit: z.coerce.number().int().min(1).max(100).default(100),
    sort: z
      .enum(["sortOrder", "name.en", "name.mr", "name.hi", "code", "isActive"])
      .default("sortOrder"),
    direction: z.enum(["asc", "desc"]).default("asc"),
  })
  .strict();
export const villageSchema = z
  .object({
    publicCoordinatorPhone: z
      .string()
      .trim()
      .regex(/^$|^\+91[6-9]\d{9}$/, "Use +91 followed by a valid mobile number")
      .optional(),
    villageMasterId: objectId.optional(),
    name: z
      .string()
      .trim()
      .min(2, "Enter at least 2 characters")
      .max(100)
      .optional(),
    nameMr: z
      .string()
      .trim()
      .min(2, "Enter the Marathi village name")
      .max(100)
      .optional(),
    taluka: z.string().trim().min(1, "Enter the taluka").max(100).optional(),
    district: z
      .string()
      .trim()
      .min(1, "Enter the district")
      .max(100)
      .optional(),
    pinCode: z
      .string()
      .trim()
      .regex(/^$|^[1-9]\d{5}$/, "Enter a valid six-digit PIN code")
      .optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    coordinatorIds: z
      .array(objectId)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Duplicate coordinators",
      )
      .optional(),
  })
  .strict();
function hasVillageIdentity(input: {
  villageMasterId?: string;
  name?: string;
  nameMr?: string;
  taluka?: string;
  district?: string;
}) {
  if (input.villageMasterId) return true;
  return Boolean(input.name && input.nameMr && input.taluka && input.district);
}
export const editVillageSchema = villageSchema
  .partial({ latitude: true, longitude: true })
  .extend({
    version: z.number().int().nonnegative(),
  })
  .refine(
    (input) =>
      (input.latitude === undefined) === (input.longitude === undefined),
    "Provide both coordinates or omit both",
  )
  .refine(
    hasVillageIdentity,
    "Enter the village name, Marathi name, taluka, and district.",
  );
export const createVillageSchema = villageSchema
  .partial({ latitude: true, longitude: true })
  .refine(
    (input) =>
      (input.latitude === undefined) === (input.longitude === undefined),
    "Provide both latitude and longitude, or omit both",
  )
  .refine(
    hasVillageIdentity,
    "Enter the village name, Marathi name, taluka, and district.",
  );
export const villageStatusSchema = z
  .object({
    status: z.enum(["active", "inactive"]),
    version: z.number().int().nonnegative(),
  })
  .strict();
export type VillageInput = z.infer<typeof createVillageSchema>;
export const deleteVillageSchema = z
  .object({ version: z.number().int().nonnegative() })
  .strict();

// Admin Product Catalogue (Product Master): browse, edit, activate/deactivate.
export const adminProductsQuerySchema = z
  .object({
    search: z.string().trim().max(100).default(""),
    status: z.enum(["all", "ACTIVE", "INACTIVE"]).default("all"),
    group: z.enum(["all", ...LISTING_PRODUCT_GROUPS]).default("all"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
const productNameField = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(120)
  .regex(/^[^\p{Cc}\p{Cf}]+$/u, "Remove hidden characters.");
const productTagIds = z
  .array(z.string().regex(LISTING_TAG_ID_PATTERN))
  .max(20)
  .refine((ids) => new Set(ids).size === ids.length, "Duplicate tags.");
const productFields = {
  nameEn: productNameField,
  nameMr: productNameField,
  nameHi: productNameField.nullable().optional(),
  productGroup: z.enum(LISTING_PRODUCT_GROUPS),
  defaultUnit: z.string().trim().min(1, "Unit is required.").max(30),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  // Tags offered for this product in addition to its group's tags.
  tagIds: productTagIds.optional(),
};
export const adminProductUpdateSchema = z.object(productFields).strict();
// A new Product Master entry. The code is made from the English name unless
// one is given; it can never change afterwards.
export const adminProductCreateSchema = z
  .object({
    ...productFields,
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z][A-Z0-9_]{1,79}$/, "Use letters, numbers and _ only.")
      .optional(),
  })
  .strict();
const tagLabel = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(40, "Keep tag names short.")
  .regex(/^[^\p{Cc}\p{Cf}]+$/u, "Remove hidden characters.");
const tagFields = {
  en: tagLabel,
  mr: tagLabel,
  hi: tagLabel,
  groups: z
    .array(z.enum(LISTING_PRODUCT_GROUPS))
    .refine((groups) => new Set(groups).size === groups.length),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  sortOrder: z.number().int().min(0).max(100000).optional(),
};
export const adminListingTagCreateSchema = z
  .object({
    ...tagFields,
    id: z.string().trim().regex(LISTING_TAG_ID_PATTERN).optional(),
  })
  .strict();
export const adminListingTagUpdateSchema = z.object(tagFields).strict();
export const adminProductStatusSchema = z
  .object({ status: z.enum(["ACTIVE", "INACTIVE"]) })
  .strict();
