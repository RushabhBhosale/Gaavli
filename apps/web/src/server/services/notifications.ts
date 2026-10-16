import "server-only";
import type { z } from "zod";
import {
  notificationPageSchema,
  notifySellerResultSchema,
  type notificationsQuerySchema,
  notifySellerInputSchema,
} from "@gaavli/validation";
import { connectMobileDb } from "../db/mobile";
import { Notification, User, Village } from "../models";
import { ListingInterest } from "../models/listing-interest";
import { listingOperation } from "../repositories/listing-mutations";
import { visibleSellerContact } from "../repositories/listing-contact";
import {
  saveSellerContactNotice,
  findUserNotifications,
} from "../repositories/notifications";
import { limitRequests } from "../repositories/mobile";
import { AppError } from "../utils/errors";

export async function notifyListingSeller(
  userId: string,
  id: string,
  key: string,
  input: z.infer<typeof notifySellerInputSchema> = {},
) {
  await connectMobileDb();
  await Promise.all([Notification.init(), ListingInterest.init()]);
  await limitRequests("notify-seller", userId, 20, 3600_000);
  return listingOperation(
    userId,
    key,
    `notify-seller:${id}`,
    input,
    async (session, user) => {
      if (
        !user.village ||
        !(await Village.exists({ _id: user.village, isActive: true }).session(
          session,
        ))
      )
        throw new AppError(
          422,
          "VILLAGE_UNAVAILABLE",
          "Select an active village.",
        );
      const row = await visibleSellerContact(id, String(user.village), session);
      if (!row)
        throw new AppError(
          404,
          "LISTING_UNAVAILABLE",
          "This listing is unavailable.",
        );
      if (row.sellerId === userId)
        throw new AppError(
          403,
          "OWN_LISTING_CONTACT",
          "This is your own listing.",
        );
      if (
        input.quantity !== undefined &&
        (!row.unit ||
          input.quantity > row.quantity ||
          input.quantity < (row.minimumPurchaseQuantity || 0))
      )
        throw new AppError(
          422,
          "REQUEST_QUANTITY_INVALID",
          "Requested quantity must be within available quantity and minimum purchase.",
        );
      if (
        !(await ListingInterest.exists({ listingId: id, userId }).session(
          session,
        ))
      )
        throw new AppError(
          403,
          "INTEREST_REQUIRED",
          "Reveal seller contact first.",
        );
      const buyer = await User.findById(userId).select("name").session(session);
      const buyerVillage = await Village.findById(user.village).session(
        session,
      );
      const seller = await User.findById(row.sellerId)
        .select("village")
        .session(session);
      const sellerVillage = seller?.village
        ? await Village.findById(seller.village).session(session)
        : null;
      const notice = await saveSellerContactNotice(
        row.sellerId,
        userId,
        id,
        buyer!.name,
        row.productName,
        row.productNameMr,
        session,
        {
          ...input,
          photoObjectKey: row.photoObjectKey,
          unit: row.unit,
          sellerName: row.name,
          buyerVillageName: buyerVillage?.nameEn,
          buyerVillageNameMr: buyerVillage?.nameMr,
          sellerVillageName: sellerVillage?.nameEn,
          sellerVillageNameMr: sellerVillage?.nameMr,
        },
      );
      return {
        status: 200,
        data: notifySellerResultSchema.parse({
          listingId: id,
          notificationId: String(notice._id),
          notified: true,
          channel: "in_app",
          createdAt: notice.createdAt.toISOString(),
        }),
      };
    },
  );
}

export async function getUserNotifications(
  userId: string,
  query: z.infer<typeof notificationsQuerySchema>,
) {
  await connectMobileDb();
  return notificationPageSchema.parse(
    await findUserNotifications(
      userId,
      query.page,
      query.limit,
      query.language,
    ),
  );
}
