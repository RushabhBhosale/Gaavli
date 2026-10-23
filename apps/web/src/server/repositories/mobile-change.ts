import "server-only";
import { User } from "../models";
import {
  MobilePhoneChange,
  MobileSession,
  OtpChallenge,
} from "../models/mobile-auth";
import { AppError } from "../utils/errors";

export const phoneForms = (mobile: string) => [
  mobile,
  `+91${mobile}`,
  `91${mobile}`,
];
export async function assertMobileAvailable(userId: string, mobile: string) {
  if (
    await User.exists({
      _id: { $ne: userId },
      mobile: { $in: phoneForms(mobile) },
    })
  )
    throw new AppError(
      409,
      "MOBILE_UNAVAILABLE",
      "This number cannot be used.",
    );
}
export async function createMobileChange(input: {
  userId: string;
  oldMobile: string;
  mobile: string;
  challengeId: string;
  codeHash: string;
  expiresAt: Date;
  resendAt: Date;
}) {
  const { userId, ...fields } = input;
  try {
    return await MobilePhoneChange.findOneAndUpdate(
      { user: userId, resendAt: { $lte: new Date() } },
      {
        $set: {
          ...fields,
          attempts: 0,
          consumed: false,
          deleteAt: new Date(Date.now() + 86400_000),
        },
      },
      { upsert: true, new: true, runValidators: true },
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
}
export async function attemptMobileChange(
  userId: string,
  challengeId: string,
  maxAttempts: number,
) {
  const challenge = await MobilePhoneChange.findOneAndUpdate(
    {
      user: userId,
      challengeId,
      consumed: false,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: maxAttempts },
    },
    { $inc: { attempts: 1 } },
    { new: true },
  ).lean();
  if (!challenge) {
    const old = await MobilePhoneChange.findOne({
      user: userId,
      challengeId,
    }).lean();
    throw new AppError(
      400,
      old && old.attempts >= maxAttempts
        ? "OTP_ATTEMPTS_EXCEEDED"
        : "OTP_EXPIRED",
      "Request a new code.",
    );
  }
  return challenge;
}
export async function commitMobileChange(
  userId: string,
  challengeId: string,
  keepAccessHash: string,
) {
  try {
    await User.db.transaction(async (session) => {
      const challenge = await MobilePhoneChange.findOneAndUpdate(
        {
          user: userId,
          challengeId,
          consumed: false,
          expiresAt: { $gt: new Date() },
        },
        { $set: { consumed: true } },
        { new: true, session },
      );
      if (!challenge)
        throw new AppError(400, "OTP_EXPIRED", "Request a new code.");
      // Recheck active session in the transaction; a revoked session cannot change identity.
      if (
        !(await MobileSession.exists({
          user: userId,
          accessHash: keepAccessHash,
          accessExpiresAt: { $gt: new Date() },
          expiresAt: { $gt: new Date() },
        }).session(session))
      )
        throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
      if (
        await User.exists({
          _id: { $ne: userId },
          mobile: { $in: phoneForms(challenge.mobile) },
        }).session(session)
      )
        throw new AppError(
          409,
          "MOBILE_UNAVAILABLE",
          "This number cannot be used.",
        );
      const changed = await User.updateOne(
        { _id: userId, status: "active", mobile: challenge.oldMobile },
        {
          $set: { mobile: challenge.mobile, mobileVerified: true },
          $inc: { __v: 1 },
        },
        { session },
      );
      if (!changed.modifiedCount)
        throw new AppError(
          409,
          "PROFILE_CONFLICT",
          "Profile changed. Reload and try again.",
        );
      await OtpChallenge.deleteMany(
        {
          mobile: {
            $in: [
              ...phoneForms(
                challenge.oldMobile.replace(/^\+?91(?=\d{10}$)/, ""),
              ),
              ...phoneForms(challenge.mobile),
            ],
          },
        },
        { session },
      );
      await MobileSession.deleteMany(
        { user: userId, accessHash: { $ne: keepAccessHash } },
        { session },
      );
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      throw new AppError(
        409,
        "MOBILE_UNAVAILABLE",
        "This number cannot be used.",
      );
    throw error;
  }
}
