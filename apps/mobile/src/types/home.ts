import { productDisplayName } from "../locale";
import type { MobileLanguage } from "@gaavli/types";

export type ProductImageKey = "tomato" | "onion" | "potato" | "rice" | "mango";
export type HomeListing = {
  availability?: "available" | "sold_out" | "expired";
  module?: "marketplace" | "services" | "transport";
  id: string;
  name: string;
  nameMr: string;
  nameHi?: string | null;
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
  tags?: string[];
  // Sellers of this same product and unit; price is the cheapest of them.
  offerCount?: number;
  minPrice?: number | null;
  maxPrice?: number | null;
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
  phone: string | null;
  publicContactable?: boolean;
  village?: string;
  villageMr?: string;
  verified: boolean;
};
export type HomeDashboardData = {
  user: HomeUser;
  coordinator: HomeCoordinator | null;
  listings: HomeListing[];
  listingCount: number;
  serviceCount?: number;
  transportCount?: number;
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
  | "/village-coordinator";
export function listingName(listing: HomeListing, language: MobileLanguage) {
  return productDisplayName(language, {
    en: listing.name,
    mr: listing.nameMr,
    hi: listing.nameHi,
  });
}
