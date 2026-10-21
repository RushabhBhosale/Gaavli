import "server-only";
import type { z } from "zod";
import type { mobileListingsQuerySchema } from "@gaavli/validation";
import { Village, type UserRecord } from "../models";
import {
  findMobileListing,
  findMobileListings,
} from "../repositories/listings";
import { AppError } from "../utils/errors";
import { listingPhotoUrl } from "../providers/listing-photos";
import { discoveryVillageIds } from "../repositories/village-discovery";

async function activeVillage(user: UserRecord) {
  if (
    !user.village ||
    !(await Village.exists({ _id: user.village, isActive: true }))
  )
    throw new AppError(422, "VILLAGE_UNAVAILABLE", "Select an active village.");
  return String(user.village);
}
export async function listMobileListings(
  user: UserRecord,
  query: z.infer<typeof mobileListingsQuerySchema>,
) {
  const sourceVillageId = await activeVillage(user);
  const allowedVillageIds = await discoveryVillageIds(sourceVillageId);
  if (query.villageId && !allowedVillageIds.includes(query.villageId))
    throw new AppError(
      403,
      "VILLAGE_FILTER_UNAVAILABLE",
      "Choose your village or an active connected village.",
    );
  const page = await findMobileListings(
    sourceVillageId,
    query,
    String(user._id),
    allowedVillageIds,
  );
  return {
    ...page,
    listings: page.listings.map(({ photoObjectKey, ...listing }) => ({
      ...listing,
      photoUrl: listingPhotoUrl(photoObjectKey),
    })),
    isSeller: user.roles.includes("seller"),
  };
}
export async function getMobileListing(user: UserRecord, id: string) {
  const listing = await findMobileListing(await activeVillage(user), id);
  if (!listing)
    throw new AppError(
      404,
      "LISTING_UNAVAILABLE",
      "This listing is unavailable.",
    );
  const { photoObjectKey, ...dto } = listing;
  return { ...dto, photoUrl: listingPhotoUrl(photoObjectKey) };
}
