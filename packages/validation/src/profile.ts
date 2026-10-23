import { z } from "zod";
import { indianMobileSchema } from "./identity";

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

// Names and the OTP-verified primary number cannot be submitted by profile Save.
export const updateMobileProfileSchema = z
  .object({
    address: optionalText(300),
    alternativeMobile: z
      .union([z.literal(""), z.null(), indianMobileSchema])
      .transform((value) => value || null),
    occupation: optionalText(100),
    version: z.number().int().nonnegative(),
  })
  .strict();
