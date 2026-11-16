import "server-only";
import { Types } from "mongoose";
import type { z } from "zod";
import type {
  categoriesQuerySchema,
  categorySchema,
  editCategorySchema,
} from "@/schemas";
import { connectDb } from "../db/connect";
import { findCategories } from "../repositories/categories";
import { Category, AuditLog, Listing } from "../models";
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

function currentCategory(id: string, version: number) {
  return {
    _id: id,
    status: "ACTIVE",
    ...(version === 0
      ? { $or: [{ __v: 0 }, { __v: { $exists: false } }] }
      : { __v: version }),
  };
}

export async function updateCategory(
  actorId: string,
  id: string,
  input: z.infer<typeof editCategorySchema>,
) {
  await connectDb();
  return Category.db.transaction(async (session) => {
    const category = await Category.findOneAndUpdate(
      currentCategory(id, input.version),
      {
        $set: {
          name: input.name,
          nameMr: input.nameMr,
          defaultShelfLife: input.defaultShelfLife,
          notifyMode: input.notifyMode,
        },
        $inc: { __v: 1 },
      },
      { new: true, session },
    );
    if (!category) {
      if (
        !(await Category.exists({ _id: id, status: "ACTIVE" }).session(session))
      )
        throw new AppError(404, "NOT_FOUND", "Category not found.");
      throw new AppError(
        409,
        "STALE_VERSION",
        "This category changed. Refresh and try again.",
      );
    }
    await AuditLog.create(
      [{ actorId, action: "CATEGORY_UPDATED", targetId: category._id }],
      { session },
    );
    return { id: String(category._id), version: category.__v ?? 0 };
  });
}

export async function deleteCategory(
  actorId: string,
  id: string,
  version: number,
) {
  await connectDb();
  return Category.db.transaction(async (session) => {
    const category = await Category.findOneAndUpdate(
      currentCategory(id, version),
      { $inc: { __v: 1 } },
      { new: true, session },
    );
    if (!category) {
      if (
        !(await Category.exists({ _id: id, status: "ACTIVE" }).session(session))
      )
        throw new AppError(404, "NOT_FOUND", "Category not found.");
      throw new AppError(
        409,
        "STALE_VERSION",
        "This category changed. Refresh and try again.",
      );
    }
    const objectId = new Types.ObjectId(id);
    const listings = await Listing.countDocuments({
      $or: [
        { categoryId: objectId },
        { categoryId: id },
        { category: category.code },
      ],
    }).session(session);
    if (listings > 0)
      throw new AppError(
        409,
        "DEPENDENCIES_EXIST",
        "This category has listings, so it cannot be deleted.",
      );
    await category.deleteOne({ session });
    await AuditLog.create(
      [{ actorId, action: "CATEGORY_DELETED", targetId: objectId }],
      { session },
    );
    return { id };
  });
}
