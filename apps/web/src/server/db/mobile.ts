import "server-only";
import { connectDb } from "./connect";
import { User, Village } from "../models";
import {
  OtpChallenge,
  MobileSession,
  MobileRateLimit,
  MobileAuthEvent,
} from "../models/mobile-auth";
export async function connectMobileDb() {
  await connectDb();
  // Unique identities and the geo index must exist before accepting requests.
  await Promise.all([
    User.init(),
    Village.init(),
    OtpChallenge.init(),
    MobileSession.init(),
    MobileRateLimit.init(),
    MobileAuthEvent.init(),
  ]);
}
