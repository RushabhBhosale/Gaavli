import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { indianMobileSchema } from "@gaavli/validation";
import { connectMobileDb } from "../db/mobile";
import { MobilePhoneChange } from "../models/mobile-auth";
import type { UserRecord } from "../models";
import {
  hashToken,
  otpProvider,
  otpDigest,
  OTP_LIFETIME_MS,
  RESEND_MS,
  MAX_OTP_ATTEMPTS,
} from "../auth/mobile-policy";
import { limitRequests } from "../repositories/mobile";
import {
  assertMobileAvailable,
  createMobileChange,
  attemptMobileChange,
  commitMobileChange,
} from "../repositories/mobile-change";
import { findOwnProfile } from "../repositories/profile";
import { AppError } from "../utils/errors";

export async function sendMobileChangeOtp(
  user: UserRecord,
  mobile: string,
  network: string,
) {
  const provider = otpProvider();
  await connectMobileDb();
  await MobilePhoneChange.init();
  const oldMobile = indianMobileSchema.safeParse(user.mobile);
  if (!oldMobile.success || oldMobile.data === mobile)
    throw new AppError(
      422,
      "MOBILE_UNAVAILABLE",
      "Choose a different mobile number.",
    );
  await limitRequests("mobile-change-user", String(user._id), 5, 3600_000);
  await limitRequests("mobile-change-network", network, 30, 3600_000);
  await assertMobileAvailable(String(user._id), mobile);
  const challengeId = randomUUID();
  const code = provider.code();
  const expiresAt = new Date(Date.now() + OTP_LIFETIME_MS);
  const resendAt = new Date(Date.now() + RESEND_MS);
  await createMobileChange({
    userId: String(user._id),
    oldMobile: user.mobile!,
    mobile,
    challengeId,
    codeHash: otpDigest(challengeId, code),
    expiresAt,
    resendAt,
  });
  try {
    await provider.send(mobile, code);
  } catch {
    throw new AppError(
      503,
      "OTP_DELIVERY_FAILED",
      "Could not send the code. Try again later.",
    );
  }
  return {
    challengeId,
    expiresAt: expiresAt.toISOString(),
    resendAt: resendAt.toISOString(),
  };
}
export async function verifyMobileChangeOtp(
  userId: string,
  input: { challengeId: string; code: string },
  token: string,
) {
  otpProvider(); // The explicit test-provider switch also applies to mobile changes.
  await connectMobileDb();
  await MobilePhoneChange.init();
  await limitRequests("mobile-change-verify", userId, 30, 3600_000);
  const challenge = await attemptMobileChange(
    userId,
    input.challengeId,
    MAX_OTP_ATTEMPTS,
  );
  const expected = Buffer.from(challenge.codeHash, "hex");
  const actual = Buffer.from(otpDigest(input.challengeId, input.code), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw new AppError(400, "OTP_INVALID", "Invalid code.");
  await commitMobileChange(userId, input.challengeId, hashToken(token));
  return findOwnProfile(userId);
}
