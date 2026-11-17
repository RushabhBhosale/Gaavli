import type { MobileLanguage } from "@gaavli/types";

// Short quality tags a seller can add to a listing ("Organic", "Desi", ...).
// Listings store only the id; both apps show the label in the reader's
// language. Ids are permanent: rename a label, never an id.
export const LISTING_TAGS = [
  { id: "organic", en: "Organic", mr: "सेंद्रिय", hi: "जैविक" },
  { id: "natural", en: "Natural", mr: "नैसर्गिक", hi: "प्राकृतिक" },
  {
    id: "chemical_free",
    en: "Chemical-free",
    mr: "रसायनमुक्त",
    hi: "रसायन-मुक्त",
  },
  {
    id: "fresh_today",
    en: "Picked today",
    mr: "आजच तोडलेले",
    hi: "आज ही तोड़ा",
  },
  { id: "desi", en: "Desi", mr: "गावरान", hi: "देसी" },
  { id: "sorted", en: "Sorted", mr: "निवडक", hi: "छँटा हुआ" },
  { id: "washed", en: "Washed", mr: "धुतलेले", hi: "धुला हुआ" },
  {
    id: "naturally_ripened",
    en: "Naturally ripened",
    mr: "नैसर्गिक पिकवलेले",
    hi: "प्राकृतिक रूप से पका",
  },
  { id: "new_crop", en: "New crop", mr: "नवीन पीक", hi: "नई फसल" },
  { id: "cleaned", en: "Cleaned", mr: "साफ केलेले", hi: "साफ़ किया हुआ" },
  {
    id: "unpolished",
    en: "Unpolished",
    mr: "पॉलिश न केलेले",
    hi: "बिना पॉलिश",
  },
  {
    id: "sun_dried",
    en: "Sun-dried",
    mr: "उन्हात वाळवलेले",
    hi: "धूप में सुखाया",
  },
  {
    id: "stone_ground",
    en: "Stone-ground",
    mr: "जात्यावर दळलेले",
    hi: "चक्की में पिसा",
  },
  {
    id: "no_added_colour",
    en: "No added colour",
    mr: "रंग न घातलेले",
    hi: "बिना रंग",
  },
  {
    id: "wood_pressed",
    en: "Wood-pressed",
    mr: "लाकडी घाण्याचे",
    hi: "कच्ची घानी",
  },
  { id: "pure", en: "Pure", mr: "शुद्ध", hi: "शुद्ध" },
  { id: "desi_cow", en: "Desi cow", mr: "देशी गाईचे", hi: "देसी गाय का" },
  { id: "buffalo", en: "Buffalo", mr: "म्हशीचे", hi: "भैंस का" },
  { id: "homemade", en: "Homemade", mr: "घरगुती", hi: "घर का बना" },
  {
    id: "no_preservatives",
    en: "No preservatives",
    mr: "प्रिझर्व्हेटिव्ह नाही",
    hi: "बिना प्रिज़र्वेटिव",
  },
  {
    id: "traditional",
    en: "Traditional recipe",
    mr: "पारंपरिक पद्धत",
    hi: "पारंपरिक विधि",
  },
  {
    id: "made_to_order",
    en: "Made to order",
    mr: "ऑर्डरनुसार",
    hi: "ऑर्डर पर",
  },
  {
    id: "free_range",
    en: "Free-range",
    mr: "मोकळे पाळलेले",
    hi: "खुले में पाला",
  },
  { id: "grafted", en: "Grafted", mr: "कलम केलेले", hi: "कलमी" },
  { id: "potted", en: "In a pot", mr: "कुंडीतील", hi: "गमले में" },
  { id: "certified", en: "Certified", mr: "प्रमाणित", hi: "प्रमाणित" },
  { id: "vaccinated", en: "Vaccinated", mr: "लसीकरण झालेले", hi: "टीका लगा" },
  { id: "milking", en: "Giving milk", mr: "दुभती", hi: "दुधारू" },
  { id: "herbal", en: "Herbal", mr: "वनौषधी", hi: "हर्बल" },
  { id: "handmade", en: "Handmade", mr: "हाताने बनवलेले", hi: "हाथ से बना" },
  { id: "handloom", en: "Handloom", mr: "हातमाग", hi: "हथकरघा" },
  { id: "cotton", en: "Cotton", mr: "सुती", hi: "सूती" },
  {
    id: "eco_friendly",
    en: "Eco-friendly",
    mr: "पर्यावरणपूरक",
    hi: "पर्यावरण अनुकूल",
  },
  {
    id: "gift",
    en: "Good for gifting",
    mr: "भेट देण्याजोगे",
    hi: "उपहार योग्य",
  },
  { id: "brand_new", en: "New", mr: "नवीन", hi: "नया" },
  { id: "used", en: "Used", mr: "वापरलेले", hi: "पुराना" },
  { id: "bulk", en: "Bulk available", mr: "घाऊक मिळेल", hi: "थोक में उपलब्ध" },
] as const;

export type ListingTag = (typeof LISTING_TAGS)[number]["id"];
export const LISTING_TAG_IDS = LISTING_TAGS.map((tag) => tag.id) as [
  ListingTag,
  ...ListingTag[],
];
export const MAX_LISTING_TAGS = 5;

// The tags offered for each product group, most useful first. A tag shows
// only where a buyer would expect it: "Desi cow" for milk, never for rice.
export const LISTING_TAGS_BY_GROUP: Record<string, readonly ListingTag[]> = {
  vegetables: [
    "fresh_today",
    "organic",
    "desi",
    "chemical_free",
    "sorted",
    "bulk",
  ],
  leafy_vegetables: [
    "fresh_today",
    "organic",
    "desi",
    "chemical_free",
    "washed",
    "bulk",
  ],
  fruits: [
    "naturally_ripened",
    "organic",
    "fresh_today",
    "desi",
    "chemical_free",
    "sorted",
    "bulk",
  ],
  grain: [
    "organic",
    "desi",
    "new_crop",
    "cleaned",
    "unpolished",
    "sorted",
    "bulk",
  ],
  grains: [
    "organic",
    "desi",
    "new_crop",
    "cleaned",
    "unpolished",
    "sorted",
    "bulk",
  ],
  pulses: ["organic", "desi", "new_crop", "cleaned", "unpolished", "bulk"],
  spices: [
    "organic",
    "homemade",
    "sun_dried",
    "stone_ground",
    "no_added_colour",
    "pure",
  ],
  oilseeds: ["organic", "desi", "new_crop", "cleaned", "sun_dried", "bulk"],
  flowers: ["fresh_today", "desi", "natural", "made_to_order", "bulk"],
  cash_crops: ["organic", "new_crop", "sorted", "sun_dried", "bulk"],
  farm_products: [
    "organic",
    "natural",
    "pure",
    "chemical_free",
    "homemade",
    "bulk",
  ],
  dairy: [
    "pure",
    "desi_cow",
    "buffalo",
    "fresh_today",
    "homemade",
    "no_preservatives",
  ],
  eggs_poultry: ["desi", "free_range", "fresh_today", "natural", "bulk"],
  homemade: [
    "homemade",
    "traditional",
    "no_preservatives",
    "made_to_order",
    "pure",
    "gift",
  ],
  groceries: [
    "organic",
    "pure",
    "wood_pressed",
    "unpolished",
    "no_preservatives",
    "bulk",
  ],
  meat_fish: ["fresh_today", "desi", "free_range", "cleaned", "made_to_order"],
  plants_garden: ["desi", "grafted", "potted", "organic", "bulk"],
  farm_inputs: ["organic", "natural", "certified", "bulk"],
  livestock: ["desi", "vaccinated", "milking", "free_range"],
  puja: ["pure", "natural", "handmade", "fresh_today", "made_to_order"],
  household: ["brand_new", "used", "handmade", "eco_friendly"],
  personal_care: ["natural", "herbal", "homemade", "chemical_free", "handmade"],
  clothing: ["brand_new", "used", "handmade", "handloom", "cotton"],
  handicrafts: [
    "handmade",
    "traditional",
    "eco_friendly",
    "made_to_order",
    "gift",
  ],
  other: [
    "natural",
    "organic",
    "homemade",
    "handmade",
    "brand_new",
    "used",
    "bulk",
  ],
};

export function listingTagsForGroup(group: string | null | undefined) {
  return LISTING_TAGS_BY_GROUP[group || "other"] ?? LISTING_TAGS_BY_GROUP.other;
}

export function listingTagLabel(id: string, language: MobileLanguage) {
  const tag = LISTING_TAGS.find((item) => item.id === id);
  return tag ? tag[language] : null;
}
