import "server-only";
import type { ClientSession } from "mongoose";
import { connectDb } from "../db/connect";
import {
  activeMasterProduct,
  findActiveMasterProducts,
} from "../repositories/product-master";
import { AppError } from "../utils/errors";

export async function listMasterProducts(search: string) {
  await connectDb();
  return findActiveMasterProducts(search);
}
export async function masterListingFields(
  productId: string,
  session: ClientSession,
  unit?: string,
) {
  const product = await activeMasterProduct(productId, session);
  if (!product)
    throw new AppError(
      422,
      "PRODUCT_UNAVAILABLE",
      "Choose an active product from Product Master.",
    );
  return {
    productId,
    productName: product.nameEn,
    productNameMr: product.nameMr,
    productGroup: product.productGroup,
    unit: unit ?? product.defaultUnit,
  };
}
