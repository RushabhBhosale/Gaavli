import { DEFAULT_MOBILE_LANGUAGE } from "@gaavli/constants";
import type { MobileLanguage, MobileUser } from "@gaavli/types";
import { mobileLanguageSchema } from "@gaavli/validation";

export interface PreferenceStorage {
  readLanguage(): Promise<string | null>;
  writeLanguage(language: MobileLanguage): Promise<void>;
}
export type OnboardingPreferences = {
  language: MobileLanguage;
  confirmed: boolean;
};
export async function restorePreferences(
  storage: PreferenceStorage,
): Promise<OnboardingPreferences> {
  const saved = await storage.readLanguage();
  const parsed = mobileLanguageSchema.safeParse(saved);
  return parsed.success
    ? { language: parsed.data, confirmed: true }
    : { language: DEFAULT_MOBILE_LANGUAGE, confirmed: false };
}
export async function confirmLanguage(
  storage: PreferenceStorage,
  language: MobileLanguage,
): Promise<OnboardingPreferences> {
  const value = mobileLanguageSchema.parse(language);
  await storage.writeLanguage(value);
  return { language: value, confirmed: true };
}
export function initialRoute(
  confirmed: boolean,
  user?: MobileUser | null,
): "/language" | "/register" | "/village" | "/home" {
  if (user) return user.village ? "/home" : "/village";
  return confirmed ? "/register" : "/language";
}
