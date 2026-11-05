import "server-only";
import { Types, type ClientSession } from "mongoose";
import { ProductMaster } from "../models/product-master";
import { searchCatalog } from "./catalog-search";
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
  // Add Hindi names to existing rows that lack one; never overwrite a value
  // an admin has already stored.
  const hindi = await ProductMaster.bulkWrite(
    rows
      .filter((row) => row.nameHi)
      .map((row) => ({
        updateOne: {
          filter: { code: row.code, nameHi: { $exists: false } },
          update: { $set: { nameHi: row.nameHi } },
        },
      })),
    { ordered: false },
  );
  return {
    source: rows.length,
    inserted: result.upsertedCount,
    existing: result.matchedCount,
    hindiNamesAdded: hindi.modifiedCount,
  };
}
export async function findActiveMasterProducts(search: string) {
  const terms = search.trim().split(/\s+/).filter(Boolean);
  const rows = await ProductMaster.find({
    status: "ACTIVE",
    ...(terms.length
      ? {
          $and: terms.map((term) => ({
            $or: ["nameMr", "nameEn", "nameHi"].map((key) => ({
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
      nameHi: row.nameHi || null,
      productGroup: row.productGroup,
      defaultUnit: row.defaultUnit,
      status: row.status,
      sortOrder: row.sortOrder,
    })),
  });
}
// Exact catalog names first. Anything else goes through the catalog search, so
// everyday names ("kanda"), other languages and small spelling mistakes still
// find the product. Never infer or mutate listing links.
export async function masterSearchMappings(search: string) {
  const literal = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exact = await ProductMaster.find({
    status: "ACTIVE",
    $or: ["nameMr", "nameEn", "nameHi"].map((key) => ({
      [key]: { $regex: `^${literal}$`, $options: "i" },
    })),
  })
    .select("nameEn nameMr nameHi")
    .lean();
  if (exact.length) return exact;
  try {
    const { products } = await searchCatalog(search, 5);
    return products.map((product) => ({
      _id: new Types.ObjectId(product.productId),
      nameEn: product.nameEn,
      nameMr: product.nameMr,
      nameHi: product.nameHi ?? "",
    }));
  } catch {
    return [];
  }
}
export function activeMasterProduct(id: string, session: ClientSession) {
  return ProductMaster.findOneAndUpdate(
    { _id: id, status: "ACTIVE" },
    { $inc: { __v: 1 } },
    { new: true, session },
  );
}
