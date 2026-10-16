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
};
export type ListingProductGroup = "vegetables" | "fruits" | "grain" | "dairy";
export type ListingStatus =
  "active" | "expired" | "sold_out" | "deactivated" | "reported" | "pending";
export type ListingFulfillmentOption = "farm_pickup" | "local_transport";
export type CreateListingInput = {
  productName: string;
  productNameMr?: string | null;
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
  productName: string;
  productNameMr: string | null;
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
