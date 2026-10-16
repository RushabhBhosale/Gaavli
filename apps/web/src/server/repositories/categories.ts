import "server-only";
import type { z } from "zod";
import type { categoriesQuerySchema } from "@/schemas";
import type { AdminCategoryDto, CategoriesPage } from "@/lib/contracts";
import { Category, Listing } from "../models";
import { activeStockFilter } from "./listing-mutations";

export async function findCategories(
  query: z.infer<typeof categoriesQuerySchema>,
): Promise<CategoriesPage> {
  const search = query.search?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = {
    status: "ACTIVE",
    ...(search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { nameMr: { $regex: search, $options: "i" } },
          ],
        }
      : {}),
  };
  const total = await Category.countDocuments(filter);
  const page = Math.min(
    query.page,
    Math.max(1, Math.ceil(total / query.limit)),
  );
  const categories = await Category.aggregate<AdminCategoryDto>([
    { $match: filter },
    {
      $lookup: {
        from: Listing.collection.name,
        let: { categoryId: "$_id", code: "$code" },
        pipeline: [
          {
            $match: {
              ...activeStockFilter(),
              $and: [
                {
                  $expr: {
                    $or: [
                      { $eq: ["$categoryId", "$$categoryId"] },
                      { $eq: ["$categoryId", { $toString: "$$categoryId" }] },
                      { $eq: ["$category", "$$code"] },
                    ],
                  },
                },
              ],
            },
          },
          { $count: "count" },
        ],
        as: "listingCounts",
      },
    },
    {
      $set: {
        activeListings: {
          $ifNull: [{ $arrayElemAt: ["$listingCounts.count", 0] }, 0],
        },
      },
    },
    { $sort: { [query.sort]: query.direction === "asc" ? 1 : -1, _id: 1 } },
    { $skip: (page - 1) * query.limit },
    { $limit: query.limit },
    {
      $project: {
        _id: 0,
        id: { $toString: "$_id" },
        code: 1,
        name: 1,
        nameMr: 1,
        defaultShelfLife: 1,
        notifyMode: 1,
        activeListings: 1,
      },
    },
  ]);
  return { categories, total, page, limit: query.limit };
}
