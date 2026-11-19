import type { LISTING_PRODUCT_GROUPS } from "./index";
import { SHOP_PRODUCT_CATEGORY_OVERRIDES } from "./shopProductCategoryOverrides";

// What a shop says it usually sells: product groups, plus optional popular
// items (Product Master codes). Not stock: listings carry quantity and price.
// See docs/03-api/SHOP_PRODUCTS.md.
export type ListingProductGroup = (typeof LISTING_PRODUCT_GROUPS)[number];
export type ShopProductGroup = ListingProductGroup | "footwear" | "hardware";

// Shop categories are more specific than the existing catalogue groups.
export function shopGroupForProduct(
  code: string,
  productGroup: string,
): string {
  return (
    SHOP_PRODUCT_CATEGORY_OVERRIDES[code] ??
    (productGroup === "grain" ? "grains" : productGroup)
  );
}

export function shopGroupsWithProducts(
  groups: readonly string[],
  products: readonly string[],
): string[] {
  return [
    ...new Set([
      ...groups,
      ...products.flatMap((code) =>
        SHOP_PRODUCT_CATEGORY_OVERRIDES[code]
          ? [SHOP_PRODUCT_CATEGORY_OVERRIDES[code]]
          : [],
      ),
    ]),
  ];
}
type Tri = { en: string; mr: string; hi: string };

// Ticking a group ticks all its popular items (2026-11-18), so the limit
// leaves room for every item of every group (about 400 in all).
export const MAX_SHOP_PRODUCTS = 450;

// The groups a shop can pick, in the order the app shows them. The older
// "grain" id is left out: the catalogue uses "grains".
export const SHOP_PRODUCT_GROUPS: readonly ({
  id: ShopProductGroup;
  icon: string;
} & Tri)[] = [
  {
    id: "vegetables",
    icon: "leaf-outline",
    en: "Vegetables",
    mr: "भाजीपाला",
    hi: "सब्ज़ियाँ",
  },
  {
    id: "leafy_vegetables",
    icon: "leaf",
    en: "Leafy Vegetables",
    mr: "पालेभाज्या",
    hi: "पत्तेदार सब्ज़ियाँ",
  },
  {
    id: "fruits",
    icon: "nutrition-outline",
    en: "Fruits",
    mr: "फळे",
    hi: "फल",
  },
  {
    id: "groceries",
    icon: "cart-outline",
    en: "Groceries",
    mr: "किराणा",
    hi: "किराना",
  },
  {
    id: "grains",
    icon: "basket-outline",
    en: "Grains and Flour",
    mr: "धान्य व पीठ",
    hi: "अनाज और आटा",
  },
  {
    id: "pulses",
    icon: "ellipse-outline",
    en: "Pulses and Dals",
    mr: "कडधान्ये व डाळी",
    hi: "दालें",
  },
  {
    id: "spices",
    icon: "flame-outline",
    en: "Spices and Masala",
    mr: "मसाले",
    hi: "मसाले",
  },
  {
    id: "oilseeds",
    icon: "water-outline",
    en: "Oilseeds",
    mr: "तेलबिया",
    hi: "तिलहन",
  },
  {
    id: "dairy",
    icon: "cafe-outline",
    en: "Milk and Dairy",
    mr: "दूध व दुग्धजन्य",
    hi: "दूध और डेयरी",
  },
  {
    id: "eggs_poultry",
    icon: "egg-outline",
    en: "Eggs and Poultry",
    mr: "अंडी व कोंबड्या",
    hi: "अंडे और मुर्गी",
  },
  {
    id: "meat_fish",
    icon: "fish-outline",
    en: "Meat and Fish",
    mr: "मांस व मासे",
    hi: "मांस और मछली",
  },
  {
    id: "homemade",
    icon: "restaurant-outline",
    en: "Food, Sweets and Snacks",
    mr: "खाद्यपदार्थ, मिठाई व फराळ",
    hi: "खाना, मिठाई और नाश्ता",
  },
  {
    id: "flowers",
    icon: "flower-outline",
    en: "Flowers and Garlands",
    mr: "फुले व हार",
    hi: "फूल और माला",
  },
  {
    id: "puja",
    icon: "sparkles-outline",
    en: "Puja Items",
    mr: "पूजा साहित्य",
    hi: "पूजा सामग्री",
  },
  {
    id: "household",
    icon: "home-outline",
    en: "Household",
    mr: "घरगुती वस्तू",
    hi: "घरेलू सामान",
  },
  {
    id: "hardware",
    icon: "hammer-outline",
    en: "Hardware",
    mr: "हार्डवेअर",
    hi: "हार्डवेयर",
  },
  {
    id: "personal_care",
    icon: "happy-outline",
    en: "Personal Care",
    mr: "वैयक्तिक काळजी",
    hi: "निजी देखभाल",
  },
  {
    id: "clothing",
    icon: "shirt-outline",
    en: "Clothes",
    mr: "कपडे",
    hi: "कपड़े",
  },
  {
    id: "footwear",
    icon: "footsteps-outline",
    en: "Footwear",
    mr: "पादत्राणे",
    hi: "जूते-चप्पल",
  },
  {
    id: "handicrafts",
    icon: "color-palette-outline",
    en: "Handicrafts and Decor",
    mr: "हस्तकला व सजावट",
    hi: "हस्तशिल्प और सजावट",
  },
  {
    id: "farm_inputs",
    icon: "construct-outline",
    en: "Seeds, Fertilizer and Tools",
    mr: "बियाणे, खते व अवजारे",
    hi: "बीज, खाद और औज़ार",
  },
  {
    id: "farm_products",
    icon: "cube-outline",
    en: "Farm Products",
    mr: "शेतमाल",
    hi: "कृषि उत्पाद",
  },
  {
    id: "plants_garden",
    icon: "rose-outline",
    en: "Plants and Nursery",
    mr: "रोपे व नर्सरी",
    hi: "पौधे और नर्सरी",
  },
  {
    id: "livestock",
    icon: "paw-outline",
    en: "Livestock and Feed",
    mr: "पशुधन व चारा",
    hi: "पशुधन और चारा",
  },
  {
    id: "cash_crops",
    icon: "cash-outline",
    en: "Cash Crops",
    mr: "नगदी पिके",
    hi: "नकदी फसलें",
  },
];
export const SHOP_PRODUCT_GROUP_IDS = SHOP_PRODUCT_GROUPS.map(
  (group) => group.id,
) as [ShopProductGroup, ...ShopProductGroup[]];
export function shopProductGroup(id: string) {
  return SHOP_PRODUCT_GROUPS.find((group) => group.id === id);
}

// Groups pre-ticked when a seller picks a seeded shop type (SHOP_TYPE master
// codes are immutable). Types an admin adds later get no suggestion.
export const SHOP_TYPE_PRODUCT_GROUPS: Readonly<
  Record<string, readonly ShopProductGroup[]>
> = {
  GROCERY: ["groceries", "grains", "pulses", "spices"],
  KIRANA_GENERAL_STORE: [
    "groceries",
    "grains",
    "pulses",
    "spices",
    "household",
    "personal_care",
  ],
  GENERAL_STORE: ["groceries", "household", "personal_care"],
  FISH_SELLER: ["meat_fish"],
  HARDWARE: ["hardware"],
  AGRI_INPUTS: ["farm_inputs"],
  VEGETABLE_FRUIT_SHOP: ["vegetables", "leafy_vegetables", "fruits"],
  DAIRY_MILK_BOOTH: ["dairy"],
  BAKERY_SWEETS: ["homemade", "groceries"],
  CLOTHING_TAILORING_STORE: ["clothing"],
  FOOTWEAR: ["footwear"],
  ELECTRONICS_MOBILE: ["hardware"],
  STATIONERY: ["household"],
  MEDICAL_STORE: ["personal_care"],
  POULTRY_MEAT: ["meat_fish", "eggs_poultry"],
  FLOUR_MILL_GRAIN: ["grains", "pulses"],
  FURNITURE: ["household"],
};
