import { z } from "zod";
import { indianMobileSchema, personNameSchema } from "./identity";

const id = z
  .string()
  .regex(/^[a-f0-9]{24}$/i)
  .toLowerCase();
const name = personNameSchema;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const parsed = new Date(`${v}T00:00:00.000Z`);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === v
    );
  });
export const coordinatorQuerySchema = z
  .object({
    villageId: id.optional(),
    search: z.string().trim().max(100).default(""),
    area: z.enum(["all", "taluka", "district", "other_talukas"]).default("all"),
    filter: z
      .enum(["all", "buyers", "sellers", "active", "preregistered"])
      .default("all"),
    type: z
      .enum([
        "all",
        "users",
        "buyers",
        "sellers",
        "listings",
        "mapping",
        "reports",
      ])
      .default("all"),
    action: z.enum(["all", "registered"]).default("all"),
    reportStatus: z.enum(["all", "open"]).default("all"),
    from: date.optional(),
    to: date.optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .strict()
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "Invalid date range",
  })
  .refine((v) => (v.latitude === undefined) === (v.longitude === undefined));
export const coordinatorBuyerSchema = z
  .object({
    firstName: name,
    lastName: name,
    mobile: indianMobileSchema,
    targetVillageId: id.optional(),
  })
  .strict()
  .refine(
    (value) => value.firstName.length + value.lastName.length + 1 <= 100,
    { path: ["lastName"], message: "FULL_NAME_TOO_LONG" },
  );
export const coordinatorUserEditSchema = z
  .object({
    firstName: name,
    lastName: name,
    version: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (value) => value.firstName.length + value.lastName.length + 1 <= 100,
    { path: ["lastName"], message: "FULL_NAME_TOO_LONG" },
  );
export const coordinatorConnectionInputSchema = z
  .object({ targetVillageId: id })
  .strict();
export const coordinatorReportActionSchema = z
  .object({
    action: z.enum(["dismiss", "flag", "hide", "escalate"]),
    version: z.number().int().nonnegative(),
  })
  .strict();
export const listingReportInputSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(5)
      .max(1000)
      .regex(/^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]*$/),
  })
  .strict();
export const coordinatorActivityIdSchema = z
  .string()
  .regex(/^(users|buyers|sellers|listings|mapping|reports):[a-f0-9]{24}$/);
const village = z.object({
  id,
  name: z.string(),
  nameMr: z.string(),
  taluka: z.string(),
  district: z.string(),
  pinCode: z.string().nullable(),
  distanceKm: z.number().optional(),
});
export const coordinatorUserSchema = z.object({
  id,
  name: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  mobile: z.string().nullable(),
  village,
  roles: z.array(z.string()),
  status: z.enum(["active", "blocked", "pending"]),
  preRegistered: z.boolean(),
  mobileVerified: z.boolean().nullable(),
  canEdit: z.boolean(),
  version: z.number(),
  createdAt: z.string(),
});
const listing = z.object({
  id,
  productName: z.string(),
  description: z.string().nullable(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  price: z.number().nullable(),
  status: z.string(),
  photoUrl: z.string().nullable(),
  createdAt: z.string(),
});
export const coordinatorUserDetailSchema = z.object({
  user: coordinatorUserSchema,
  listings: z.array(listing),
});
const page = { total: z.number(), page: z.number(), limit: z.number() };
export const coordinatorUsersSchema = z.object({
  users: z.array(coordinatorUserSchema),
  ...page,
});
export const coordinatorConnectionsSchema = z.object({
  connections: z.array(z.object({ id, village, createdAt: z.string() })),
  ...page,
});
export const coordinatorActivitySchema = z.object({
  id: coordinatorActivityIdSchema,
  type: z.enum([
    "users",
    "buyers",
    "sellers",
    "listings",
    "mapping",
    "reports",
  ]),
  action: z.string(),
  name: z.string(),
  targetId: id,
  createdAt: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
});
export const coordinatorActivityPageSchema = z.object({
  activities: z.array(coordinatorActivitySchema),
  ...page,
});
export const coordinatorDashboardSchema = z.object({
  village,
  from: z.string(),
  to: z.string(),
  counts: z.object({
    users: z.number(),
    buyers: z.number(),
    sellers: z.number(),
    listings: z.number(),
    mapping: z.number(),
    reports: z.number(),
  }),
});
const report = z.object({
  id,
  listingId: id,
  productName: z.string(),
  reason: z.string(),
  status: z.enum(["pending", "dismissed", "flagged", "hidden", "escalated"]),
  version: z.number(),
  createdAt: z.string(),
});
export const coordinatorReportsSchema = z.object({
  reports: z.array(report),
  ...page,
});
export const coordinatorReportSchema = z.object({
  report,
  listing: listing.nullable(),
  history: z.array(z.object({ action: z.string(), createdAt: z.string() })),
});
export const coordinatorListingSchema = z.object({ listing });
export const coordinatorMutationSchema = z.object({
  id,
  confirmed: z.literal(true),
});
