import "server-only";
import { setTimeout } from "node:timers/promises";
import { PUSH_TEST_DELAY_SECONDS } from "@gaavli/validation";
import type { MobileLanguage } from "@gaavli/types";
import type { Types } from "mongoose";
import { Notification, User } from "../models";
import { MobileSession } from "../models/mobile-auth";
import { PushDevice } from "../models/push-device";
import { firebasePushProvider } from "../providers/firebase-push";
import { limitRequests } from "../repositories/mobile";
import { AppError } from "../utils/errors";
import type { requireMobileSession } from "./mobile-auth";

const requestBody: Record<MobileLanguage, string> = {
  en: "You have a new buyer request. Open Gaavli to view it.",
  mr: "खरेदीदाराकडून नवीन विनंती आली आहे. ती पाहण्यासाठी गावली उघडा.",
  hi: "खरीदार से एक नया अनुरोध आया है। उसे देखने के लिए गावली खोलें।",
};

const testBody: Record<MobileLanguage, string> = {
  en: "This is a test notification from Gaavli.",
  mr: "ही गावलीकडून आलेली चाचणी सूचना आहे.",
  hi: "यह गावली की ओर से एक परीक्षण सूचना है।",
};

async function removeUnregisteredDevice(device: {
  _id: string;
  sessionId: Types.ObjectId;
  registeredAt: Date;
}) {
  await PushDevice.deleteOne({
    _id: device._id,
    sessionId: device.sessionId,
    registeredAt: device.registeredAt,
  });
}

export async function sendFirebaseTestPush(
  session: Awaited<ReturnType<typeof requireMobileSession>>["session"],
  token: string,
  schedule?: (task: () => Promise<void>) => void,
) {
  const provider = firebasePushProvider();
  if (!provider)
    throw new AppError(
      503,
      "FCM_NOT_CONFIGURED",
      "Set FCM_SERVICE_ACCOUNT_JSON on this deployment.",
    );
  await limitRequests("firebase-test", String(session.user), 10, 3600_000);
  const findDevice = () =>
    PushDevice.findOne({
      _id: token,
      sessionId: session._id,
      userId: session.user,
      expiresAt: { $gt: new Date() },
    }).lean();
  const device = session.pushEnabled ? await findDevice() : null;
  if (!device)
    throw new AppError(
      404,
      "FCM_DEVICE_UNAVAILABLE",
      "Enable Buyer request alerts in Gaavli on the test phone first.",
    );

  const send = async (
    target: NonNullable<Awaited<ReturnType<typeof findDevice>>>,
  ) => {
    const result = await provider
      .send({
        token: target._id,
        body: testBody[target.language as MobileLanguage] ?? testBody.en,
        kind: "firebase-test",
      })
      .catch(throwPushRequestError);
    if (result === "unregistered") {
      await removeUnregisteredDevice(target);
      throw new AppError(
        409,
        "FCM_DEVICE_UNREGISTERED",
        "Open Gaavli on the test phone to refresh its push registration, then try again.",
      );
    }
  };

  if (schedule) {
    await provider.authorize().catch(throwPushRequestError);
    schedule(async () => {
      await setTimeout(PUSH_TEST_DELAY_SECONDS * 1000);
      try {
        const [activeSession, activeUser, registeredDevice] = await Promise.all(
          [
            MobileSession.exists({
              _id: session._id,
              user: session.user,
              expiresAt: { $gt: new Date() },
              pushEnabled: true,
            }),
            User.exists({ _id: session.user, status: "active" }),
            findDevice(),
          ],
        );
        if (activeSession && activeUser && registeredDevice)
          await send(registeredDevice);
      } catch (error) {
        console.warn(
          "Scheduled Firebase test push failed",
          error instanceof AppError ? error.code : "FCM_REQUEST_FAILED",
        );
      }
    });
    return {
      status: "scheduled" as const,
      delaySeconds: PUSH_TEST_DELAY_SECONDS,
    };
  }

  await send(device);
  return { status: "accepted" as const };
}

function throwPushRequestError(error: unknown): never {
  if (error instanceof AppError) throw error;
  throw new AppError(
    502,
    "FCM_REQUEST_FAILED",
    "The Firebase request failed. Try again.",
  );
}

export async function deliverSellerRequestPush(notificationId: string) {
  try {
    const provider = firebasePushProvider();
    if (!provider) return;
    const now = new Date();
    const notice = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        type: "BUYER_TRIED_CONTACT",
        createdAt: { $gte: new Date(now.getTime() - 15 * 60_000) },
        readAt: null,
        pushAttemptedAt: null,
      },
      { $set: { pushAttemptedAt: now } },
      { timestamps: false },
    )
      .select("userId")
      .lean();
    if (
      !notice ||
      !(await User.exists({ _id: notice.userId, status: "active" }))
    )
      return;
    const sessions = await MobileSession.find({
      user: notice.userId,
      expiresAt: { $gt: now },
      pushEnabled: true,
    }).distinct("_id");
    const devices = await PushDevice.find({
      userId: notice.userId,
      sessionId: { $in: sessions },
      expiresAt: { $gt: now },
    }).lean();
    const delivered = await Promise.allSettled(
      devices.map(async (device) => {
        const result = await provider.send({
          token: device._id,
          body:
            requestBody[device.language as MobileLanguage] ?? requestBody.en,
        });
        if (result === "unregistered") await removeUnregisteredDevice(device);
      }),
    );
    if (delivered.some(({ status }) => status === "rejected"))
      console.warn("Firebase push delivery failed for one or more devices");
  } catch {
    // The committed in-app notice remains available when push cannot be sent.
    console.warn("Firebase push delivery could not be attempted");
  }
}
