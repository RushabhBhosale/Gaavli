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
async function activeBrowsingVillage(
  user: UserRecord,
  browsingVillageId?: string,
) {
  const registeredVillageId = await activeVillage(user);
  if (!browsingVillageId || browsingVillageId === registeredVillageId)
    return registeredVillageId;
  if (!(await Village.exists({ _id: browsingVillageId, isActive: true })))
    throw new AppError(422, "VILLAGE_UNAVAILABLE", "Select an active village.");
  return browsingVillageId;
}
export async function listMobileListings(
  user: UserRecord,
  query: z.infer<typeof mobileListingsQuerySchema>,
) {
  const sourceVillageId = await activeBrowsingVillage(
    user,
    query.sourceVillageId,
  );
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
  return publicListingPage(page, user.roles.includes("seller"));
}
export async function listGuestListings(
  sourceVillageId: string,
  query: z.infer<typeof mobileListingsQuerySchema>,
) {
  if (!(await Village.exists({ _id: sourceVillageId, isActive: true })))
    throw new AppError(422, "VILLAGE_UNAVAILABLE", "Select an active village.");
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
    null,
    allowedVillageIds,
  );
  return publicListingPage(page, false);
}
function publicListingPage(
  page: Awaited<ReturnType<typeof findMobileListings>>,
  isSeller: boolean,
) {
  return {
    ...page,
    listings: page.listings.map(({ photoObjectKey, ...listing }) => ({
      ...listing,
      photoUrl: listingPhotoUrl(photoObjectKey),
    })),
    isSeller,
  };
}
export async function getGuestListing(sourceVillageId: string, id: string) {
  if (!(await Village.exists({ _id: sourceVillageId, isActive: true })))
    throw new AppError(422, "VILLAGE_UNAVAILABLE", "Select an active village.");
  return publishListing(await findMobileListing(sourceVillageId, id));
}
export async function getMobileListing(
  user: UserRecord,
  id: string,
  browsingVillageId?: string,
) {
  const sourceVillageId = await activeBrowsingVillage(user, browsingVillageId);
  return publishListing(await findMobileListing(sourceVillageId, id));
}
function publishListing(
  listing: Awaited<ReturnType<typeof findMobileListing>>,
) {
  if (!listing)
    throw new AppError(
      404,
      "LISTING_UNAVAILABLE",
      "This listing is unavailable.",
    );
  const { photoObjectKey, ...dto } = listing;
  return { ...dto, photoUrl: listingPhotoUrl(photoObjectKey) };
}
