import { z } from "zod";
// Shared by OTP registration and coordinator-assisted pre-registration.
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
