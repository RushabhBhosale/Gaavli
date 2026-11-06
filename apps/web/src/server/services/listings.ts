import "server-only";
import type { z } from "zod";
import {
  indianMobileSchema,
  type mobileListingsQuerySchema,
} from "@gaavli/validation";
import { Village, type UserRecord } from "../models";
import {
  findListingOffers,
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

// All sellers offering the same product, for the details page.
export async function listingOffers(
  user: UserRecord | null,
  id: string,
  sourceVillageId: string | undefined,
) {
  const villageId = user
    ? await activeBrowsingVillage(user, sourceVillageId)
    : sourceVillageId;
  if (!villageId || !(await Village.exists({ _id: villageId, isActive: true })))
    throw new AppError(422, "VILLAGE_UNAVAILABLE", "Select an active village.");
  const offers = await findListingOffers(
    villageId,
    id,
    user ? String(user._id) : null,
  );
  if (!offers)
    throw new AppError(
      404,
      "LISTING_UNAVAILABLE",
      "This listing is unavailable.",
    );
  return {
    offers: offers.map(
      ({ photoObjectKey, sellerName, sellerMobile, ...offer }) => {
        const name = (sellerName || "").trim();
        const mobile = indianMobileSchema.safeParse(sellerMobile);
        return {
          ...offer,
          photoUrl: listingPhotoUrl(photoObjectKey),
          // Personal details only for a signed-in buyer; guests get none.
          seller:
            user && name
              ? {
                  name,
                  mobile: mobile.success ? `+91${mobile.data}` : null,
                }
              : null,
        };
      },
    ),
  };
}
