import "server-only";
import { listingPhotoStorage } from "./listing-photo-storage";
import { LISTING_ASSET_PHOTOS } from "@gaavli/constants";
import type { ClientSession } from "mongoose";
import type { z } from "zod";
import type {
  createListingSchema,
  updateListingSchema,
  relistListingSchema,
  ownListingsQuerySchema,
} from "@gaavli/validation";
import { deletedListingSchema } from "@gaavli/validation";
import { Listing, User, Village, Category } from "../models";
import { ListingSettings } from "../models/listing-operations";
import {
  activeStockFilter,
  effectiveListingStatus,
  findOwnListings,
  ownedListing,
  ownedListingDto,
  listingOperation,
  recordListingEvent,
  type ListingDocument,
  type ActiveListingUser,
} from "../repositories/listing-mutations";
import { AppError } from "../utils/errors";
import { similarProductName } from "./listing-policy";
import { masterListingFields } from "./product-master";
type ActiveUser = ActiveListingUser;

async function lockVillage(
  user: ActiveUser,
  villageId: string,
  session: ClientSession,
) {
  if (!user.village || String(user.village) !== villageId)
    throw new AppError(
      422,
      "VILLAGE_UNAVAILABLE",
      "Select the listing village before publishing or editing.",
    );
  const village = await Village.findOneAndUpdate(
    { _id: villageId, isActive: true },
    { $inc: { __v: 1 } },
    { new: true, session },
  );
  if (!village)
    throw new AppError(422, "VILLAGE_UNAVAILABLE", "Select an active village.");
}
async function activeCategory(
  categoryId: string | undefined,
  code: string | null | undefined,
  session: ClientSession,
) {
  const category = await Category.findOneAndUpdate(
    { ...(categoryId ? { _id: categoryId } : { code }), status: "ACTIVE" },
    { $inc: { __v: 1 } },
    { new: true, session },
  );
  if (!category)
    throw new AppError(
      422,
      "CATEGORY_UNAVAILABLE",
      "Choose an active category.",
    );
  return category;
}
function expiryValid(
  expiresAt: string | Date | null | undefined,
  code: string,
) {
  if (expiresAt == null) {
    if (code !== "RECURRING_SUPPLY")
      throw new AppError(422, "EXPIRY_REQUIRED", "Set a future expiry date.");
  } else if (new Date(expiresAt).getTime() <= Date.now())
    throw new AppError(422, "EXPIRY_INVALID", "Set a future expiry date.");
}
function minimumValid(minimum: number | null | undefined, quantity: number) {
  if (minimum != null && minimum > quantity)
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "Minimum purchase must not exceed availability.",
    );
}
async function photoOwned(
  key: string | null | undefined,
  userId: string,
  session: ClientSession,
) {
  if (LISTING_ASSET_PHOTOS.some((photo) => photo.key === key)) return null;
  if (key && !key.startsWith(`listings/${userId}/`))
    throw new AppError(
      422,
      "PHOTO_FORBIDDEN",
      "Use an image object belonging to your account.",
    );
  if (key?.includes("/uploads/"))
    return listingPhotoStorage.require(key, userId, session);
  return null;
}
function versionMatches(row: ListingDocument, version: number) {
  if ((row.version || 1) !== version)
    throw new AppError(
      409,
      "STALE_VERSION",
      "This listing changed. Reload it before editing.",
      { currentVersion: row.version || 1, status: effectiveListingStatus(row) },
    );
}
async function duplicateCheck(
  userId: string,
  name: string,
  nameMr: string | null | undefined,
  session: ClientSession,
  except?: string,
) {
  const rows = await Listing.find({
    seller: userId,
    ...activeStockFilter(),
    ...(except ? { _id: { $ne: except } } : {}),
  })
    .select("productName productNameMr")
    .session(session)
    .lean();
  const names = [name, nameMr].filter((value): value is string => !!value);
  const duplicate = rows.find((row) =>
    names.some((value) =>
      [row.productName, row.productNameMr].some(
        (other) => !!other && similarProductName(value, other),
      ),
    ),
  );
  if (duplicate)
    throw new AppError(
      409,
      "DUPLICATE_LISTING",
      "A similar active listing exists. Update it instead.",
      { listingId: String(duplicate._id) },
    );
}
async function listingLimit(userId: string, session: ClientSession) {
  const settings = await ListingSettings.findById("listing-policy")
    .session(session)
    .lean();
  const limit = settings?.activeListingLimit || 10;
  if (
    (await Listing.countDocuments({
      seller: userId,
      ...activeStockFilter(),
    }).session(session)) >= limit
  )
    throw new AppError(
      409,
      "LISTING_LIMIT",
      "Your active listing limit has been reached.",
      { limit },
    );
}

export function createOwnedListing(
  userId: string,
  key: string,
  input: z.infer<typeof createListingSchema>,
) {
  return listingOperation(
    userId,
    key,
    "POST /listings",
    input,
    async (session, user) => {
      const selected = input.productId
        ? {
            ...input,
            ...(await masterListingFields(
              input.productId,
              session,
              input.unit,
            )),
          }
        : input;
      await lockVillage(user, input.villageId, session);
      const category = await activeCategory(input.categoryId, null, session);
      expiryValid(input.expiresAt, category.code);
      const photoImageId = await photoOwned(
        input.photoObjectKey,
        userId,
        session,
      );
      await duplicateCheck(
        userId,
        selected.productName,
        selected.productNameMr,
        session,
      );
      await listingLimit(userId, session);
      const { villageId, ...fields } = selected;
      const [row] = await Listing.create(
        [
          {
            ...fields,
            photoImageId,
            village: villageId,
            seller: userId,
            category: category.code,
            status: "active",
            version: 1,
            isDemo: false,
          },
        ],
        { session },
      );
      await User.updateOne(
        { _id: userId, roles: { $ne: "seller" } },
        {
          $addToSet: { roles: { $each: ["buyer", "seller"] } },
          $set: { sellerActivatedAt: new Date() },
        },
        { session },
      );
      await recordListingEvent(userId, row, "created", session);
      return { data: await ownedListingDto(row, session), status: 201 };
    },
  );
}
export function updateOwnedListing(
  userId: string,
  id: string,
  key: string,
  input: z.infer<typeof updateListingSchema>,
) {
  return listingOperation(
    userId,
    key,
    `PATCH /listings/${id}`,
    input,
    async (session, user) => {
      const row = await ownedListing(userId, id, session);
      versionMatches(row, input.version);
      const selectedId =
        input.productId ||
        (row.productId &&
        (input.productName !== undefined ||
          input.productNameMr !== undefined ||
          input.productGroup !== undefined)
          ? String(row.productId)
          : undefined);
      const selected = selectedId
        ? {
            ...input,
            ...(await masterListingFields(
              selectedId,
              session,
              input.unit ??
                (input.productId &&
                input.productId !== String(row.productId || "")
                  ? undefined
                  : row.unit || undefined),
            )),
          }
        : input;
      if (effectiveListingStatus(row) !== "active")
        throw new AppError(
          409,
          "INVALID_LISTING_STATE",
          "Only an active listing can be edited. Relist expired or sold-out stock first.",
        );
      await lockVillage(user, String(row.village), session);
      const category = await activeCategory(
        input.categoryId || row.categoryId?.toString(),
        row.category,
        session,
      );
      const expiry =
        input.expiresAt === undefined ? row.expiresAt : input.expiresAt;
      expiryValid(expiry, category.code);
      const photoFields =
        input.photoObjectKey !== undefined
          ? {
              photoImageId: await photoOwned(
                input.photoObjectKey,
                userId,
                session,
              ),
            }
          : {};
      minimumValid(
        input.minimumPurchaseQuantity === undefined
          ? row.minimumPurchaseQuantity
          : input.minimumPurchaseQuantity,
        input.quantity ?? row.quantity ?? 0,
      );
      await duplicateCheck(
        userId,
        selected.productName || row.productName,
        selected.productNameMr === undefined
          ? row.productNameMr
          : selected.productNameMr,
        session,
        id,
      );
      const { version, ...fields } = selected;
      row.set({
        ...fields,
        ...photoFields,
        categoryId: category._id,
        category: category.code,
        version: version + 1,
      });
      await row.save({ session });
      await recordListingEvent(userId, row, "updated", session);
      return { data: await ownedListingDto(row, session), status: 200 };
    },
  );
}
export function deleteOwnedListing(
  userId: string,
  id: string,
  key: string,
  version: number,
) {
  return listingOperation(
    userId,
    key,
    `DELETE /listings/${id}`,
    { version },
    async (session) => {
      const row = await ownedListing(userId, id, session);
      if (row.status !== "deactivated") {
        versionMatches(row, version);
        row.status = "deactivated";
        row.deactivatedAt = new Date();
        row.version = version + 1;
        await row.save({ session });
        await recordListingEvent(userId, row, "deactivated", session);
      }
      return {
        data: deletedListingSchema.parse({
          id,
          deleted: true,
          status: "deactivated",
          version: row.version || 1,
        }),
        status: 200,
      };
    },
  );
}
export function markOwnedListingSoldOut(
  userId: string,
  id: string,
  key: string,
  version: number,
) {
  return listingOperation(
    userId,
    key,
    `POST /listings/${id}/sold-out`,
    { version },
    async (session) => {
      const row = await ownedListing(userId, id, session);
      if (row.status !== "sold_out") {
        versionMatches(row, version);
        if (effectiveListingStatus(row) !== "active")
          throw new AppError(
            409,
            "INVALID_LISTING_STATE",
            "This listing is not active.",
          );
        row.status = "sold_out";
        row.quantity = 0;
        row.version = version + 1;
        await row.save({ session });
        await recordListingEvent(userId, row, "sold_out", session);
      }
      return { data: await ownedListingDto(row, session), status: 200 };
    },
  );
}
export function relistOwnedListing(
  userId: string,
  id: string,
  key: string,
  input: z.infer<typeof relistListingSchema>,
) {
  return listingOperation(
    userId,
    key,
    `POST /listings/${id}/relist`,
    input,
    async (session, user) => {
      const row = await ownedListing(userId, id, session);
      versionMatches(row, input.version);
      if (!["expired", "sold_out"].includes(effectiveListingStatus(row)))
        throw new AppError(
          409,
          "INVALID_LISTING_STATE",
          "Only expired or sold-out stock can be relisted.",
        );
      await lockVillage(user, String(row.village), session);
      const category = await activeCategory(
        row.categoryId?.toString(),
        row.category,
        session,
      );
      expiryValid(input.expiresAt, category.code);
      minimumValid(row.minimumPurchaseQuantity, input.quantity);
      await duplicateCheck(
        userId,
        row.productName,
        row.productNameMr,
        session,
        id,
      );
      await listingLimit(userId, session);
      row.set({
        status: "active",
        quantity: input.quantity,
        expiresAt: input.expiresAt,
        version: input.version + 1,
        categoryId: category._id,
      });
      await row.save({ session });
      await recordListingEvent(userId, row, "relisted", session);
      return { data: await ownedListingDto(row, session), status: 200 };
    },
  );
}
export async function listOwnListings(
  userId: string,
  query: z.infer<typeof ownListingsQuerySchema>,
) {
  return findOwnListings(userId, query);
}
export async function getOwnListing(userId: string, id: string) {
  return ownedListingDto(await ownedListing(userId, id));
}
export async function listMobileCategories() {
  const categories = await Category.find({ status: "ACTIVE" })
    .sort({ sortOrder: 1, name: 1, _id: 1 })
    .lean();
  return {
    categories: categories.map((category) => ({
      id: String(category._id),
      code: category.code,
      name: category.name,
      nameMr: category.nameMr,
      defaultShelfLife: category.defaultShelfLife,
      notifyMode: category.notifyMode,
    })),
  };
}
