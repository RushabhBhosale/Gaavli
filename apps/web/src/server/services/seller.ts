import "server-only";
import { User } from "../models";
import { mobileUserDto } from "../repositories/mobile";
import { AppError } from "../utils/errors";

// Atomic and naturally idempotent: retries never replace other capabilities.
export async function activateSeller(userId: string) {
  const updated = await User.findOneAndUpdate(
    { _id: userId, status: "active", roles: { $ne: "seller" } },
    { $addToSet: { roles: { $each: ["buyer", "seller"] } }, $inc: { __v: 1 } },
    { new: true, runValidators: true },
  );
  const user =
    updated ?? (await User.findOne({ _id: userId, status: "active" }));
  if (!user) throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
  return mobileUserDto(user);
}
