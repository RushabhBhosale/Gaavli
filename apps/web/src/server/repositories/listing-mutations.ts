import "server-only";
import { createHash } from "node:crypto";
import type { ClientSession, Types } from "mongoose";
import type { z } from "zod";
import {
  ownedListingSchema,
  type ownListingsQuerySchema,
} from "@gaavli/validation";
import { Listing, User, Village, Category } from "../models";
import {
  ListingOperation,
  ListingEvent,
  ListingSettings,
} from "../models/listing-operations";
import { connectDb } from "../db/connect";
import { listingPhotoUrl } from "../providers/listing-photos";
import { mobileVillageDto } from "./mobile";
import { AppError } from "../utils/errors";

export type ListingDocument = ReturnType<typeof Listing.hydrate>;
export type ActiveListingUser = {
  _id: Types.ObjectId;
  village?: Types.ObjectId | null;
};
export function effectiveListingStatus(row: ListingDocument, now = Date.now()) {
  return row.status === "active" &&
    row.expiresAt &&
    row.expiresAt.getTime() <= now
    ? "expired"
    : row.status;
}
export const activeStockFilter = (now = new Date()) => ({
  status: "active",
  quantity: { $gt: 0 },
  $or: [
    { expiresAt: { $gt: now } },
    { category: "RECURRING_SUPPLY", expiresAt: { $type: 10 } },
  ],
});

export async function ownedListingDto(
  row: ListingDocument,
  session: ClientSession | null = null,
) {
  const village = await Village.findById(row.village).session(session).lean();
  const category = row.categoryId
    ? await Category.findById(row.categoryId).session(session).lean()
    : await Category.findOne({ code: row.category }).session(session).lean();
  return ownedListingSchema.parse({
    id: String(row._id),
    productName: row.productName,
    productNameMr: row.productNameMr || null,
    categoryId: category ? String(category._id) : null,
    category: row.category || null,
    productGroup: row.productGroup || null,
    quantity: row.quantity ?? null,
    unit: row.unit || null,
    price: row.price ?? null,
    photoObjectKey: row.photoObjectKey || null,
    photoUrl: listingPhotoUrl(row.photoObjectKey),
    minimumPurchaseQuantity: row.minimumPurchaseQuantity ?? null,
    fulfillmentOptions: row.fulfillmentOptions || [],
    villageId: String(row.village),
    village: village ? mobileVillageDto(village) : null,
    status: effectiveListingStatus(row),
    version: row.version || 1,
    expiresAt: row.expiresAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}
export async function ownedListing(
  userId: string,
  id: string,
  session: ClientSession | null = null,
) {
  const row = await Listing.findOne({ _id: id, seller: userId }).session(
    session,
  );
  if (!row)
    throw new AppError(
      404,
      "LISTING_UNAVAILABLE",
      "This listing is unavailable.",
    );
  return row;
}
export async function findOwnListings(
  userId: string,
  query: z.infer<typeof ownListingsQuerySchema>,
) {
  const now = new Date();
  const statusFilter =
    query.status === "expired"
      ? {
          $or: [
            { status: "expired" },
            { status: "active", expiresAt: { $lte: now } },
          ],
        }
      : query.status === "active"
        ? activeStockFilter(now)
        : query.status
          ? { status: query.status }
          : {};
  const filter = { seller: userId, ...statusFilter };
  const [rows, total] = await Promise.all([
    Listing.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Listing.countDocuments(filter),
  ]);
  return {
    listings: await Promise.all(rows.map((row) => ownedListingDto(row))),
    total,
    page: query.page,
    limit: query.limit,
  };
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonical(child)]),
    );
  return value;
}
type MutationResult = { data: unknown; status: number };
export async function listingOperation(
  userId: string,
  key: string,
  scope: string,
  input: unknown,
  work: (
    session: ClientSession,
    user: ActiveListingUser,
  ) => Promise<MutationResult>,
): Promise<MutationResult> {
  await connectDb();
  await Promise.all([
    Listing.init(),
    ListingOperation.init(),
    ListingEvent.init(),
    ListingSettings.init(),
    Category.init(),
  ]);
  const requestHash = createHash("sha256")
    .update(JSON.stringify(canonical(input)))
    .digest("hex");
  const replay = (saved: {
    scope: string;
    requestHash: string;
    response: unknown;
    responseStatus: number;
  }) => {
    if (saved.scope !== scope || saved.requestHash !== requestHash)
      throw new AppError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "Use a new operation ID for a different request.",
      );
    return { data: saved.response, status: saved.responseStatus };
  };
  try {
    return await User.db.transaction(async (session) => {
      // Shared user write lock serializes duplicate/limit checks and admin status/village changes.
      const user = await User.findOneAndUpdate(
        { _id: userId, status: "active" },
        { $inc: { __v: 1 } },
        { new: true, session },
      );
      if (!user)
        throw new AppError(
          403,
          "ACCOUNT_UNAVAILABLE",
          "This account is not active.",
        );
      const saved = await ListingOperation.findOne({ user: userId, key })
        .session(session)
        .lean();
      if (saved) return replay(saved);
      const result = await work(session, user);
      await ListingOperation.create(
        [
          {
            user: userId,
            key,
            scope,
            requestHash,
            response: result.data,
            responseStatus: result.status,
          },
        ],
        { session },
      );
      return result;
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      const saved = await ListingOperation.findOne({
        user: userId,
        key,
      }).lean();
      if (saved) return replay(saved);
    }
    throw error;
  }
}
export async function recordListingEvent(
  userId: string,
  row: ListingDocument,
  action: "created" | "updated" | "deactivated" | "sold_out" | "relisted",
  session: ClientSession,
) {
  await ListingEvent.create(
    [{ user: userId, listing: row._id, action, version: row.version || 1 }],
    { session },
  );
}
