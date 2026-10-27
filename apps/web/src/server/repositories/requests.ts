import "server-only";
import type { z } from "zod";
import type { requestsQuerySchema } from "@gaavli/validation";
import { indianMobileSchema } from "@gaavli/validation";
import { ListingInterest } from "../models/listing-interest";
import { Notification, User, Village, Listing, Category } from "../models";
import { listingPhotoUrl } from "../providers/listing-photos";

export function requestState(row: {
  _id: unknown;
  readAt?: Date | null;
  respondedAt?: Date | null;
}) {
  return {
    id: String(row._id),
    status: row.respondedAt
      ? ("responded" as const)
      : row.readAt
        ? ("seen" as const)
        : ("new" as const),
    seenAt: row.readAt?.toISOString() || null,
    respondedAt: row.respondedAt?.toISOString() || null,
  };
}

export async function findActivityRequests(
  userId: string,
  query: z.infer<typeof requestsQuerySchema>,
) {
  const filter = {
    type: "BUYER_TRIED_CONTACT",
    "data.buyerId": { $ne: null },
    "data.listingId": { $ne: null },
    ...(query.direction === "sent" ? { "data.buyerId": userId } : { userId }),
  };
  const [rows, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);
  const [people, listings] = await Promise.all([
    User.find({
      _id: { $in: rows.flatMap((row) => [row.userId, row.data!.buyerId!]) },
    })
      .select("name village status mobile")
      .lean(),
    Listing.find({ _id: { $in: rows.map((row) => row.data!.listingId!) } })
      .select(
        "productName productNameMr photoObjectKey unit seller village status quantity expiresAt category isDemo",
      )
      .lean(),
  ]);
  const villages = await Village.find({
    _id: {
      $in: [
        ...people.flatMap((person) => (person.village ? [person.village] : [])),
        ...listings.map((listing) => listing.village),
      ],
    },
  })
    .select("nameEn nameMr isActive")
    .lean();
  const categories = await Category.find({ status: "INACTIVE" })
    .select("code")
    .lean();
  const inactive = new Set(categories.map((category) => category.code));
  const userMap = new Map(people.map((person) => [String(person._id), person]));
  const villageMap = new Map(
    villages.map((village) => [String(village._id), village]),
  );
  const listingMap = new Map(
    listings.map((listing) => [String(listing._id), listing]),
  );
  const interests =
    query.includeBuyerMobile && query.direction === "received" && rows.length
      ? await ListingInterest.find({
          $or: rows.map((row) => ({
            userId: row.data!.buyerId,
            listingId: row.data!.listingId,
          })),
        })
          .select("userId listingId")
          .lean()
      : [];
  const interestKeys = new Set(
    interests.map((row) => `${row.userId}:${row.listingId}`),
  );
  return {
    total,
    page: query.page,
    limit: query.limit,
    requests: rows.map((row) => {
      const data = row.data!;
      const buyer = userMap.get(String(data.buyerId));
      const seller = userMap.get(String(row.userId));
      const person = query.direction === "sent" ? seller : buyer;
      const village = person?.village
        ? villageMap.get(String(person.village))
        : null;
      const savedVillage =
        query.direction === "sent"
          ? data.sellerVillageName
          : data.buyerVillageName;
      const savedVillageMr =
        query.direction === "sent"
          ? data.sellerVillageNameMr
          : data.buyerVillageNameMr;
      const listing = listingMap.get(String(data.listingId));
      const eligible = !!(
        listing &&
        !listing.isDemo &&
        listing.status === "active" &&
        (listing.quantity ?? 0) > 0 &&
        ((listing.expiresAt && listing.expiresAt.getTime() > Date.now()) ||
          (listing.category === "RECURRING_SUPPLY" &&
            listing.expiresAt === null)) &&
        !inactive.has(listing.category || "") &&
        buyer?.status === "active" &&
        seller?.status === "active" &&
        String(listing.seller) === String(row.userId) &&
        villageMap.get(String(listing.village))?.isActive
      );
      return {
        ...requestState(row),
        listingId: String(data.listingId),
        product: {
          name:
            data.productName !== undefined
              ? data.productName || null
              : listing?.productName || null,
          nameMr:
            data.productName !== undefined
              ? data.productNameMr || null
              : listing?.productNameMr || null,
          photoUrl: listingPhotoUrl(
            data.productName !== undefined
              ? data.photoObjectKey
              : listing?.photoObjectKey,
          ),
          unit:
            data.productName !== undefined
              ? data.unit || null
              : listing?.unit || null,
        },
        person: {
          ...(query.includeBuyerMobile && query.direction === "received"
            ? {
                mobile:
                  eligible &&
                  data.callbackConsent === true &&
                  interestKeys.has(`${data.buyerId}:${data.listingId}`) &&
                  indianMobileSchema.safeParse(buyer?.mobile).success
                    ? indianMobileSchema.parse(buyer!.mobile)
                    : null,
              }
            : {}),
          name:
            (query.direction === "sent" ? data.sellerName : data.buyerName) ||
            person?.name ||
            null,
          village:
            savedVillage && savedVillageMr
              ? { name: savedVillage, nameMr: savedVillageMr }
              : village
                ? { name: village.nameEn, nameMr: village.nameMr }
                : null,
        },
        quantity: data.quantity ?? null,
        ...(query.includeMessages && data.message
          ? { message: data.message }
          : {}),
        createdAt: row.createdAt.toISOString(),
        canCall:
          eligible &&
          (query.direction === "sent" || data.callbackConsent === true),
      };
    }),
  };
}
