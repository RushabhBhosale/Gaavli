import type { MobileLanguage } from "@gaavli/types";

export const LANGUAGE_LABELS: Record<MobileLanguage, string> = {
  mr: "मराठी",
  en: "English",
  hi: "हिन्दी",
};

// Marathi keeps Devanagari digits; Hindi uses the Indian convention of Latin digits.
export function numberLocale(language: MobileLanguage) {
  return language === "mr"
    ? "mr-IN-u-nu-deva"
    : language === "hi"
      ? "hi-IN"
      : "en-IN";
}

export function dateLocale(language: MobileLanguage) {
  return language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";
}

export function speechLocale(language: MobileLanguage) {
  return dateLocale(language);
}

// Villages, categories and people only have English and Marathi names. Hindi
// readers get the Devanagari (Marathi) spelling of the same place or person.
export function localName(
  language: MobileLanguage,
  name: string,
  nameMr: string | null | undefined,
) {
  return language === "en" ? name : nameMr || name;
}

// Product names follow the selected language with an English fallback.
export function productDisplayName(
  language: MobileLanguage,
  names: {
    en: string | null | undefined;
    mr: string | null | undefined;
    hi: string | null | undefined;
  },
) {
  const preferred =
    language === "mr" ? names.mr : language === "hi" ? names.hi : names.en;
  return preferred || names.en || names.mr || "";
}
