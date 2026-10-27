import "server-only";
import type { z } from "zod";
import {
  requestPageSchema,
  requestStateSchema,
  requestContactSchema,
  indianMobileSchema,
  type requestsQuerySchema,
} from "@gaavli/validation";
import { connectMobileDb } from "../db/mobile";
import { Notification, User } from "../models";
import { ListingInterest } from "../models/listing-interest";
import { findActivityRequests, requestState } from "../repositories/requests";
import { accessibleSellerContact } from "../repositories/listing-contact";
import { limitRequests } from "../repositories/mobile";
import { AppError } from "../utils/errors";

export async function getActivityRequests(
  userId: string,
  query: z.infer<typeof requestsQuerySchema>,
) {
  await connectMobileDb();
  return requestPageSchema.parse(await findActivityRequests(userId, query));
}

export async function updateActivityRequest(
  userId: string,
  id: string,
  action: "seen" | "responded",
) {
  await connectMobileDb();
  await limitRequests("request-status", userId, 120, 3600_000);
  return User.db.transaction(async (session) => {
    const actor = await User.findOneAndUpdate(
      { _id: userId, status: "active" },
      { $inc: { __v: 1 } },
      { session, new: true },
    );
    if (!actor) throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
    const filter = { _id: id, userId, type: "BUYER_TRIED_CONTACT" };
    const row = await Notification.findOne(filter).session(session);
    if (!row)
      throw new AppError(404, "REQUEST_UNAVAILABLE", "Request unavailable.");
    const now = new Date();
    if (!row.readAt) row.readAt = now;
    if (action === "responded" && !row.respondedAt) row.respondedAt = now;
    if (row.isModified()) await row.save({ session });
    return requestStateSchema.parse(requestState(row));
  });
}

export async function getRequestContact(userId: string, id: string) {
  await connectMobileDb();
  await limitRequests("request-contact", userId, 60, 3600_000);
  return User.db.transaction(async (session) => {
    const actor = await User.findOne({ _id: userId, status: "active" }).session(
      session,
    );
    if (!actor) throw new AppError(401, "AUTH_REQUIRED", "Sign in again.");
    const row = await Notification.findOne({
      _id: id,
      type: "BUYER_TRIED_CONTACT",
      $or: [{ userId }, { "data.buyerId": userId }],
    }).session(session);
    if (!row?.data?.buyerId || !row.data.listingId)
      throw new AppError(404, "REQUEST_UNAVAILABLE", "Request unavailable.");
    const received = String(row.userId) === userId;
    if (received && row.data.callbackConsent !== true)
      throw new AppError(
        403,
        "CONTACT_PERMISSION_REQUIRED",
        "Buyer has not shared callback permission.",
      );
    const buyer = await User.findOne({
      _id: row.data.buyerId,
      status: "active",
    }).session(session);
    if (
      !buyer ||
      !(await ListingInterest.exists({
        userId: buyer._id,
        listingId: row.data.listingId,
      }).session(session))
    )
      throw new AppError(422, "CONTACT_UNAVAILABLE", "Contact unavailable.");
    const seller = await accessibleSellerContact(
      String(row.data.listingId),
      session,
    );
    if (!seller || seller.sellerId !== String(row.userId))
      throw new AppError(422, "CONTACT_UNAVAILABLE", "Contact unavailable.");
    const mobile = indianMobileSchema.safeParse(
      received ? buyer.mobile : seller.mobile,
    );
    if (!mobile.success)
      throw new AppError(422, "CONTACT_UNAVAILABLE", "Contact unavailable.");
    return requestContactSchema.parse({
      requestId: id,
      name: received ? buyer.name : seller.name,
      mobile: `+91${mobile.data}`,
    });
  });
}
