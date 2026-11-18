import "server-only";
import type { z } from "zod";
import type {
  adminProductsQuerySchema,
  adminProductUpdateSchema,
} from "@/schemas";
import { connectDb } from "../db/connect";
import { AuditLog, Listing } from "../models";
import { ProductMaster } from "../models/product-master";
import { AppError } from "../utils/errors";

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type AdminProductDto = {
  id: string;
  code: string;
  nameEn: string;
  nameMr: string;
  nameHi: string | null;
  productGroup: string;
  defaultUnit: string;
  status: "ACTIVE" | "INACTIVE";
  activeListings: number;
  updatedAt: string;
};

// The Product Master catalogue for admins: every product, active or not.
// Inactive products drop out of the seller's product search; listings
// already made from them are left as they are.
export async function listAdminProducts(
  query: z.infer<typeof adminProductsQuerySchema>,
) {
  await connectDb();
  const words = query.search.split(/\s+/).filter(Boolean);
  const filter = {
    ...(query.status !== "all" ? { status: query.status } : {}),
    ...(query.group !== "all" ? { productGroup: query.group } : {}),
    ...(words.length
      ? {
          $and: words.map((word) => {
            const pattern = new RegExp(escape(word), "i");
            return {
              $or: [
                { nameEn: pattern },
                { nameMr: pattern },
                { nameHi: pattern },
                { code: pattern },
              ],
            };
          }),
        }
      : {}),
  };
  const [rows, total, counts] = await Promise.all([
    ProductMaster.find(filter)
      .sort({ sortOrder: 1, code: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    ProductMaster.countDocuments(filter),
    ProductMaster.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);
  const listingCounts = await Listing.aggregate<{ _id: unknown; count: number }>([
    {
      $match: {
        productId: { $in: rows.map((row) => row._id) },
        status: "active",
      },
    },
    { $group: { _id: "$productId", count: { $sum: 1 } } },
  ]);
  const byProduct = new Map(
    listingCounts.map((row) => [String(row._id), row.count]),
  );
  return {
    products: rows.map(
      (row): AdminProductDto => ({
        id: String(row._id),
        code: row.code,
        nameEn: row.nameEn,
        nameMr: row.nameMr,
        nameHi: row.nameHi ?? null,
        productGroup: row.productGroup,
        defaultUnit: row.defaultUnit,
        status: row.status as AdminProductDto["status"],
        activeListings: byProduct.get(String(row._id)) ?? 0,
        updatedAt: new Date(
          (row as { updatedAt?: Date }).updatedAt ?? Date.now(),
        ).toISOString(),
      }),
    ),
    total,
    page: query.page,
    limit: query.limit,
    summary: {
      active: counts.find((row) => row._id === "ACTIVE")?.count ?? 0,
      inactive: counts.find((row) => row._id === "INACTIVE")?.count ?? 0,
    },
  };
}

async function audit(actorId: string, action: string, id: string, name: string) {
  await AuditLog.create({ actorId, action, targetId: id, targetName: name });
}

export async function updateAdminProduct(
  actorId: string,
  id: string,
  input: z.infer<typeof adminProductUpdateSchema>,
) {
  await connectDb();
  const row = await ProductMaster.findByIdAndUpdate(
    id,
    {
      $set: {
        nameEn: input.nameEn,
        nameMr: input.nameMr,
        ...(input.nameHi ? { nameHi: input.nameHi } : {}),
        productGroup: input.productGroup,
        defaultUnit: input.defaultUnit,
        status: input.status,
      },
      ...(input.nameHi ? {} : { $unset: { nameHi: 1 } }),
    },
    { new: true, runValidators: true },
  );
  if (!row) throw new AppError(404, "NOT_FOUND", "Product not found.");
  await audit(actorId, "PRODUCT_MASTER_UPDATED", id, row.nameEn);
  return { id: String(row._id), status: row.status };
}

export async function setAdminProductStatus(
  actorId: string,
  id: string,
  status: "ACTIVE" | "INACTIVE",
) {
  await connectDb();
  const row = await ProductMaster.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true },
  );
  if (!row) throw new AppError(404, "NOT_FOUND", "Product not found.");
  await audit(
    actorId,
    status === "ACTIVE" ? "PRODUCT_MASTER_ACTIVATED" : "PRODUCT_MASTER_DEACTIVATED",
    id,
    row.nameEn,
  );
  return { id: String(row._id), status: row.status };
}
