import { z } from "zod";
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
export const usersQuerySchema = z
  .object({
    role: z.enum(["buyer", "seller", "coordinator"]).optional(),
    village: objectId.optional(),
    status: statusSchema.optional(),
    search: z.string().trim().max(100).optional(),
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
export const villagesQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    district: z.string().trim().min(1).max(100).optional(),
    status: z.enum(["active", "inactive"]).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(6),
  })
  .strict();
export const villageSchema = z
  .object({
    publicCoordinatorPhone: z
      .string()
      .trim()
      .regex(/^$|^\+91[6-9]\d{9}$/, "Use +91 followed by a valid mobile number")
      .optional(),
    name: z.string().trim().min(2, "Enter at least 2 characters").max(100),
    nameMr: z.string().trim().min(2, "Enter the Marathi village name").max(100),
    taluka: z.string().trim().min(1, "Enter the taluka").max(100),
    district: z.string().trim().min(1, "Enter the district").max(100),
    pinCode: z
      .string()
      .trim()
      .regex(/^$|^[1-9]\d{5}$/, "Enter a valid six-digit PIN code")
      .optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    coordinatorIds: z
      .array(objectId)
      .max(1, "Choose only one coordinator per village")
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Duplicate coordinators",
      ),
  })
  .strict();
export const editVillageSchema = villageSchema
  .partial({ latitude: true, longitude: true })
  .extend({
    version: z.number().int().nonnegative(),
  })
  .refine(
    (input) =>
      (input.latitude === undefined) === (input.longitude === undefined),
    "Provide both coordinates or omit both",
  );
export const createVillageSchema = villageSchema
  .partial({ latitude: true, longitude: true })
  .refine(
    (input) =>
      (input.latitude === undefined) === (input.longitude === undefined),
    "Provide both latitude and longitude, or omit both",
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
