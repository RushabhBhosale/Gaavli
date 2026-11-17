import "server-only";
import type { z } from "zod";
import type { pushDeviceInputSchema } from "@gaavli/validation";
import { MobileSession } from "../models/mobile-auth";
import { PushDevice } from "../models/push-device";
import type { requireMobileSession } from "./mobile-auth";

type Auth = Awaited<ReturnType<typeof requireMobileSession>>;

export function getPushDeviceStatus({ session }: Auth) {
  return { enabled: session.pushEnabled === true };
}

export async function registerPushDevice(
  { session }: Auth,
  input: z.infer<typeof pushDeviceInputSchema>,
  optIn: boolean,
) {
  const registeredAt = new Date();
  const active = await MobileSession.updateOne(
    {
      _id: session._id,
      expiresAt: { $gt: registeredAt },
      ...(optIn ? {} : { pushEnabled: true }),
    },
    { $set: { pushEnabled: true } },
    { timestamps: false },
  );
  if (!active.matchedCount) return { enabled: false };
  await PushDevice.updateOne(
    { _id: input.token },
    {
      $set: {
        sessionId: session._id,
        userId: session.user,
        language: input.language,
        expiresAt: session.expiresAt,
        registeredAt,
      },
    },
    { upsert: true },
  );
  await PushDevice.deleteMany({
    sessionId: session._id,
    _id: { $ne: input.token },
    registeredAt: { $lt: registeredAt },
  });
  return { enabled: true };
}

export async function disablePushDevice({ session }: Auth) {
  await MobileSession.updateOne(
    { _id: session._id },
    { $set: { pushEnabled: false } },
    { timestamps: false },
  );
  await PushDevice.deleteMany({ sessionId: session._id });
  return { enabled: false };
}
