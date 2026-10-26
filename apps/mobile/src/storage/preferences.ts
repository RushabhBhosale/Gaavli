import { DEFAULT_MOBILE_LANGUAGE } from "@gaavli/constants";
import type { MobileLanguage, MobileUser, MobileVillage } from "@gaavli/types";
import { mobileLanguageSchema, mobileVillageSchema } from "@gaavli/validation";
import { hasCoordinatorRole } from "../data/accountAccess";

export interface PreferenceStorage {
  readHasAuthenticated(): Promise<string | null>;
  writeHasAuthenticated(): Promise<void>;
  readLanguage(): Promise<string | null>;
  writeLanguage(language: MobileLanguage): Promise<void>;
  readGuestVillage(): Promise<string | null>;
  writeGuestVillage(value: string): Promise<void>;
  clearGuestBrowsing(): Promise<void>;
}
export type OnboardingPreferences = {
  language: MobileLanguage;
  confirmed: boolean;
  hasAuthenticated: boolean;
  guestVillage: MobileVillage | null;
};
function parseGuestVillage(saved: string | null) {
  if (!saved) return null;
  try {
    const parsed = mobileVillageSchema.safeParse(JSON.parse(saved));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export async function restorePreferences(
  storage: PreferenceStorage,
): Promise<OnboardingPreferences> {
  const [saved, village, authenticated] = await Promise.all([
    storage.readLanguage(),
    storage.readGuestVillage(),
    storage.readHasAuthenticated(),
  ]);
  const parsed = mobileLanguageSchema.safeParse(saved);
  const guestVillage = parseGuestVillage(village);
  return parsed.success
    ? {
        language: parsed.data,
        confirmed: true,
        guestVillage,
        hasAuthenticated: authenticated === "true",
      }
    : {
        language: DEFAULT_MOBILE_LANGUAGE,
        confirmed: false,
        guestVillage,
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
export async function saveGuestVillage(
  storage: PreferenceStorage,
  village: MobileVillage,
): Promise<OnboardingPreferences> {
  await storage.writeGuestVillage(
    JSON.stringify(mobileVillageSchema.parse(village)),
  );
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
  guestVillage?: MobileVillage | null,
  _hasAuthenticated = false,
):
  | "/register"
  | "/language"
  | "/village"
  | "/home"
  | "/my-listings"
  | "/manage" {
  if (user) return user.village ? accountHome(user) : "/village";
  return guestVillage ? "/home" : "/language";
}
export function postAuthHref(
  user: MobileUser,
  listingId?: string | null,
): "/home" | "/village" | "/my-listings" | "/manage" | `/product/${string}` {
  if (!user.village) return "/village";
  if (listingId && /^[a-f0-9]{24}$/i.test(listingId))
    return `/product/${listingId}`;
  return accountHome(user);
}
