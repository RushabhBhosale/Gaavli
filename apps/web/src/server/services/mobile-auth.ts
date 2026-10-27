import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import type { z } from "zod";
import type { sendOtpSchema, verifyOtpSchema } from "@gaavli/validation";
import { connectMobileDb as connectDb } from "../db/mobile";
import { User, type UserRecord } from "../models";
import {
  OtpChallenge,
  MobileSession,
  MobileAuthEvent,
} from "../models/mobile-auth";
import {
  ACCESS_MS,
  SESSION_MS,
  OTP_LIFETIME_MS,
  RESEND_MS,
  OTP_REQUEST_LIMITS_ENABLED,
  MAX_OTP_ATTEMPTS,
  otpProvider,
  otpDigest,
  hashToken,
  newToken,
} from "../auth/mobile-policy";
import { limitRequests, mobileUserDto } from "../repositories/mobile";
import { AppError } from "../utils/errors";

const audit = (challengeId: string, action: string) =>
  MobileAuthEvent.create({
    challengeId,
    action,
    expiresAt: new Date(Date.now() + 30 * 86400_000),
  });
export async function sendOtp(
  input: z.infer<typeof sendOtpSchema>,
  network: string,
) {
  const provider = otpProvider();
  const id = randomUUID();
  const code = provider.code();
  const codeHash = otpDigest(id, code);
  await connectDb();
  if (OTP_REQUEST_LIMITS_ENABLED) {
    await limitRequests("send-network", network, 30, 3600_000);
    await limitRequests("send-phone", input.mobile, 5, 3600_000);
  }
  // The existing named payload registers; mobile-only payloads log in.
  if (!("firstName" in input)) {
    const accounts = await User.find({
      mobile: {
        $in: [input.mobile, `+91${input.mobile}`, `91${input.mobile}`],
      },
    })
      .select("status")
      .lean();
    if (!accounts.length)
      throw new AppError(
        404,
        "REGISTRATION_REQUIRED",
        "This mobile number is not registered. Please register first.",
      );
    if (accounts.length > 1)
      throw new AppError(
        409,
        "ACCOUNT_CONFLICT",
        "Contact support to resolve this account.",
      );
    if (accounts[0].status !== "active")
      throw new AppError(
        403,
        "ACCOUNT_UNAVAILABLE",
        "This account is not active.",
      );
  }
  const now = Date.now();
  const expiresAt = new Date(now + OTP_LIFETIME_MS);
  const resendAt = new Date(now + (OTP_REQUEST_LIMITS_ENABLED ? RESEND_MS : 0));
  try {
    await OtpChallenge.findOneAndUpdate(
      {
        mobile: input.mobile,
        ...(OTP_REQUEST_LIMITS_ENABLED
          ? { resendAt: { $lte: new Date(now) } }
          : {}),
      },
      {
        $set: {
          ...input,
          // Clear any names left by an earlier registration challenge.
          firstName: "firstName" in input ? input.firstName : null,
          lastName: "lastName" in input ? input.lastName : null,
          challengeId: id,
          codeHash,
          expiresAt,
          resendAt,
          attempts: 0,
          consumed: false,
          deleteAt: new Date(now + 86400_000),
        },
      },
      { new: true, upsert: true, runValidators: true },
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      throw new AppError(
        429,
        "OTP_THROTTLED",
        "Please wait before requesting another code.",
      );
    throw error;
  }
  try {
    await provider.send(input.mobile, code);
  } catch {
    throw new AppError(
      503,
      "OTP_DELIVERY_FAILED",
      "Could not send the code. Try again later.",
    );
  }
  return {
    challengeId: id,
    expiresAt: expiresAt.toISOString(),
    resendAt: resendAt.toISOString(),
  };
}

export async function verifyOtp(
  input: z.infer<typeof verifyOtpSchema>,
  network: string,
) {
  otpProvider(); // Test challenges require the explicitly configured test provider.
  await connectDb();
  await limitRequests("verify-network", network, 100, 3600_000);
  const challenge = await OtpChallenge.findOneAndUpdate(
    {
      challengeId: input.challengeId,
      consumed: false,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: MAX_OTP_ATTEMPTS },
    },
    { $inc: { attempts: 1 } },
    { new: true },
  );
  if (!challenge) {
    const old = await OtpChallenge.findOne({
      challengeId: input.challengeId,
    }).lean();
    await audit(input.challengeId, "otp.rejected");
    if (old && old.attempts >= MAX_OTP_ATTEMPTS)
      throw new AppError(429, "OTP_ATTEMPTS_EXCEEDED", "Request a new code.");
    throw new AppError(400, "OTP_EXPIRED", "Request a new code.");
  }
  if (
    !timingSafeEqual(
      Buffer.from(challenge.codeHash, "hex"),
      Buffer.from(otpDigest(input.challengeId, input.code), "hex"),
    )
  ) {
    await audit(input.challengeId, "otp.incorrect");
    throw new AppError(
      challenge.attempts >= MAX_OTP_ATTEMPTS ? 429 : 400,
      challenge.attempts >= MAX_OTP_ATTEMPTS
        ? "OTP_ATTEMPTS_EXCEEDED"
        : "OTP_INVALID",
      "Check the verification code.",
    );
  }
  const accessToken = newToken(),
    refreshToken = newToken();
  const accessExpiresAt = new Date(Date.now() + ACCESS_MS);
  const user = await User.db.transaction(async (session) => {
    const consumed = await OtpChallenge.updateOne(
      {
        challengeId: input.challengeId,
        consumed: false,
        expiresAt: { $gt: new Date() },
      },
      { $set: { consumed: true } },
      { session },
    );
    if (!consumed.modifiedCount)
      throw new AppError(400, "OTP_EXPIRED", "Request a new code.");
    // Legacy +91 forms are recognized, never silently merged when ambiguous.
    const matches = await User.find({
      mobile: {
        $in: [
          challenge.mobile,
          `+91${challenge.mobile}`,
          `91${challenge.mobile}`,
        ],
      },
    }).session(session);
    if (matches.length > 1)
      throw new AppError(
        409,
        "ACCOUNT_CONFLICT",
        "Contact support to resolve this account.",
      );
    let account = matches[0];
    if (!account) {
      const named = challenge.firstName && challenge.lastName;
      // An account removed after login OTP issuance must never be recreated.
      if (!named)
        throw new AppError(
          404,
          "REGISTRATION_REQUIRED",
          "This mobile number is not registered. Please register first.",
        );
      [account] = await User.create(
        [
          {
            name: named
              ? `${challenge.firstName} ${challenge.lastName}`
              : challenge.mobile,
            firstName: named ? challenge.firstName : undefined,
            lastName: named ? challenge.lastName : undefined,
            mobile: challenge.mobile,
            mobileVerified: true,
            registeredAt: new Date(),
            roles: ["buyer"],
            status: "active",
            preferredLanguage: challenge.language,
            village: null,
          },
        ],
        { session },
      );
    } else {
      if (account.status !== "active")
        throw new AppError(
          403,
          "ACCOUNT_UNAVAILABLE",
          "This account is not active.",
        );
      // Preserve existing names, roles and village, including legacy unsplit display names.
      account.mobile = challenge.mobile;
      account.mobileVerified = true;
      if (!account.registeredAt)
        account.registeredAt = account.preRegisteredAt
          ? new Date()
          : account.createdAt;
      account.preferredLanguage = challenge.language;
      await account.save({ session });
    }
    await MobileSession.create(
      [
        {
          provider: "test",
          user: account._id,
          accessHash: hashToken(accessToken),
          refreshHash: hashToken(refreshToken),
          accessExpiresAt,
          expiresAt: new Date(Date.now() + SESSION_MS),
        },
      ],
      { session },
    );
    await MobileAuthEvent.create(
      [
        {
          challengeId: input.challengeId,
          action: "otp.verified",
          expiresAt: new Date(Date.now() + 30 * 86400_000),
        },
      ],
      { session },
    );
    return account.toObject() as UserRecord;
  });
  return {
    accessToken,
    refreshToken,
    accessExpiresAt: accessExpiresAt.toISOString(),
    user: await mobileUserDto(user),
  };
}

export async function optionalMobile(request: Request) {
  if (!request.headers.get("authorization")) {
    // Guest reads also need a connection before querying Mongoose models.
    await connectDb();
    return null;
  }
  return requireMobile(request);
}
export async function requireMobile(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
  await connectDb();
  const session = await MobileSession.findOne({
    accessHash: hashToken(token),
    accessExpiresAt: { $gt: new Date() },
    expiresAt: { $gt: new Date() },
  }).lean();
  const user =
    session &&
    (await User.findOne({ _id: session.user, status: "active" }).lean());
  if (!user) throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
  return user as UserRecord;
}
export async function refreshMobile(refreshToken: string) {
  await connectDb();
  const saved = await MobileSession.findOne({
    refreshHash: hashToken(refreshToken),
    expiresAt: { $gt: new Date() },
  }).lean();
  const user =
    saved && (await User.findOne({ _id: saved.user, status: "active" }).lean());
  if (!user) throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
  const accessToken = newToken(),
    accessExpiresAt = new Date(Date.now() + ACCESS_MS);
  const changed = await MobileSession.updateOne(
    { _id: saved!._id, expiresAt: { $gt: new Date() } },
    {
      $set: {
        accessHash: hashToken(accessToken),
        accessExpiresAt,
        expiresAt: new Date(Date.now() + SESSION_MS),
      },
    },
  );
  if (!changed.matchedCount)
    throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
  // Stable refresh secret makes a retry safe when connectivity drops after renewal.
  return {
    accessToken,
    refreshToken,
    accessExpiresAt: accessExpiresAt.toISOString(),
    user: await mobileUserDto(user as UserRecord),
  };
}
export async function logoutMobile(refreshToken: string) {
  await connectDb();
  await MobileSession.deleteOne({ refreshHash: hashToken(refreshToken) });
  return { loggedOut: true as const };
}
