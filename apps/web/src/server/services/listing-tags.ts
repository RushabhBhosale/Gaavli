import "server-only";
import type { z } from "zod";
import {
  DEFAULT_LISTING_TAG_DEFINITIONS,
  type ListingTagCatalogue,
} from "@gaavli/constants";
import type {
  adminListingTagCreateSchema,
  adminListingTagUpdateSchema,
} from "@/schemas";
import { connectDb } from "../db/connect";
import { AuditLog } from "../models";
import { ListingTagModel } from "../models/listing-tag";
import { ProductMaster } from "../models/product-master";
import { AppError } from "../utils/errors";

// The first read fills the collection from the built-in defaults, so an
// existing install keeps every tag its listings already use.
async function seedIfEmpty() {
  if (await ListingTagModel.estimatedDocumentCount()) return;
  try {
    await ListingTagModel.insertMany(
      DEFAULT_LISTING_TAG_DEFINITIONS.map((tag, index) => ({
        tagId: tag.id,
        en: tag.en,
        mr: tag.mr,
        hi: tag.hi,
        groups: tag.groups,
        status: "ACTIVE",
        sortOrder: (index + 1) * 10,
      })),
      { ordered: false },
    );
  } catch (error) {
    // Another request seeded at the same moment.
    if ((error as { code?: number } | null)?.code !== 11000) throw error;
  }
}

async function productsByTag() {
  const rows = await ProductMaster.aggregate<{ _id: string; ids: unknown[] }>([
    { $match: { tagIds: { $exists: true, $ne: [] }, status: "ACTIVE" } },
    { $unwind: "$tagIds" },
    { $group: { _id: "$tagIds", ids: { $push: "$_id" } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.ids.map(String)]));
}

// What the mobile app downloads: active tags, in order, with where each one
// is offered.
export async function publicListingTags(): Promise<ListingTagCatalogue> {
  await connectDb();
  await seedIfEmpty();
  const [rows, products] = await Promise.all([
    ListingTagModel.find({ status: "ACTIVE" })
      .sort({ sortOrder: 1, tagId: 1 })
      .lean(),
    productsByTag(),
  ]);
  return {
    tags: rows.map((row) => ({
      id: row.tagId,
      en: row.en,
      mr: row.mr,
      hi: row.hi,
      groups: row.groups,
      productIds: products.get(row.tagId) ?? [],
    })),
  };
}

export type AdminListingTagDto = {
  id: string;
  en: string;
  mr: string;
  hi: string;
  groups: string[];
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
  products: number;
};

export async function listAdminListingTags(): Promise<{
  tags: AdminListingTagDto[];
}> {
  await connectDb();
  await seedIfEmpty();
  const [rows, products] = await Promise.all([
    ListingTagModel.find().sort({ sortOrder: 1, tagId: 1 }).lean(),
    productsByTag(),
  ]);
  return {
    tags: rows.map((row) => ({
      id: row.tagId,
      en: row.en,
      mr: row.mr,
      hi: row.hi,
      groups: row.groups,
      status: row.status as AdminListingTagDto["status"],
      sortOrder: row.sortOrder,
      products: products.get(row.tagId)?.length ?? 0,
    })),
  };
}

const slug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36);

export async function createListingTag(
  actorId: string,
  input: z.infer<typeof adminListingTagCreateSchema>,
) {
  await connectDb();
  await seedIfEmpty();
  // The id comes from the English name unless the admin typed one. It can
  // never change afterwards.
  const base = input.id || slug(input.en);
  if (!/^[a-z][a-z0-9_]{1,39}$/.test(base))
    throw new AppError(
      422,
      "INVALID_TAG_ID",
      "Use letters in the English name so an id can be made from it.",
    );
  if (await ListingTagModel.exists({ tagId: base }))
    throw new AppError(409, "TAG_EXISTS", "A tag with this id already exists.");
  const last = await ListingTagModel.findOne()
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();
  const row = await ListingTagModel.create({
    tagId: base,
    en: input.en,
    mr: input.mr,
    hi: input.hi,
    groups: input.groups,
    status: input.status,
    sortOrder: input.sortOrder ?? (last?.sortOrder ?? 0) + 10,
  });
  await AuditLog.create({
    actorId,
    action: "LISTING_TAG_CREATED",
    targetId: row.tagId,
    targetName: row.en,
  });
  return { id: row.tagId };
}

export async function updateListingTag(
  actorId: string,
  id: string,
  input: z.infer<typeof adminListingTagUpdateSchema>,
) {
  await connectDb();
  await seedIfEmpty();
  const row = await ListingTagModel.findOneAndUpdate(
    { tagId: id },
    {
      $set: {
        en: input.en,
        mr: input.mr,
        hi: input.hi,
        groups: input.groups,
        status: input.status,
        ...(input.sortOrder !== undefined
          ? { sortOrder: input.sortOrder }
          : {}),
      },
    },
    { new: true, runValidators: true },
  );
  if (!row) throw new AppError(404, "NOT_FOUND", "Tag not found.");
  await AuditLog.create({
    actorId,
    action: "LISTING_TAG_UPDATED",
    targetId: row.tagId,
    targetName: row.en,
  });
  return { id: row.tagId, status: row.status };
}

// Tag ids an admin may attach to a product: they must exist.
export async function assertTagIdsExist(ids: string[]) {
  if (!ids.length) return;
  await seedIfEmpty();
  const found = await ListingTagModel.countDocuments({
    tagId: { $in: ids },
  });
  if (found !== new Set(ids).size)
    throw new AppError(422, "UNKNOWN_TAG", "Choose tags from the tag list.");
}

// Tags a seller may put on a listing: active ones, plus any the listing
// already carries so an older listing can still be edited after its tag was
// switched off.
export async function assertListingTagsAllowed(
  tags: readonly string[] | undefined,
  existing: readonly string[] = [],
) {
  const wanted = [...new Set(tags ?? [])].filter(
    (tag) => !existing.includes(tag),
  );
  if (!wanted.length) return;
  await seedIfEmpty();
  const found = await ListingTagModel.countDocuments({
    tagId: { $in: wanted },
    status: "ACTIVE",
  });
  if (found !== wanted.length)
    throw new AppError(
      422,
      "UNKNOWN_TAG",
      "One of the tags is not available. Pick tags from the list.",
    );
}
