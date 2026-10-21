import type { MobileListing, MobileLanguage, MobileUser } from "@gaavli/types";
import type { HomeListing, HomeDashboardData } from "../types/home";

export function toHomeListing(
  listing: MobileListing,
  now = Date.now(),
): HomeListing {
  return {
    id: listing.id,
    name: listing.productName,
    // Preserve original DB name if no Marathi name exists; never invent one.
    nameMr: listing.productNameMr || listing.productName,
    description: listing.description,
    category: listing.categoryName || listing.category || "",
    categoryMr:
      listing.categoryNameMr || listing.categoryName || listing.category || "",
    price: listing.price,
    unit: listing.unit,
    availableQuantity: listing.quantity,
    village: listing.village.name,
    villageMr: listing.village.nameMr,
    distanceKm: listing.village.distanceKm,
    sellerName: "",
    sellerNameMr: "",
    postedMinutesAgo: Math.max(
      0,
      Math.floor((now - Date.parse(listing.createdAt)) / 60000),
    ),
    image: null,
    photoUrl: listing.photoUrl,
    isDemo: listing.isDemo,
    minimumPurchaseQuantity: listing.minimumPurchaseQuantity,
    fulfillmentOptions: listing.fulfillmentOptions,
  };
}
export function liveDashboard(
  account: MobileUser,
  language: MobileLanguage,
  listings: MobileListing[],
  total: number,
  isSeller: boolean,
  now = Date.now(),
): HomeDashboardData {
  return {
    user: {
      firstName: account.firstName || account.name,
      lastName: account.lastName || "",
      village: account.village
        ? language === "mr"
          ? account.village.nameMr
          : account.village.name
        : "",
      taluka: account.village?.taluka || "",
      district: account.village?.district || "",
      isBuyer: true,
      isSeller,
    },
    coordinator: null,
    listings: listings.map((listing) => toHomeListing(listing, now)),
    listingCount: total,
    isPreview: false,
  };
}
