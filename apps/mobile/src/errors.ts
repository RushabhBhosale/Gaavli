import type { MobileLanguage } from "@gaavli/types";
import { ApiError } from "./api/client";
import { messages } from "./i18n";
export function errorMessage(error: unknown, language: MobileLanguage) {
  const t = messages(language);
  if (!(error instanceof ApiError)) return t.genericError;
  const map: Record<string, string> = {
    PROFILE_CONFLICT: t.profileConflict,
    MOBILE_UNAVAILABLE: t.mobileUnavailable,
    PHOTO_FORBIDDEN: t.photoInvalid,
    REQUEST_ALREADY_SENT: t.requestAlreadySent,
    REQUEST_QUANTITY_INVALID: t.requestQuantityError,
    REQUEST_UNAVAILABLE: t.requestUnavailable,
    CONTACT_PERMISSION_REQUIRED: t.callbackPermissionRequired,
    INTEREST_REQUIRED: t.interestRequired,
    CONTACT_UNAVAILABLE: t.contactUnavailable,
    OWN_LISTING_CONTACT: t.ownListingContact,
    LISTING_UNAVAILABLE: t.productUnavailable,
    PRODUCT_UNAVAILABLE: t.productMasterInactive,
    REGISTRATION_REQUIRED: t.registrationRequired,
    STALE_VERSION: t.listingConflict,
    INVALID_LISTING_STATE: t.editUnavailable,
    PHOTO_TOO_LARGE: t.photoTooLarge,
    CAMERA_PERMISSION_REQUIRED: t.cameraPermissionRequired,
    PHOTO_INVALID: t.photoInvalid,
    PHOTO_MISSING: t.photoMissing,
    PHOTO_UNAVAILABLE: t.photoMissing,
    PHOTO_STORAGE_UNAVAILABLE: t.photoStorageUnavailable,
    OTP_INVALID: t.otpInvalid,
    OTP_EXPIRED: t.otpExpired,
    OTP_ATTEMPTS_EXCEEDED: t.otpLimited,
    OTP_THROTTLED: t.rateLimited,
    RATE_LIMITED: t.rateLimited,
    AUTH_UNAVAILABLE: t.authUnavailable,
    OTP_DELIVERY_FAILED: t.authUnavailable,
    VILLAGE_UNAVAILABLE: t.villageUnavailable,
    ACCOUNT_UNAVAILABLE: t.accountUnavailable,
    ACCOUNT_CONFLICT: t.accountUnavailable,
    NETWORK_ERROR: t.connectionError,
    TIMEOUT: t.connectionError,
    API_URL_MISSING: t.connectionError,
  };
  return map[error.code] || t.genericError;
}
