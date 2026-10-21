import "server-only";
import type { ClientSession } from "mongoose";
import { ProductMaster } from "../models/product-master";
import {
  productMasterImportSchema,
  productMasterPageSchema,
} from "@gaavli/validation";

export async function importMasterProducts(input: unknown) {
  const rows = productMasterImportSchema.parse(input);
  await ProductMaster.init();
  const result = await ProductMaster.bulkWrite(
    rows.map((row) => ({
      updateOne: {
        filter: { code: row.code },
        update: { $setOnInsert: row },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  return {
    source: rows.length,
    inserted: result.upsertedCount,
    existing: result.matchedCount,
  };
}
export async function findActiveMasterProducts(search: string) {
  const terms = search.trim().split(/\s+/).filter(Boolean);
  const rows = await ProductMaster.find({
    status: "ACTIVE",
    ...(terms.length
      ? {
          $and: terms.map((term) => ({
            $or: ["nameMr", "nameEn"].map((key) => ({
              [key]: {
                $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                $options: "i",
              },
            })),
          })),
        }
      : {}),
  })
    .sort({ sortOrder: 1, code: 1 })
    .lean();
  return productMasterPageSchema.parse({
    products: rows.map((row) => ({
      productId: String(row._id),
      code: row.code,
      nameMr: row.nameMr,
      nameEn: row.nameEn,
      productGroup: row.productGroup,
      defaultUnit: row.defaultUnit,
      status: row.status,
      sortOrder: row.sortOrder,
    })),
  });
}
// Exact catalog-name mappings only; unrecognized/manual multi-term searches
// retain their existing literal behavior. Never infer or mutate listing links.
export async function masterSearchMappings(search: string) {
  const literal = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return ProductMaster.find({
    status: "ACTIVE",
    $or: ["nameMr", "nameEn"].map((key) => ({
      [key]: { $regex: `^${literal}$`, $options: "i" },
    })),
  })
    .select("nameEn nameMr")
    .lean();
}
export function activeMasterProduct(id: string, session: ClientSession) {
  return ProductMaster.findOneAndUpdate(
    { _id: id, status: "ACTIVE" },
    { $inc: { __v: 1 } },
    { new: true, session },
  );
}
