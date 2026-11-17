import "server-only";
import { Types, type PipelineStage } from "mongoose";
import type { z } from "zod";
import type { MobileListing, MobileListingPage } from "@gaavli/types";
import type { mobileListingsQuerySchema } from "@gaavli/validation";
import { LISTING_PRODUCT_GROUPS } from "@gaavli/constants";
import { Listing, User, Village, Category } from "../models";
import { ProductMaster } from "../models/product-master";
import { activeStockFilter } from "./listing-mutations";
import { discoveryVillageIds } from "./village-discovery";
import { masterSearchMappings } from "./product-master";

// Read only: no seller name, phone, address, credentials or raw Mongo documents.
export const visiblePipeline = (
  villageId: string | string[] | null,
  now: Date,
  availability: "available" | "unavailable" | "any" = "available",
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
      // "any": live, sold-out and expired listings; never reported or removed.
      ...(availability === "any"
        ? { status: { $in: ["active", "sold_out", "expired"] } }
        : availability === "unavailable"
          ? {
              $or: [
                { status: { $in: ["sold_out", "expired"] } },
                { status: "active", quantity: { $lte: 0 } },
                { status: "active", expiresAt: { $lte: now, $type: "date" } },
              ],
            }
          : activeStockFilter(now)),
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
// Hindi names live only on the master product, so they are joined after
// pagination instead of being copied onto every listing.
export const productNameStage: PipelineStage.Lookup = {
  $lookup: {
    from: ProductMaster.collection.name,
    localField: "productId",
    foreignField: "_id",
    as: "productRecord",
    pipeline: [{ $project: { _id: 0, nameHi: 1 } }],
  },
};
// Sellers of the same product in the same unit share one card: a listed
// product is its master product (or, for free-typed names, the lowercase name)
// per unit, so "tomato per kg" and "tomato per crate" never mix prices.
const groupKeyStage: PipelineStage.AddFields = {
  $addFields: {
    groupKey: {
      $concat: [
        {
          $ifNull: [
            { $toString: "$productId" },
            {
              $concat: [
                "name:",
                { $toLower: { $trim: { input: "$productName" } } },
              ],
            },
          ],
        },
        "|",
        { $toLower: { $trim: { input: { $ifNull: ["$unit", ""] } } } },
      ],
    },
  },
};
const dtoProjection = {
  _id: 0,
  // Whether a buyer can still act on the listing; old ones stay viewable.
  availability: {
    $switch: {
      branches: [
        {
          case: {
            $or: [
              { $eq: ["$status", "sold_out"] },
              { $lte: [{ $ifNull: ["$quantity", 1] }, 0] },
            ],
          },
          then: "sold_out",
        },
        {
          case: {
            $or: [
              { $eq: ["$status", "expired"] },
              {
                $and: [
                  { $eq: [{ $type: "$expiresAt" }, "date"] },
                  { $lte: ["$expiresAt", "$$NOW"] },
                ],
              },
              // No end date (and not a recurring supply): treated as old.
              {
                $and: [
                  { $ne: [{ $type: "$expiresAt" }, "date"] },
                  { $ne: ["$category", "RECURRING_SUPPLY"] },
                ],
              },
            ],
          },
          then: "expired",
        },
      ],
      default: "available",
    },
  },
  id: { $toString: "$_id" },
  productName: 1,
  description: { $ifNull: ["$description", null] },
  photoObjectKey: { $ifNull: ["$photoObjectKey", null] },
  isDemo: { $ifNull: ["$isDemo", false] },
  productNameMr: { $ifNull: ["$productNameMr", null] },
  productNameHi: {
    $ifNull: [{ $arrayElemAt: ["$productRecord.nameHi", 0] }, null],
  },
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
  offerCount: { $ifNull: ["$offerCount", 1] },
  minPrice: { $ifNull: ["$minPrice", { $ifNull: ["$price", null] }] },
  maxPrice: { $ifNull: ["$maxPrice", { $ifNull: ["$price", null] }] },
  minimumPurchaseQuantity: { $ifNull: ["$minimumPurchaseQuantity", null] },
  fulfillmentOptions: { $ifNull: ["$fulfillmentOptions", []] },
  tags: { $ifNull: ["$tags", []] },
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
      allProductCount: { total: number }[];
    }>([
      ...(viewerId
        ? [{ $match: { seller: { $ne: new Types.ObjectId(viewerId) } } }]
        : []),
      ...visiblePipeline(allowedVillageIds, new Date(), query.availability),
      {
        $facet: {
          listings: [
            ...filters,
            ...productGroupFilter,
            ...selectedVillage,
            groupKeyStage,
            // The cheapest offer represents its product.
            {
              $addFields: { sortPrice: { $ifNull: ["$price", 1e18] } },
            },
            { $sort: { sortPrice: 1, createdAt: -1, _id: -1 } },
            {
              $group: {
                _id: "$groupKey",
                offer: { $first: "$$ROOT" },
                offerCount: { $sum: 1 },
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" },
                newest: { $max: "$createdAt" },
              },
            },
            { $sort: { newest: -1, _id: 1 } },
            { $skip: (query.page - 1) * query.limit },
            { $limit: query.limit },
            {
              $replaceRoot: {
                newRoot: {
                  $mergeObjects: [
                    "$offer",
                    {
                      offerCount: "$offerCount",
                      minPrice: "$minPrice",
                      maxPrice: "$maxPrice",
                    },
                  ],
                },
              },
            },
            productNameStage,
            { $project: dtoProjection },
          ],
          count: [
            ...filters,
            ...productGroupFilter,
            ...selectedVillage,
            groupKeyStage,
            { $group: { _id: "$groupKey" } },
            { $count: "total" },
          ],
          villageCounts: [
            ...filters,
            ...productGroupFilter,
            groupKeyStage,
            { $group: { _id: { key: "$groupKey", village: "$village" } } },
            { $group: { _id: "$_id.village", count: { $sum: 1 } } },
            { $project: { _id: 0, id: { $toString: "$_id" }, count: 1 } },
          ],
          productGroupCounts: [
            ...filters,
            ...selectedVillage,
            { $match: { productGroup: { $in: LISTING_PRODUCT_GROUPS } } },
            groupKeyStage,
            {
              $group: {
                _id: { key: "$groupKey", group: "$productGroup" },
              },
            },
            { $group: { _id: "$_id.group", count: { $sum: 1 } } },
            { $project: { _id: 0, productGroup: "$_id", count: 1 } },
          ],
          ...(query.includeAllProductCount
            ? {
                allProductCount: [
                  ...filters,
                  ...selectedVillage,
                  groupKeyStage,
                  { $group: { _id: "$groupKey" } },
                  { $count: "total" },
                ],
              }
            : {}),
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
    ...(query.includeAllProductCount
      ? { allProductCount: result?.allProductCount[0]?.total || 0 }
      : {}),
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
// Every visible offer of the same product and unit as listing `id`, cheapest
// first. The viewer's own listings are left out, as in the main feed.
export async function findListingOffers(
  villageId: string,
  id: string,
  viewerId: string | null,
) {
  const allowedVillageIds = await discoveryVillageIds(villageId);
  const [target] = await Listing.aggregate<{ groupKey: string }>([
    { $match: { _id: new Types.ObjectId(id) } },
    ...visiblePipeline(allowedVillageIds, new Date()),
    groupKeyStage,
    { $project: { _id: 0, groupKey: 1 } },
  ]);
  if (!target) return null;
  const offers = await Listing.aggregate<
    Omit<MobileListing, "photoUrl"> & {
      photoObjectKey: string | null;
      sellerName?: string | null;
      sellerMobile?: string | null;
    }
  >([
    ...(viewerId
      ? [{ $match: { seller: { $ne: new Types.ObjectId(viewerId) } } }]
      : []),
    ...visiblePipeline(allowedVillageIds, new Date()),
    groupKeyStage,
    { $match: { groupKey: target.groupKey } },
    { $addFields: { sortPrice: { $ifNull: ["$price", 1e18] } } },
    { $sort: { sortPrice: 1, createdAt: -1, _id: -1 } },
    { $limit: 50 },
    productNameStage,
    {
      $project: {
        ...dtoProjection,
        sellerName: { $arrayElemAt: ["$sellerRecord.name", 0] },
        sellerMobile: { $arrayElemAt: ["$sellerRecord.mobile", 0] },
      },
    },
  ]);
  return offers;
}
export async function findMobileListing(villageId: string, id: string) {
  const [listing] = await Listing.aggregate<
    Omit<MobileListing, "photoUrl"> & { photoObjectKey: string | null }
  >([
    { $match: { _id: new Types.ObjectId(id) } },
    ...visiblePipeline(await discoveryVillageIds(villageId), new Date(), "any"),
    productNameStage,
    { $project: dtoProjection },
  ]);
  return listing || null;
}
