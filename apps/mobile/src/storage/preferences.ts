import { DEFAULT_MOBILE_LANGUAGE } from "@gaavli/constants";
import type { MobileLanguage, MobileUser, MobileVillage } from "@gaavli/types";
import { mobileLanguageSchema } from "@gaavli/validation";
import { hasCoordinatorRole } from "../data/accountAccess";
import {
  restoreBrowsingVillage,
  type BrowsingVillageStorage,
} from "./browsingVillage";

export interface PreferenceStorage extends BrowsingVillageStorage {
  readHasAuthenticated(): Promise<string | null>;
  writeHasAuthenticated(): Promise<void>;
  readLanguage(): Promise<string | null>;
  writeLanguage(language: MobileLanguage): Promise<void>;
  readGuestVillage(): Promise<string | null>;
  clearGuestBrowsing(): Promise<void>;
}
export type OnboardingPreferences = {
  language: MobileLanguage;
  confirmed: boolean;
  hasAuthenticated: boolean;
  browsingVillage: MobileVillage | null;
};
export async function restorePreferences(
  storage: PreferenceStorage,
): Promise<OnboardingPreferences> {
  const [saved, village, authenticated] = await Promise.all([
    storage.readLanguage(),
    restoreBrowsingVillage(storage).then(async (saved) => {
      if (saved) return saved;
      // Read the legacy guest setting only for migration; all new writes use
      // the single browsing-village setting.
      return restoreBrowsingVillage({
        readBrowsingVillage: () => storage.readGuestVillage(),
        writeBrowsingVillage: (value) => storage.writeBrowsingVillage(value),
      });
    }),
    storage.readHasAuthenticated(),
  ]);
  const parsed = mobileLanguageSchema.safeParse(saved);
  const browsingVillage = village;
  return parsed.success
    ? {
        language: parsed.data,
        confirmed: true,
        browsingVillage,
        hasAuthenticated: authenticated === "true",
      }
    : {
        language: DEFAULT_MOBILE_LANGUAGE,
        confirmed: false,
        browsingVillage,
        hasAuthenticated: authenticated === "true",
      };
}
export async function confirmLanguage(
  storage: PreferenceStorage,
  language: MobileLanguage,
): Promise<OnboardingPreferences> {
  const value = mobileLanguageSchema.parse(language);
  await storage.writeLanguage(value);
  return restorePreferences(storage);
}
export function accountHome(
  user: MobileUser,
): "/home" | "/my-listings" | "/manage" {
  if (hasCoordinatorRole(user)) return "/manage";
  if (user.isSeller) return "/my-listings";
  return "/home";
}
export function initialRoute(
  _confirmed: boolean,
  user?: MobileUser | null,
  browsingVillage?: MobileVillage | null,
  _hasAuthenticated = false,
):
  | "/register"
  | "/language"
  | "/village"
  | "/home"
  | "/my-listings"
  | "/manage" {
  if (user) return user.village ? accountHome(user) : "/village";
  return browsingVillage ? "/home" : "/language";
}
export function postAuthHref(
  user: MobileUser,
  listingId?: string | null,
  login = false,
): "/home" | "/village" | "/my-listings" | "/manage" | `/product/${string}` {
  if (!user.village) return "/village";
  if (listingId && /^[a-f0-9]{24}$/i.test(listingId))
    return `/product/${listingId}`;
  if (login && !hasCoordinatorRole(user)) return "/home";
  return accountHome(user);
}
