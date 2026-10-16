import "server-only";
import { Types, type PipelineStage } from "mongoose";
import type { z } from "zod";
import type { MobileListing, MobileListingPage } from "@gaavli/types";
import type { mobileListingsQuerySchema } from "@gaavli/validation";
import { Listing, User, Village, Category } from "../models";
import { activeStockFilter } from "./listing-mutations";

// Read only: no seller name, phone, address, credentials or raw Mongo documents.
export const visiblePipeline = (
  villageId: string,
  now: Date,
): PipelineStage[] => [
  {
    $match: {
      village: new Types.ObjectId(villageId),
      ...activeStockFilter(now),
      ...(process.env.NODE_ENV === "production"
        ? { isDemo: { $ne: true } }
        : {}),
    },
  },
  {
    $lookup: {
      from: User.collection.name,
      localField: "seller",
      foreignField: "_id",
      as: "sellerRecord",
    },
  },
  { $match: { "sellerRecord.status": "active" } },
  {
    $lookup: {
      from: Village.collection.name,
      localField: "village",
      foreignField: "_id",
      as: "villageRecord",
    },
  },
  { $unwind: "$villageRecord" },
  { $match: { "villageRecord.isActive": true } },
  {
    $lookup: {
      from: Category.collection.name,
      localField: "category",
      foreignField: "code",
      as: "categoryRecord",
    },
  },
  { $match: { "categoryRecord.status": { $ne: "INACTIVE" } } },
];
const dtoProjection = {
  _id: 0,
  id: { $toString: "$_id" },
  productName: 1,
  photoObjectKey: { $ifNull: ["$photoObjectKey", null] },
  isDemo: { $ifNull: ["$isDemo", false] },
  productNameMr: { $ifNull: ["$productNameMr", null] },
  category: { $ifNull: ["$category", null] },
  categoryName: {
    $ifNull: [{ $arrayElemAt: ["$categoryRecord.name", 0] }, "$category", null],
  },
  categoryNameMr: {
    $ifNull: [{ $arrayElemAt: ["$categoryRecord.nameMr", 0] }, null],
  },
  quantity: { $ifNull: ["$quantity", null] },
  unit: { $ifNull: ["$unit", null] },
  price: { $ifNull: ["$price", null] },
  minimumPurchaseQuantity: { $ifNull: ["$minimumPurchaseQuantity", null] },
  fulfillmentOptions: { $ifNull: ["$fulfillmentOptions", []] },
  village: {
    id: { $toString: "$villageRecord._id" },
    name: "$villageRecord.nameEn",
    nameMr: "$villageRecord.nameMr",
    taluka: { $ifNull: ["$villageRecord.taluka", ""] },
    district: { $ifNull: ["$villageRecord.district", ""] },
    pinCode: { $ifNull: ["$villageRecord.pinCode", null] },
  },
  createdAt: {
    $dateToString: { date: "$createdAt", format: "%Y-%m-%dT%H:%M:%S.%LZ" },
  },
  updatedAt: {
    $dateToString: { date: "$updatedAt", format: "%Y-%m-%dT%H:%M:%S.%LZ" },
  },
  expiresAt: {
    $dateToString: { date: "$expiresAt", format: "%Y-%m-%dT%H:%M:%S.%LZ" },
  },
};

export async function findMobileListings(
  villageId: string,
  query: z.infer<typeof mobileListingsQuerySchema>,
  viewerId: string,
) {
  const search = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filters: PipelineStage.Match[] = [
    ...(search
      ? [
          {
            $match: {
              $or: ["productName", "productNameMr"].map((key) => ({
                [key]: { $regex: search, $options: "i" },
              })),
            },
          },
        ]
      : []),
    ...(query.category ? [{ $match: { category: query.category } }] : []),
    ...(query.productGroup
      ? [{ $match: { productGroup: query.productGroup } }]
      : []),
  ];
  const [result] = await Listing.aggregate<{
    listings: (Omit<MobileListing, "photoUrl"> & {
      photoObjectKey: string | null;
    })[];
    count: { total: number }[];
    categories: MobileListingPage["categories"];
  }>([
    { $match: { seller: { $ne: new Types.ObjectId(viewerId) } } },
    ...visiblePipeline(villageId, new Date()),
    {
      $facet: {
        listings: [
          ...filters,
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
          { $project: dtoProjection },
        ],
        count: [...filters, { $count: "total" }],
        categories: [
          { $match: { category: { $type: "string", $ne: "" } } },
          {
            $group: {
              _id: "$category",
              name: {
                $first: {
                  $ifNull: [
                    { $arrayElemAt: ["$categoryRecord.name", 0] },
                    "$category",
                  ],
                },
              },
              nameMr: {
                $first: {
                  $ifNull: [
                    { $arrayElemAt: ["$categoryRecord.nameMr", 0] },
                    null,
                  ],
                },
              },
            },
          },
          { $sort: { name: 1, _id: 1 } },
          { $project: { _id: 0, code: "$_id", name: 1, nameMr: 1 } },
        ],
      },
    },
  ]);
  return {
    listings: result?.listings || [],
    total: result?.count[0]?.total || 0,
    categories: result?.categories || [],
    page: query.page,
    limit: query.limit,
  };
}
export async function findMobileListing(villageId: string, id: string) {
  const [listing] = await Listing.aggregate<
    Omit<MobileListing, "photoUrl"> & { photoObjectKey: string | null }
  >([
    { $match: { _id: new Types.ObjectId(id) } },
    ...visiblePipeline(villageId, new Date()),
    { $project: dtoProjection },
  ]);
  return listing || null;
}
