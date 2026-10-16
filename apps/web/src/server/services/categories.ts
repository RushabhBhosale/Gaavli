import "server-only";
import type { z } from "zod";
import type { categoriesQuerySchema, categorySchema } from "@/schemas";
import { connectDb } from "../db/connect";
import { findCategories } from "../repositories/categories";
import { Category, AuditLog } from "../models";
import { AppError } from "../utils/errors";

export async function listCategories(
  query: z.infer<typeof categoriesQuerySchema>,
) {
  await connectDb();
  return findCategories(query);
}

export async function createCategory(
  actorId: string,
  input: z.infer<typeof categorySchema>,
) {
  await connectDb();
  await Category.init();
  try {
    return await Category.db.transaction(async (session) => {
      const [category] = await Category.create([input], { session });
      await AuditLog.create(
        [{ actorId, action: "CATEGORY_CREATED", targetId: category._id }],
        { session },
      );
      return { id: String(category._id) };
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === 11000
    )
      throw new AppError(
        409,
        "CONFLICT",
        "A category with this code already exists.",
      );
    throw error;
  }
}
