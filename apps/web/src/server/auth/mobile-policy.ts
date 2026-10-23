import { createHash, createHmac, randomBytes } from "node:crypto";
import { AppError } from "../utils/errors";

export const OTP_LIFETIME_MS = 5 * 60_000;
export const RESEND_MS = 60_000;
export const MAX_OTP_ATTEMPTS = 5;
export const ACCESS_MS = 15 * 60_000;
export const SESSION_MS = 90 * 24 * 60 * 60_000;
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export function otpSecret() {
  const key = process.env.MOBILE_AUTH_SECRET;
  if (!key || key.length < 32)
    throw new AppError(
      503,
      "AUTH_UNAVAILABLE",
      "Mobile authentication is not configured.",
    );
  return key;
}
export const otpDigest = (id: string, code: string) =>
  createHmac("sha256", otpSecret()).update(`${id}:${code}`).digest("hex");
export interface OtpProvider {
  code(): string;
  send(mobile: string, code: string): Promise<void>;
}
export function otpProvider(): OtpProvider {
  if (process.env.OTP_PROVIDER !== "test")
    throw new AppError(
      503,
      "AUTH_UNAVAILABLE",
      "An SMS provider must be configured.",
    );
  const code = process.env.OTP_TEST_CODE;
  if (!code || !/^\d{6}$/.test(code))
    throw new AppError(
      503,
      "AUTH_UNAVAILABLE",
      "Test provider is not configured.",
    );
  return {
    code: () => code,
    async send() {
      /* Explicit test mode, including hosted APK testing: never sends SMS or logs OTP. */
    },
  };
}
