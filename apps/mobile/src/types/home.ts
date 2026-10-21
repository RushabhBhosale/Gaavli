import type { MobileLanguage } from "@gaavli/types";

export type ProductImageKey = "tomato" | "onion" | "potato" | "rice" | "mango";
export type HomeListing = {
  id: string;
  name: string;
  nameMr: string;
  description?: string | null;
  category: string;
  categoryMr: string;
  price: number | null;
  unit: string | null;
  availableQuantity: number | null;
  village: string;
  villageMr: string;
  sampleDistanceKm?: number;
  distanceKm?: number;
  sellerName: string;
  sellerNameMr: string;
  postedMinutesAgo: number;
  image: ProductImageKey | null;
  photoUrl?: string | null;
  isDemo?: boolean;
  minimumPurchaseQuantity?: number | null;
  fulfillmentOptions?: ("farm_pickup" | "local_transport")[];
};
export type HomeUser = {
  firstName: string;
  lastName: string;
  village: string;
  taluka: string;
  district: string;
  isBuyer: true;
  isSeller: boolean;
};
export type HomeCoordinator = {
  name: string;
  nameMr: string;
  phone: string;
  verified: boolean;
};
export type HomeDashboardData = {
  user: HomeUser;
  coordinator: HomeCoordinator | null;
  listings: HomeListing[];
  listingCount: number;
  isPreview: boolean;
};
export type HomeDestination =
  | "/marketplace"
  | "/become-seller"
  | "/add-listing"
  | "/my-listings"
  | "/insights"
  | "/services"
  | "/transport"
  | "/village-information";
export function listingName(listing: HomeListing, language: MobileLanguage) {
  return language === "mr" ? listing.nameMr : listing.name;
}
