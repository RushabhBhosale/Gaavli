import { z } from "zod";
import {
  indianMobileSchema,
  optionalLastNameSchema,
  personNameSchema,
} from "./identity";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null);

export const mobileProfileSchema = z
  .object({
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    mobile: z.string().nullable(),
    address: z.string().nullable(),
    alternativeMobile: z.string().nullable(),
    occupation: z.string().nullable(),
    email: z.string().nullable().default(null),
    photoUrl: z.string().nullable(),
    version: z.number().int().nonnegative(),
  })
  .strict();

export const profilePhotoSchema = z
  .object({
    photoObjectKey: z
      .string()
      .regex(/^listings\/[a-f0-9]{24}\/uploads\/[a-f0-9]{64}\.webp$/),
    version: z.number().int().nonnegative(),
  })
  .strict();
export const mobileChangeSchema = z
  .object({ mobile: indianMobileSchema })
  .strict();

// The OTP-verified primary number cannot be submitted by profile Save; names,
// email and the rest can.
export const updateMobileProfileSchema = z
  .object({
    firstName: personNameSchema.optional(),
    lastName: optionalLastNameSchema.optional(),
    email: z
      .union([
        z.literal(""),
        z.null(),
        z.string().trim().toLowerCase().max(120).email(),
      ])
      .transform((value) => value || null)
      .optional(),
    address: optionalText(300),
    alternativeMobile: z
      .union([z.literal(""), z.null(), indianMobileSchema])
      .transform((value) => value || null),
    occupation: optionalText(100),
    version: z.number().int().nonnegative(),
  })
  .strict();
