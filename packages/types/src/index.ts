export type MobileLanguage = "mr" | "en";
export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: Record<string, unknown> };
  requestId?: string;
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
export type HealthStatus = { status: "ok" };
export type MobileVillage = {
  id: string;
  name: string;
  nameMr: string;
  taluka: string;
  district: string;
  pinCode: string | null;
  distanceKm?: number;
};
export type MobileUser = {
  isCoordinator?: boolean;
  coordinatorVillages?: MobileVillage[];
  isSeller?: boolean;
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  language: MobileLanguage;
  village: MobileVillage | null;
};
export type MobileSession = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  user: MobileUser;
};
export type RegistrationDraft = {
  firstName: string;
  lastName: string;
  mobile: string;
};
export type OtpChallenge = {
  challengeId: string;
  expiresAt: string;
  resendAt: string;
};
export type MobileListing = {
  id: string;
  productName: string;
  productNameMr: string | null;
  description: string | null;
  photoUrl: string | null;
  isDemo: boolean;
  category: string | null;
  categoryName: string | null;
  categoryNameMr: string | null;
  quantity: number | null;
  unit: string | null;
  price: number | null;
  village: MobileVillage;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  minimumPurchaseQuantity?: number | null;
  fulfillmentOptions?: ("farm_pickup" | "local_transport")[];
};
export type MobileListingPage = {
  listings: MobileListing[];
  total: number;
  page: number;
  limit: number;
  categories: { code: string; name: string; nameMr: string | null }[];
  isSeller: boolean;
  villageCounts?: { id: string; name: string; nameMr: string; count: number }[];
};
export type ListingProductGroup =
  | "vegetables"
  | "leafy_vegetables"
  | "fruits"
  | "grain"
  | "grains"
  | "pulses"
  | "spices"
  | "oilseeds"
  | "flowers"
  | "cash_crops"
  | "farm_products"
  | "dairy"
  | "eggs_poultry"
  | "homemade";
export type MasterProduct = {
  productId: string;
  code: string;
  nameMr: string;
  nameEn: string;
  productGroup: ListingProductGroup;
  defaultUnit: string;
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
};
export type ListingStatus =
  "active" | "expired" | "sold_out" | "deactivated" | "reported" | "pending";
export type ListingFulfillmentOption = "farm_pickup" | "local_transport";
export type CreateListingInput = {
  productId?: string;
  productName: string;
  productNameMr?: string | null;
  description?: string | null;
  villageId: string;
  categoryId: string;
  productGroup?: ListingProductGroup | null;
  quantity: number;
  unit: string;
  price?: number | null;
  expiresAt: string | null;
  photoObjectKey?: string | null;
  minimumPurchaseQuantity?: number | null;
  fulfillmentOptions?: ListingFulfillmentOption[];
};
export type UpdateListingInput = Partial<
  Omit<CreateListingInput, "villageId">
> & { version: number };
export type OwnedListing = {
  id: string;
  productId?: string | null;
  productName: string;
  productNameMr: string | null;
  description: string | null;
  categoryId: string | null;
  category: string | null;
  productGroup: ListingProductGroup | null;
  quantity: number | null;
  unit: string | null;
  price: number | null;
  photoObjectKey: string | null;
  photoUrl: string | null;
  minimumPurchaseQuantity: number | null;
  fulfillmentOptions: ListingFulfillmentOption[];
  villageId: string;
  village: MobileVillage | null;
  status: ListingStatus;
  version: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};
