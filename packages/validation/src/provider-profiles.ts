import { z } from "zod";
import {
  CLAIM_STATUSES,
  CONTACT_LABELS,
  LINK_STATUSES,
  MAX_PROVIDER_CONTACTS,
  MAX_PROVIDER_IMAGES,
  PRACTICE_MODES,
  PROVIDER_KINDS,
  PROVIDER_STATUSES,
  ProviderType,
  type ProviderField,
} from "@gaavli/constants";
import { indianMobileSchema } from "./identity";

const id = z
  .string()
  .regex(/^[a-f0-9]{24}$/i)
  .toLowerCase();
// Uploaded through the photo endpoint first; a profile keeps only the keys.
export const providerImageKeySchema = z
  .string()
  .regex(/^listings\/[a-f0-9]{24}\/uploads\/[a-f0-9]{64}\.webp$/);
const providerImageKeys = z
  .array(providerImageKeySchema)
  .max(MAX_PROVIDER_IMAGES)
  .refine((keys) => new Set(keys).size === keys.length, "IMAGE_DUPLICATE");
export const providerImageSchema = z
  .object({ key: z.string(), url: z.string() })
  .strict();
const noControl = /^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]*$/;

// One phone number on a profile. Labels are fixed; "primary" is the number the
// account was verified with.
export const providerContactSchema = z
  .object({
    label: z.enum(
      CONTACT_LABELS.map((item) => item.id) as [string, ...string[]],
    ),
    mobile: indianMobileSchema,
    whatsapp: z.boolean().default(false),
    isPublic: z.boolean().default(true),
  })
  .strict();
export const providerContactsSchema = z
  .array(providerContactSchema)
  .min(1)
  .max(MAX_PROVIDER_CONTACTS)
  .superRefine((rows, ctx) => {
    if (rows.filter((row) => row.label === "primary").length !== 1)
      ctx.addIssue({
        code: "custom",
        message: "ONE_PRIMARY_NUMBER",
        path: [0, "label"],
      });
    const seen = new Set<string>();
    rows.forEach((row, index) => {
      if (seen.has(row.mobile))
        ctx.addIssue({
          code: "custom",
          message: "NUMBER_ALREADY_ADDED",
          path: [index, "mobile"],
        });
      seen.add(row.mobile);
    });
  });

function fieldSchema(field: ProviderField): z.ZodType {
  if (field.kind === "bool") return z.boolean().default(false);
  const base =
    field.kind === "choice"
      ? z.enum(field.options.map((o) => o.id) as [string, ...string[]])
      : field.kind === "master"
        ? z
            .string()
            .trim()
            .regex(/^[A-Z][A-Z0-9_]{0,79}$/, "MASTER_CODE_INVALID")
        : z
            .string()
            .trim()
            .max(field.kind === "text" && field.multiline ? 1500 : 300)
            .regex(noControl)
            .refine(
              (value) =>
                field.kind !== "text" ||
                field.keyboard !== "url" ||
                !value ||
                /^https?:\/\/[^\s]+$/i.test(value) ||
                /^[\w.-]+\.[a-z]{2,}([/?#][^\s]*)?$/i.test(value),
              "URL_INVALID",
            );
  return field.required
    ? base.pipe(z.string().min(1, "REQUIRED"))
    : z
        .union([base, z.literal("")])
        .optional()
        .default("");
}
// The category-specific fields for one provider type.
export function providerDetailsSchema(type: ProviderType) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of PROVIDER_KINDS[type].fields)
    shape[field.key] = fieldSchema(field);
  return z.object(shape).strict();
}

export const practiceSchema = z
  .object({
    mode: z.enum(PRACTICE_MODES.map((m) => m.id) as [string, ...string[]]),
    facilityId: id.optional(),
  })
  .strict()
  .refine((value) => value.mode !== "existing_facility" || !!value.facilityId, {
    message: "FACILITY_REQUIRED",
    path: ["facilityId"],
  });

const common = {
  providerType: z.enum(ProviderType),
  name: z.string().trim().min(2, "NAME_REQUIRED").max(120).regex(noControl),
  villageId: id,
  address: z.string().trim().max(300).regex(noControl).optional(),
  description: z.string().trim().max(1500).regex(noControl).optional(),
  contacts: providerContactsSchema,
  images: providerImageKeys.default([]),
  details: z.record(z.string(), z.unknown()),
  // Doctors only: where they practise.
  practice: practiceSchema.optional(),
};
function checkDetails(
  value: {
    providerType: ProviderType;
    details: Record<string, unknown>;
    practice?: unknown;
  },
  ctx: z.RefinementCtx,
) {
  const parsed = providerDetailsSchema(value.providerType).safeParse(
    value.details,
  );
  if (!parsed.success)
    for (const issue of parsed.error.issues)
      ctx.addIssue({
        code: "custom",
        message: issue.message,
        path: ["details", ...issue.path],
      });
  const doctor = value.providerType === ProviderType.HEALTHCARE_PROFESSIONAL;
  if (doctor && !value.practice)
    ctx.addIssue({
      code: "custom",
      message: "PRACTICE_REQUIRED",
      path: ["practice"],
    });
  if (!doctor && value.practice)
    ctx.addIssue({
      code: "custom",
      message: "PRACTICE_NOT_ALLOWED",
      path: ["practice"],
    });
}
export const createProviderProfileSchema = z
  .object(common)
  .strict()
  .superRefine(checkDetails);
export const updateProviderProfileSchema = z
  .object({
    name: common.name.optional(),
    address: z.union([common.address.unwrap(), z.literal("")]).optional(),
    description: z
      .union([common.description.unwrap(), z.literal("")])
      .optional(),
    contacts: providerContactsSchema.optional(),
    images: providerImageKeys.optional(),
    details: z.record(z.string(), z.unknown()).optional(),
    version: z.number().int().nonnegative(),
  })
  .strict();
export const providerDuplicateCheckSchema = z
  .object({
    providerType: z.enum(ProviderType),
    villageId: id,
    name: common.name,
    mobiles: z.array(indianMobileSchema).max(MAX_PROVIDER_CONTACTS).default([]),
  })
  .strict();
export const providerSearchQuerySchema = z
  .object({
    providerType: z.enum(ProviderType).optional(),
    villageId: id,
    q: z.string().trim().max(80).default(""),
    limit: z.coerce.number().int().min(1).max(20).default(10),
  })
  .strict();
export const providerLinkRequestSchema = z
  .object({ otherProfileId: id })
  .strict();
export const providerLinkActionSchema = z
  .object({ action: z.enum(["confirm", "reject", "remove"]) })
  .strict();
export const providerClaimSchema = z
  .object({ note: z.string().trim().max(500).optional() })
  .strict();
export const providerStatusSchema = z
  .object({
    status: z.enum(PROVIDER_STATUSES),
    version: z.number().int().nonnegative(),
  })
  .strict();

// ---- What the API returns ---------------------------------------------------
export const providerContactOutputSchema = providerContactSchema.extend({
  verified: z.boolean().default(false),
});
const village = z.object({ id, name: z.string(), nameMr: z.string() }).strict();
export const providerProfileSchema = z
  .object({
    id,
    providerType: z.enum(ProviderType),
    name: z.string(),
    village,
    address: z.string().nullable(),
    description: z.string().nullable(),
    contacts: z.array(providerContactOutputSchema),
    images: z.array(providerImageSchema).default([]),
    details: z.record(z.string(), z.unknown()),
    status: z.enum(PROVIDER_STATUSES),
    version: z.number().int().nonnegative(),
    // The facility a doctor practises at, when linked.
    practice: z
      .object({
        mode: z.string(),
        facility: z
          .object({
            id,
            name: z.string(),
            status: z.enum(LINK_STATUSES),
            linkId: id.nullable(),
          })
          .nullable(),
      })
      .nullable()
      .default(null),
    mine: z.boolean().default(false),
    createdAt: z.string().datetime(),
  })
  .strict();
export const providerLinkSchema = z
  .object({
    id,
    status: z.enum(LINK_STATUSES),
    initiatedBy: z.enum(["doctor", "facility"]),
    doctor: z
      .object({ id, name: z.string(), specialization: z.string().nullable() })
      .strict(),
    facility: z.object({ id, name: z.string() }).strict(),
    // True when the signed-in user is the one who must confirm.
    needsMyAnswer: z.boolean(),
    createdAt: z.string().datetime(),
  })
  .strict();
export const providerProfilesResponseSchema = z
  .object({
    profiles: z.array(providerProfileSchema),
    links: z.array(providerLinkSchema),
  })
  .strict();
export const providerFacilityDetailSchema = z
  .object({
    profile: providerProfileSchema,
    links: z.array(providerLinkSchema),
  })
  .strict();
export const providerDuplicateMatchSchema = z
  .object({
    id,
    providerType: z.enum(ProviderType),
    name: z.string(),
    village,
    maskedMobile: z.string().nullable(),
    reason: z.enum(["same_number", "similar_name"]),
    mine: z.boolean(),
  })
  .strict();
export const providerDuplicateResultSchema = z
  .object({ matches: z.array(providerDuplicateMatchSchema) })
  .strict();
export const providerSearchResultSchema = z
  .object({
    results: z.array(
      z
        .object({
          id,
          providerType: z.enum(ProviderType),
          name: z.string(),
          village,
        })
        .strict(),
    ),
  })
  .strict();
export const providerClaimResultSchema = z
  .object({ id, status: z.enum(CLAIM_STATUSES) })
  .strict();
export const providerCreatedSchema = z
  .object({
    profile: providerProfileSchema,
    facility: providerProfileSchema.nullable(),
  })
  .strict();

// Registration details beyond the OTP: the numbers the user shares (with
// WhatsApp and visibility flags), an optional email and the promo opt-in.
export const accountContactsSchema = z
  .object({
    contacts: providerContactsSchema,
    email: z
      .union([
        z.literal(""),
        z.null(),
        z.string().trim().toLowerCase().email().max(120),
      ])
      .transform((value) => value || null)
      .optional(),
    promoWhatsapp: z.boolean().optional(),
  })
  .strict();
export const accountContactsOutputSchema = z
  .object({
    contacts: z.array(providerContactOutputSchema),
    email: z.string().nullable(),
    promoWhatsapp: z.boolean(),
  })
  .strict();
