import "server-only";
import { Types, type ClientSession } from "mongoose";
import { Listing } from "../models";
import { ListingInterest } from "../models/listing-interest";
import { visiblePipeline } from "./listings";
import { discoveryVillageIds } from "./village-discovery";

export async function visibleSellerContact(
  id: string,
  villageId: string,
  session: ClientSession,
) {
  const [row] = await Listing.aggregate<{
    sellerId: string;
    name: string;
    mobile: string | null;
    productName: string;
    productNameMr: string | null;
    quantity: number;
    minimumPurchaseQuantity: number | null;
    unit: string | null;
    photoObjectKey: string | null;
  }>([
    { $match: { _id: new Types.ObjectId(id), isDemo: { $ne: true } } },
    ...visiblePipeline(
      await discoveryVillageIds(villageId, session),
      new Date(),
    ),
    {
      $project: {
        _id: 0,
        sellerId: { $toString: "$seller" },
        productName: 1,
        productNameMr: { $ifNull: ["$productNameMr", null] },
        quantity: 1,
        minimumPurchaseQuantity: {
          $ifNull: ["$minimumPurchaseQuantity", null],
        },
        unit: { $ifNull: ["$unit", null] },
        photoObjectKey: { $ifNull: ["$photoObjectKey", null] },
        name: { $arrayElemAt: ["$sellerRecord.name", 0] },
        mobile: {
          $ifNull: [{ $arrayElemAt: ["$sellerRecord.mobile", 0] }, null],
        },
      },
    },
  ]).session(session);
  return row || null;
}

export async function recordListingInterest(
  userId: string,
  listingId: string,
  session: ClientSession,
) {
  await ListingInterest.updateOne(
    { userId, listingId },
    {
      $setOnInsert: {
        userId,
        listingId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true, session, timestamps: false },
  );
}
