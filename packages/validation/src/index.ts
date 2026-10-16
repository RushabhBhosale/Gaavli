import { z } from "zod";
import { MOBILE_LANGUAGES } from "@gaavli/constants";

export const mobileLanguageSchema = z.enum(MOBILE_LANGUAGES);
export const healthStatusSchema = z
  .object({ status: z.literal("ok") })
  .strict();
export const apiFailureSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  // Stable business conflict metadata is optional; no raw DB errors are exposed.
  requestId: z.string().optional(),
});
export function apiSuccessSchema<T extends z.ZodType>(data: T) {
  return z.object({ success: z.literal(true), data });
}

// Canonical storage stays compatible with existing admin users: 10 Indian digits.
export const indianMobileSchema = z
  .string()
  .trim()
  .max(24)
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .transform((value) =>
    value.startsWith("+91")
      ? value.slice(3)
      : value.length === 12 && value.startsWith("91")
        ? value.slice(2)
        : value,
  )
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "MOBILE_INVALID"));
export const personNameSchema = z
  .string()
  .trim()
  .min(1, "NAME_REQUIRED")
  .max(60, "NAME_INVALID")
  .regex(/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u, "NAME_INVALID");
export const registrationSchema = z
  .object({
    firstName: personNameSchema,
    lastName: personNameSchema,
    mobile: indianMobileSchema,
    language: mobileLanguageSchema,
  })
  .strict()
  .refine(
    (value) => value.firstName.length + value.lastName.length + 1 <= 100,
    { message: "FULL_NAME_TOO_LONG", path: ["lastName"] },
  );
export const loginSchema = z
  .object({ mobile: indianMobileSchema, language: mobileLanguageSchema })
  .strict();
export const sendOtpSchema = z.union([registrationSchema, loginSchema]);
export const verifyOtpSchema = z
  .object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) })
  .strict();
export const sellerContactSchema = z
  .object({
    listingId: z.string().regex(/^[a-f0-9]{24}$/i),
    interested: z.literal(true),
    seller: z
      .object({
        name: z.string().trim().min(1).max(100),
        mobile: z.string().regex(/^\+91[6-9]\d{9}$/),
      })
      .strict(),
  })
  .strict();
export const sellerContactStateSchema = z.union([
  sellerContactSchema,
  z
    .object({
      listingId: z.string().regex(/^[a-f0-9]{24}$/i),
      interested: z.literal(false),
    })
    .strict(),
]);
export const notifySellerResultSchema = z
  .object({
    listingId: z.string().regex(/^[a-f0-9]{24}$/i),
    notificationId: z.string().regex(/^[a-f0-9]{24}$/i),
    notified: z.literal(true),
    channel: z.literal("in_app"),
    createdAt: z.string().datetime(),
  })
  .strict();
export const notifySellerInputSchema = z
  .object({
    quantity: z.number().positive().max(1e9).optional(),
    callbackConsent: z.literal(true).optional(),
  })
  .strict()
  .refine(
    (value) =>
      (value.quantity === undefined) === (value.callbackConsent === undefined),
    { message: "Provide quantity and callback permission together." },
  );
export const notificationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    language: mobileLanguageSchema.default("mr"),
  })
  .strict();
export const notificationPageSchema = z
  .object({
    notifications: z.array(
      z
        .object({
          id: z.string().regex(/^[a-f0-9]{24}$/i),
          type: z.enum([
            "BUYER_TRIED_CONTACT",
            "COORDINATOR_GRANTED",
            "COORDINATOR_REMOVED",
            "VILLAGE_ASSIGNED",
            "VILLAGE_UNASSIGNED",
          ]),
          title: z.string(),
          body: z.string(),
          createdAt: z.string().datetime(),
        })
        .strict(),
    ),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  })
  .strict();
export const refreshSchema = z
  .object({ refreshToken: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export const otpChallengeSchema = z.object({
  challengeId: z.string().uuid(),
  expiresAt: z.string().datetime(),
  resendAt: z.string().datetime(),
});
export const mobileVillageSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameMr: z.string(),
  taluka: z.string(),
  district: z.string(),
  pinCode: z.string().nullable(),
  distanceKm: z.number().optional(),
});
export const mobileUserSchema = z.object({
  isSeller: z.boolean().default(false),
  id: z.string(),
  name: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  language: mobileLanguageSchema,
  village: mobileVillageSchema.nullable(),
});
export const mobileSessionSchema = z.object({
  accessToken: z.string().regex(/^[a-f0-9]{64}$/),
  refreshToken: z.string().regex(/^[a-f0-9]{64}$/),
  accessExpiresAt: z.string().datetime(),
  user: mobileUserSchema,
});
export const villageSearchSchema = z
  .object({
    search: z.string().trim().max(100).default(""),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .strict()
  .refine((v) => (v.latitude === undefined) === (v.longitude === undefined));
export const villagePageSchema = z.object({
  villages: z.array(mobileVillageSchema),
  page: z.number(),
  total: z.number(),
  limit: z.number(),
});
export const selectVillageSchema = z
  .object({ villageId: z.string().regex(/^[a-f0-9]{24}$/i) })
  .strict();
export const logoutResultSchema = z.object({ loggedOut: z.literal(true) });

export const listingIdSchema = z
  .string()
  .regex(/^[a-f0-9]{24}$/i)
  .toLowerCase();
export const requestsQuerySchema = z
  .object({
    direction: z.enum(["sent", "received"]),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
export const requestStateSchema = z
  .object({
    id: listingIdSchema,
    status: z.enum(["new", "seen", "responded"]),
    seenAt: z.string().datetime().nullable(),
    respondedAt: z.string().datetime().nullable(),
  })
  .strict();
export const requestActionSchema = z
  .object({ action: z.enum(["seen", "responded"]) })
  .strict();
export const activityRequestSchema = requestStateSchema
  .extend({
    listingId: listingIdSchema,
    product: z
      .object({
        name: z.string().nullable(),
        nameMr: z.string().nullable(),
        photoUrl: z.string().nullable(),
        unit: z.string().nullable(),
      })
      .strict(),
    person: z
      .object({
        name: z.string().nullable(),
        village: z
          .object({ name: z.string(), nameMr: z.string() })
          .strict()
          .nullable(),
      })
      .strict(),
    quantity: z.number().positive().nullable(),
    createdAt: z.string().datetime(),
    canCall: z.boolean(),
  })
  .strict();
export const requestPageSchema = z
  .object({
    requests: z.array(activityRequestSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  })
  .strict();
export const requestContactSchema = z
  .object({
    requestId: listingIdSchema,
    name: z.string().min(1),
    mobile: z.string().regex(/^\+91[6-9]\d{9}$/),
  })
  .strict();
export const mobileListingsQuerySchema = z
  .object({
    search: z.string().trim().max(100).default(""),
    category: z.string().trim().min(1).max(100).optional(),
    productGroup: z.enum(["vegetables", "fruits", "grain", "dairy"]).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
export const mobileListingSchema = z
  .object({
    id: listingIdSchema,
    productName: z.string().min(1),
    productNameMr: z.string().nullable(),
    photoUrl: z
      .string()
      .refine((value) => {
        if (
          /^\/listing-photos\/listings\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg)$/.test(
            value,
          )
        )
          return true;
        try {
          const url = new URL(value);
          return (
            ["https:", "http:"].includes(url.protocol) &&
            !url.username &&
            !url.password
          );
        } catch {
          return false;
        }
      })
      .nullable()
      .default(null),
    isDemo: z.boolean().default(false),
    category: z.string().nullable(),
    categoryName: z.string().nullable(),
    categoryNameMr: z.string().nullable(),
    quantity: z.number().finite().nonnegative().nullable(),
    unit: z.string().nullable(),
    price: z.number().finite().nonnegative().nullable(),
    village: mobileVillageSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    expiresAt: z.string().datetime().nullable(),
    minimumPurchaseQuantity: z.number().positive().nullable().default(null),
    fulfillmentOptions: z
      .array(z.enum(["farm_pickup", "local_transport"]))
      .default([]),
  })
  .strict();
export const mobileListingPageSchema = z
  .object({
    listings: z.array(mobileListingSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    categories: z.array(
      z.object({
        code: z.string(),
        name: z.string(),
        nameMr: z.string().nullable(),
      }),
    ),
    isSeller: z.boolean(),
  })
  .strict();

export const productGroupSchema = z.enum([
  "vegetables",
  "fruits",
  "grain",
  "dairy",
]);
export const listingPhotoKeySchema = z
  .string()
  .max(250)
  .regex(
    /^listings\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg)$/,
  );
export const uploadedListingPhotoSchema = z
  .object({
    photoObjectKey: listingPhotoKeySchema,
    photoUrl: z.string(),
  })
  .strict();
const listingNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[^\p{Cc}\p{Cf}]+$/u);
const quantitySchema = z.number().finite().positive().max(1e9);
const listingFields = {
  productName: listingNameSchema,
  productNameMr: listingNameSchema.nullable().optional(),
  categoryId: listingIdSchema,
  productGroup: productGroupSchema.nullable().optional(),
  quantity: quantitySchema,
  unit: z
    .string()
    .trim()
    .min(1)
    .max(30)
    .regex(/^[\p{L}\p{M}\p{N} ./-]+$/u),
  price: z.number().finite().nonnegative().max(1e9).nullable().optional(),
  expiresAt: z.string().datetime().nullable(),
  photoObjectKey: listingPhotoKeySchema.nullable().optional(),
  minimumPurchaseQuantity: quantitySchema.nullable().optional(),
  fulfillmentOptions: z
    .array(z.enum(["farm_pickup", "local_transport"]))
    .max(2)
    .refine((values) => new Set(values).size === values.length)
    .optional(),
};
export const createListingSchema = z
  .object({ ...listingFields, villageId: listingIdSchema })
  .strict()
  .refine(
    (value) =>
      value.minimumPurchaseQuantity == null ||
      value.minimumPurchaseQuantity <= value.quantity,
    {
      message: "Minimum purchase must not exceed availability.",
      path: ["minimumPurchaseQuantity"],
    },
  );
export const updateListingSchema = z
  .object(listingFields)
  .partial()
  .extend({ version: z.number().int().positive() })
  .strict()
  .refine((value) => Object.keys(value).length > 1, {
    message: "Provide at least one field to update.",
  });
export const listingVersionSchema = z
  .object({ version: z.number().int().positive() })
  .strict();
export const relistListingSchema = listingVersionSchema
  .extend({
    quantity: quantitySchema,
    expiresAt: z.string().datetime().nullable(),
  })
  .strict();
export const listingOperationKeySchema = z
  .string()
  .min(8)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const listingStatusSchema = z.enum([
  "active",
  "expired",
  "sold_out",
  "deactivated",
  "reported",
  "pending",
]);
export const ownListingsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    status: listingStatusSchema.optional(),
  })
  .strict();
export const ownedListingSchema = z
  .object({
    id: listingIdSchema,
    productName: z.string(),
    productNameMr: z.string().nullable(),
    categoryId: listingIdSchema.nullable(),
    category: z.string().nullable(),
    productGroup: productGroupSchema.nullable(),
    quantity: z.number().nullable(),
    unit: z.string().nullable(),
    price: z.number().nullable(),
    photoObjectKey: listingPhotoKeySchema.nullable(),
    photoUrl: mobileListingSchema.shape.photoUrl,
    minimumPurchaseQuantity: z.number().nullable(),
    fulfillmentOptions: z.array(z.enum(["farm_pickup", "local_transport"])),
    villageId: listingIdSchema,
    village: mobileVillageSchema.nullable(),
    status: listingStatusSchema,
    version: z.number().int().positive(),
    expiresAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const ownListingPageSchema = z.object({
  listings: z.array(ownedListingSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});
export const deletedListingSchema = z.object({
  id: listingIdSchema,
  deleted: z.literal(true),
  status: z.literal("deactivated"),
  version: z.number().int().positive(),
});
export const mobileCategoriesSchema = z.object({
  categories: z.array(
    z.object({
      id: listingIdSchema,
      code: z.string(),
      name: z.string(),
      nameMr: z.string(),
      defaultShelfLife: z.string(),
      notifyMode: z.enum(["daily_digest", "change_only", "weekly_digest"]),
    }),
  ),
});
export const listingSettingsInputSchema = z
  .object({
    activeListingLimit: z.number().int().min(1).max(1000),
    version: z.number().int().nonnegative(),
  })
  .strict();
