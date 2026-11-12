import "server-only";
import type { z } from "zod";
import {
  mobileProfileSchema,
  updateMobileProfileSchema,
} from "@gaavli/validation";
import { User, type UserRecord } from "../models";
import { AppError } from "../utils/errors";
import { listingPhotoUrl } from "../providers/listing-photos";

function profileDto(user: UserRecord) {
  return mobileProfileSchema.parse({
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    mobile: user.mobile || null,
    address: user.address || null,
    alternativeMobile: user.alternativeMobile || null,
    occupation: user.occupation || null,
    email: user.email || null,
    photoUrl: listingPhotoUrl(user.profilePhotoObjectKey),
    version: user.__v ?? 0,
  });
}
export async function attachOwnProfilePhoto(
  userId: string,
  key: string,
  version: number,
) {
  const current = await User.findOne({ _id: userId, status: "active" }).lean();
  if (!current) throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
  // Retrying a completed attachment must not overwrite anything or bump its version.
  if (current.profilePhotoObjectKey === key)
    return profileDto(current as UserRecord);
  const user = await User.findOneAndUpdate(
    { _id: userId, status: "active", __v: version },
    { $set: { profilePhotoObjectKey: key }, $inc: { __v: 1 } },
    { new: true },
  ).lean();
  if (!user)
    throw new AppError(
      409,
      "PROFILE_CONFLICT",
      "Profile changed. Reload before saving again.",
    );
  return profileDto(user as UserRecord);
}
export async function findOwnProfile(userId: string) {
  const user = await User.findOne({ _id: userId, status: "active" }).lean();
  if (!user) throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
  return profileDto(user as UserRecord);
}
export async function updateOwnProfile(
  userId: string,
  input: z.infer<typeof updateMobileProfileSchema>,
) {
  const set: Record<string, unknown> = {
    address: input.address,
    alternativeMobile: input.alternativeMobile,
    occupation: input.occupation,
  };
  const unset: Record<string, 1> = {};
  if (input.firstName !== undefined) {
    const lastName = input.lastName ?? "";
    set.firstName = input.firstName;
    set.lastName = lastName;
    set.name = `${input.firstName} ${lastName}`.trim();
  }
  if (input.email !== undefined) {
    if (input.email) set.email = input.email;
    else unset.email = 1;
  }
  let user;
  try {
    user = await User.findOneAndUpdate(
      { _id: userId, status: "active", __v: input.version },
      {
        $set: set,
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
        $inc: { __v: 1 },
      },
      { new: true, runValidators: true },
    ).lean();
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      throw new AppError(
        409,
        "EMAIL_TAKEN",
        "That email is already used by another account.",
      );
    throw error;
  }
  if (!user) {
    if (!(await User.exists({ _id: userId, status: "active" })))
      throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
    throw new AppError(
      409,
      "PROFILE_CONFLICT",
      "Profile changed. Reload before saving again.",
    );
  }
  return profileDto(user as UserRecord);
}
