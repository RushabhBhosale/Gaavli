import "server-only";
import type { ClientSession } from "mongoose";
import { Notification } from "../models";
import { AppError } from "../utils/errors";

export async function saveSellerContactNotice(
  sellerId: string,
  buyerId: string,
  listingId: string,
  buyerName: string,
  productName: string,
  productNameMr: string | null,
  session: ClientSession,
  details: {
    quantity?: number;
    callbackConsent?: boolean;
    message?: string;
    photoObjectKey?: string | null;
    unit?: string | null;
    sellerName?: string;
    buyerVillageName?: string;
    buyerVillageNameMr?: string;
    sellerVillageName?: string;
    sellerVillageNameMr?: string;
  } = {},
) {
  const existing = await Notification.findOne({
    userId: sellerId,
    type: "BUYER_TRIED_CONTACT",
    "data.listingId": listingId,
    "data.buyerId": buyerId,
    createdAt: { $gte: new Date(Date.now() - 86400_000) },
  }).session(session);
  if (existing) {
    if (
      (existing.data?.quantity ?? null) !== (details.quantity ?? null) ||
      !!existing.data?.callbackConsent !== !!details.callbackConsent ||
      (existing.data?.message || "") !== (details.message || "")
    )
      throw new AppError(
        409,
        "REQUEST_ALREADY_SENT",
        "A request was already sent for this product. Check My Activity.",
      );
    return existing;
  }
  const [notice] = await Notification.create(
    [
      {
        userId: sellerId,
        type: "BUYER_TRIED_CONTACT",
        title: "A buyer tried to reach you",
        titleMr: "एका खरेदीदाराने संपर्क करण्याचा प्रयत्न केला",
        body: `${buyerName} tried to reach you about ${productName}. They are interested in your product.${details.message ? `\n${details.message}` : ""}`,
        bodyMr: `${buyerName} यांनी ${productNameMr || productName} बद्दल संपर्क करण्याचा प्रयत्न केला. त्यांना तुमच्या उत्पादनात रस आहे.${details.message ? `\n${details.message}` : ""}`,
        data: {
          ...details,
          listingId,
          buyerId,
          buyerName,
          productName,
          productNameMr,
        },
      },
    ],
    { session },
  );
  return notice;
}

export async function findUserNotifications(
  userId: string,
  page: number,
  limit: number,
  language: "mr" | "en",
  includeReadState = false,
) {
  const filter = { userId };
  const [rows, total] = await Promise.all([
    Notification.find(filter)
      .select("type title body titleMr bodyMr createdAt readAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);
  return {
    notifications: rows.map((row) => ({
      id: String(row._id),
      type: row.type,
      title: language === "mr" ? row.titleMr || row.title : row.title,
      body: language === "mr" ? row.bodyMr || row.body : row.body,
      createdAt: row.createdAt.toISOString(),
      ...(includeReadState
        ? { readAt: row.readAt?.toISOString() || null }
        : {}),
    })),
    total,
    page,
    limit,
  };
}
