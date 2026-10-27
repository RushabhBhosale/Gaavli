import "server-only";
import { Types, type PipelineStage } from "mongoose";
import type { z } from "zod";
import type { MobileListing, MobileListingPage } from "@gaavli/types";
import type { mobileListingsQuerySchema } from "@gaavli/validation";
import { LISTING_PRODUCT_GROUPS } from "@gaavli/constants";
import { Listing, User, Village, Category } from "../models";
import { activeStockFilter } from "./listing-mutations";
import { discoveryVillageIds } from "./village-discovery";
import { masterSearchMappings } from "./product-master";

// Read only: no seller name, phone, address, credentials or raw Mongo documents.
export const visiblePipeline = (
  villageId: string | string[] | null,
  now: Date,
): PipelineStage[] => [
  {
    $match: {
      ...(villageId === null
        ? {}
        : {
            village: {
              $in: (Array.isArray(villageId) ? villageId : [villageId]).map(
                (id) => new Types.ObjectId(id),
              ),
            },
          }),
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
  description: { $ifNull: ["$description", null] },
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
  viewerId: string | null,
  allowedVillageIds: string[],
) {
  const terms = [...new Set(query.search.trim().split(/\s+/).filter(Boolean))];
  const mappings = terms.length ? await masterSearchMappings(query.search) : [];
  const literalTerms = (words: string[], fields: string[]) => ({
    $and: words.map((term) => ({
      $or: fields.map((key) => ({
        [key]: {
          $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        },
      })),
    })),
  });
  const filters: PipelineStage.Match[] = [
    ...(terms.length
      ? [
          {
            $match: {
              $or: [
                literalTerms(terms, [
                  "productName",
                  "productNameMr",
                  "description",
                ]),
                ...mappings.flatMap((product) => [
                  { productId: product._id },
                  ...[product.nameEn, product.nameMr].map((name) =>
                    literalTerms(name.split(/\s+/), [
                      "productName",
                      "productNameMr",
                    ]),
                  ),
                ]),
              ],
            },
          },
        ]
      : []),
    ...(query.category ? [{ $match: { category: query.category } }] : []),
  ];
  const productGroupFilter: PipelineStage.Match[] = query.productGroup
    ? [{ $match: { productGroup: query.productGroup } }]
    : [];
  const selectedVillage: PipelineStage.Match[] = query.villageId
    ? [{ $match: { village: new Types.ObjectId(query.villageId) } }]
    : [];
  const [aggregation, villageRows] = await Promise.all([
    Listing.aggregate<{
      listings: (Omit<MobileListing, "photoUrl"> & {
        photoObjectKey: string | null;
      })[];
      count: { total: number }[];
      categories: MobileListingPage["categories"];
      villageCounts: { id: string; count: number }[];
      productGroupCounts: { productGroup: string; count: number }[];
    }>([
      ...(viewerId
        ? [{ $match: { seller: { $ne: new Types.ObjectId(viewerId) } } }]
        : []),
      ...visiblePipeline(allowedVillageIds, new Date()),
      {
        $facet: {
          listings: [
            ...filters,
            ...productGroupFilter,
            ...selectedVillage,
            { $sort: { createdAt: -1, _id: -1 } },
            { $skip: (query.page - 1) * query.limit },
            { $limit: query.limit },
            { $project: dtoProjection },
          ],
          count: [
            ...filters,
            ...productGroupFilter,
            ...selectedVillage,
            { $count: "total" },
          ],
          villageCounts: [
            ...filters,
            ...productGroupFilter,
            { $group: { _id: "$village", count: { $sum: 1 } } },
            { $project: { _id: 0, id: { $toString: "$_id" }, count: 1 } },
          ],
          productGroupCounts: [
            ...filters,
            ...selectedVillage,
            { $match: { productGroup: { $in: LISTING_PRODUCT_GROUPS } } },
            { $group: { _id: "$productGroup", count: { $sum: 1 } } },
            { $project: { _id: 0, productGroup: "$_id", count: 1 } },
          ],
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
    ]),
    Village.find({ _id: { $in: allowedVillageIds }, isActive: true })
      .select("nameEn nameMr")
      .sort({ nameEn: 1, _id: 1 })
      .lean(),
  ]);
  const result = aggregation[0];
  const counts = new Map(
    result?.villageCounts.map((row) => [row.id, row.count]) || [],
  );
  const orderedVillages = [
    ...villageRows.filter((row) => String(row._id) === villageId),
    ...villageRows.filter((row) => String(row._id) !== villageId),
  ];
  return {
    listings: result?.listings || [],
    total: result?.count[0]?.total || 0,
    categories: result?.categories || [],
    ...(query.includeProductGroupCounts
      ? {
          productGroupCounts: LISTING_PRODUCT_GROUPS.map((productGroup) => ({
            productGroup,
            count:
              result?.productGroupCounts.find(
                (row) => row.productGroup === productGroup,
              )?.count || 0,
          })),
        }
      : {}),
    villageCounts: orderedVillages.map((row) => ({
      id: String(row._id),
      name: row.nameEn || "",
      nameMr: row.nameMr || row.nameEn || "",
      count: counts.get(String(row._id)) || 0,
    })),
    page: query.page,
    limit: query.limit,
  };
}
export async function findMobileListing(villageId: string, id: string) {
  const [listing] = await Listing.aggregate<
    Omit<MobileListing, "photoUrl"> & { photoObjectKey: string | null }
  >([
    { $match: { _id: new Types.ObjectId(id) } },
    ...visiblePipeline(await discoveryVillageIds(villageId), new Date()),
    { $project: dtoProjection },
  ]);
  return listing || null;
}
