import "server-only";
import type { z } from "zod";
import type {
  adminProductCreateSchema,
  adminProductsQuerySchema,
  adminProductUpdateSchema,
} from "@/schemas";
import { connectDb } from "../db/connect";
import { AuditLog, Listing } from "../models";
import { ProductMaster } from "../models/product-master";
import { CatalogSearchTerm } from "../models/catalog-search-term";
import {
  deletionKeys,
  normalizeCatalogTerm,
  phoneticKey,
  skeletonKey,
  termWords,
} from "../catalog/search-text";
import { AppError } from "../utils/errors";
import { assertTagIdsExist } from "./listing-tags";

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type AdminProductDto = {
  id: string;
  code: string;
  nameEn: string;
  nameMr: string;
  nameHi: string | null;
  productGroup: string;
  defaultUnit: string;
  tagIds: string[];
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
        tagIds: row.tagIds ?? [],
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
  if (input.tagIds) await assertTagIdsExist(input.tagIds);
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
        ...(input.tagIds ? { tagIds: input.tagIds } : {}),
      },
      ...(input.nameHi ? {} : { $unset: { nameHi: 1 } }),
    },
    { new: true, runValidators: true },
  );
  if (!row) throw new AppError(404, "NOT_FOUND", "Product not found.");
  await indexProductNames(row);
  await audit(actorId, "PRODUCT_MASTER_UPDATED", id, row.nameEn);
  return { id: String(row._id), status: row.status };
}

// Makes the product findable in the seller's product search. Only adds or
// refreshes name terms; older terms and aliases are left alone.
async function indexProductNames(product: {
  _id: unknown;
  nameEn: string;
  nameMr: string;
  nameHi?: string | null;
}) {
  const names = [product.nameEn, product.nameMr, product.nameHi]
    .filter((name): name is string => !!name)
    .map(normalizeCatalogTerm);
  const map = new Map<string, "name" | "word">();
  for (const term of names.flatMap(termWords)) map.set(term, "word");
  for (const name of names) map.set(name, "name");
  const rows = [...map].filter(([term]) => term.length > 0);
  if (!rows.length) return;
  await CatalogSearchTerm.bulkWrite(
    rows.map(([term, kind]) => ({
      updateOne: {
        filter: { product: product._id, term },
        update: {
          $set: {
            kind,
            deletions: deletionKeys(term),
            key: phoneticKey(term),
            skel: skeletonKey(term),
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

const codeFrom = (name: string) =>
  name
    .normalize("NFKD")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

export async function createAdminProduct(
  actorId: string,
  input: z.infer<typeof adminProductCreateSchema>,
) {
  await connectDb();
  if (input.tagIds) await assertTagIdsExist(input.tagIds);
  await ProductMaster.init();
  // Names with no Latin letters (rare for English) still get a usable code.
  const stem = codeFrom(input.nameEn) || "PRODUCT";
  let code = input.code ?? (/^[A-Z]/.test(stem) ? stem : `P_${stem}`);
  if (input.code) {
    if (await ProductMaster.exists({ code }))
      throw new AppError(
        409,
        "PRODUCT_EXISTS",
        "A product with this code already exists.",
      );
  } else {
    const base = code;
    for (let n = 2; await ProductMaster.exists({ code }); n += 1) {
      if (n > 50)
        throw new AppError(409, "PRODUCT_EXISTS", "Choose a different name.");
      code = `${base}_${n}`;
    }
  }
  const last = await ProductMaster.findOne()
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();
  let row;
  try {
    row = await ProductMaster.create({
      code,
      nameEn: input.nameEn,
      nameMr: input.nameMr,
      ...(input.nameHi ? { nameHi: input.nameHi } : {}),
      productGroup: input.productGroup,
      defaultUnit: input.defaultUnit,
      status: input.status,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      ...(input.tagIds?.length ? { tagIds: input.tagIds } : {}),
    });
  } catch (error) {
    if ((error as { code?: number } | null)?.code === 11000)
      throw new AppError(
        409,
        "PRODUCT_EXISTS",
        "A product with this code already exists.",
      );
    throw error;
  }
  await indexProductNames(row);
  await audit(actorId, "PRODUCT_MASTER_CREATED", String(row._id), row.nameEn);
  return { id: String(row._id), code: row.code, status: row.status };
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
