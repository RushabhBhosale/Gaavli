import type { MobileLanguage } from "@gaavli/types";

export const MOBILE_LANGUAGES: readonly MobileLanguage[] = ["mr", "en"];
export const DEFAULT_MOBILE_LANGUAGE: MobileLanguage = "mr";
export const API_TIMEOUT_MS = 10000;

export const LISTING_PRODUCT_GROUPS = [
  "vegetables",
  "leafy_vegetables",
  "fruits",
  "grain",
  "grains",
  "pulses",
  "spices",
  "oilseeds",
  "flowers",
  "cash_crops",
  "farm_products",
  "dairy",
  "eggs_poultry",
  "homemade",
] as const;

// Immutable stock photos shipped with both apps; never arbitrary client paths.
export const LISTING_ASSET_PHOTOS = [
  {
    id: "tomato",
    name: "Tomato",
    nameMr: "टोमॅटो",
    key: "listings/assets/tomato.webp",
  },
  {
    id: "onion",
    name: "Onion",
    nameMr: "कांदा",
    key: "listings/assets/onion.webp",
  },
  {
    id: "potato",
    name: "Potato",
    nameMr: "बटाटा",
    key: "listings/assets/potato.webp",
  },
  {
    id: "rice",
    name: "Rice",
    nameMr: "तांदूळ",
    key: "listings/assets/rice.webp",
  },
  {
    id: "mango",
    name: "Mango",
    nameMr: "आंबा",
    key: "listings/assets/mango.webp",
  },
] as const;
