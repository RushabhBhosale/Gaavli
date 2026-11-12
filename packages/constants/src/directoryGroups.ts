import type { MobileLanguage } from "@gaavli/types";

// The categories shown on the Services and Transport dashboards. Entries are
// matched to a group by the provider-master code a provider picked, the older
// four-way category, or a word in the name, so listings added before provider
// codes existed still land in the right tile. `words` are regex sources
// matched case-insensitively against the English and Marathi names; the
// server filter and the tile counts use the same patterns.
// One entry can match several groups (a "Farm equipment repair" is both a
// repair and farm help), so tile counts need not add up to the total.
export type DirectoryModule = "services" | "transport";
type DirectoryGroupDef = {
  id: string;
  module: DirectoryModule;
  en: string;
  mr: string;
  hi: string;
  codes: readonly string[];
  categories: readonly string[];
  words: readonly string[];
  // Registered providers of these kinds (ProviderType values) belong here.
  providerTypes?: readonly string[];
};

export const DIRECTORY_GROUPS = [
  {
    id: "repairs",
    module: "services",
    en: "Repairs & technicians",
    mr: "दुरुस्ती व तंत्रज्ञ",
    hi: "मरम्मत और तकनीशियन",
    codes: [
      "ELECTRICIAN",
      "PLUMBER",
      "MECHANIC",
      "WELDER",
      "PUMP_MOTOR_REPAIR",
      "AC_FRIDGE_REPAIR",
      "MOBILE_REPAIR",
      "COMPUTER_CCTV_TECHNICIAN",
      "BLACKSMITH",
    ],
    categories: ["Utility"],
    words: [
      "electric",
      "plumb",
      "mechanic",
      "weld",
      "repair",
      "technician",
      "blacksmith",
      "इलेक्ट्रिशियन",
      "प्लंबर",
      "मेकॅनिक",
      "वेल्डर",
      "दुरुस्ती",
      "लोहार",
    ],
  },
  {
    id: "building",
    module: "services",
    en: "Building & carpentry",
    mr: "बांधकाम व सुतारकाम",
    hi: "निर्माण और बढ़ईगिरी",
    codes: ["CARPENTER", "PAINTER", "MASON_CONSTRUCTION_WORKER", "POTTER"],
    categories: [],
    words: [
      "carpent",
      "paint",
      "mason",
      "construction",
      "potter",
      "कारपेंटर",
      "सुतार",
      "पेंटर",
      "गवंडी",
      "बांधकाम",
      "कुंभार",
    ],
  },
  {
    id: "health",
    module: "services",
    en: "Health & medical",
    mr: "आरोग्य व वैद्यकीय",
    hi: "स्वास्थ्य और चिकित्सा",
    codes: [
      "GENERAL_PHYSICIAN",
      "PEDIATRICIAN",
      "GYNECOLOGIST",
      "ORTHOPEDIC",
      "DENTIST",
      "EYE_SPECIALIST",
      "ENT",
      "SKIN_SPECIALIST",
      "AYURVEDIC",
      "HOMEOPATHIC",
      "PHYSIOTHERAPIST",
      "CARDIOLOGIST",
      "VETERINARY_DOCTOR",
      "MEDICAL_SHOP",
      "MEDICAL_STORE",
      "CLINIC",
      "HOSPITAL",
      "DISPENSARY",
      "DIAGNOSTIC_LAB",
      "VETERINARY_CLINIC",
    ],
    categories: ["Medical"],
    words: [
      "doctor",
      "clinic",
      "hospital",
      "medical",
      "dentist",
      "physio",
      "veterinar",
      "ayurved",
      "homeopath",
      "diagnostic",
      "डॉक्टर",
      "दवाखाना",
      "रुग्णालय",
      "औषध",
      "वैद्य",
    ],
  },
  {
    id: "shops",
    module: "services",
    en: "Shops & stores",
    mr: "दुकाने",
    hi: "दुकानें",
    codes: [
      "GROCERY",
      "KIRANA_GENERAL_STORE",
      "HARDWARE",
      "AGRI_INPUTS",
      "VEGETABLE_FRUIT_SHOP",
      "DAIRY_MILK_BOOTH",
      "BAKERY_SWEETS",
      "CLOTHING_TAILORING_STORE",
      "FOOTWEAR",
      "ELECTRONICS_MOBILE",
      "STATIONERY",
      "MEDICAL_STORE",
      "POULTRY_MEAT",
      "FLOUR_MILL_GRAIN",
      "FURNITURE",
    ],
    categories: ["Shop"],
    words: [
      "shop",
      "store",
      "kirana",
      "grocery",
      "hardware",
      "bakery",
      "stationery",
      "दुकान",
      "किराणा",
      "स्टोअर",
    ],
  },
  {
    id: "personal",
    module: "services",
    en: "Tailoring & beauty",
    mr: "शिलाई व सौंदर्य",
    hi: "सिलाई और सौंदर्य",
    codes: ["TAILOR", "BARBER_SALON", "BEAUTICIAN"],
    categories: [],
    words: [
      "tailor",
      "barber",
      "salon",
      "beauti",
      "शिलाई",
      "टेलर",
      "सलून",
      "ब्युटी",
    ],
  },
  {
    id: "farm",
    module: "services",
    en: "Farm help",
    mr: "शेतीसाठी मदत",
    hi: "खेती में मदद",
    codes: [
      "FARM_LABOUR",
      "TRACTOR_OPERATOR",
      "VETERINARY_HELPER",
      "FARM_EQUIPMENT_RENTAL",
    ],
    categories: [],
    words: [
      "farm",
      "irrigation",
      "labour",
      "tractor",
      "शेती",
      "शेतमजूर",
      "ट्रॅक्टर",
    ],
  },
  {
    id: "events",
    module: "services",
    en: "Events & food",
    mr: "कार्यक्रम व जेवण",
    hi: "कार्यक्रम और भोजन",
    codes: [
      "COOK_CATERER",
      "TENT_DECORATION",
      "PHOTOGRAPHER",
      "TENT_CATERING",
      "EVENT_DECORATION",
      "PANDIT_RELIGIOUS_SERVICES",
      "PRINTING_FLEX",
    ],
    categories: [],
    words: [
      "cater",
      "tent",
      "decorat",
      "photograph",
      "pandit",
      "event",
      "printing",
      "flex",
      "मंडप",
      "सजावट",
      "केटरर",
      "केटरिंग",
      "फोटोग्राफर",
      "पुरोहित",
      "छपाई",
    ],
  },
  {
    id: "everyday",
    module: "services",
    en: "Everyday help",
    mr: "रोजच्या सेवा",
    hi: "रोज़मर्रा की सेवाएँ",
    codes: [
      "TUTOR_TEACHER",
      "MOBILE_RECHARGE_CSC_CENTRE",
      "COURIER",
      "CLEANING",
      "WATER_TANKER",
      "GAS_CYLINDER_DELIVERY",
      "DRIVER",
    ],
    categories: [],
    words: [
      "tutor",
      "teacher",
      "recharge",
      "\\bcsc\\b",
      "courier",
      "clean",
      "tanker",
      "cylinder",
      "ट्यूटर",
      "कुरिअर",
      "स्वच्छता",
      "टँकर",
      "सिलिंडर",
    ],
  },
  {
    id: "public",
    module: "services",
    en: "Government & public offices",
    mr: "शासकीय व सार्वजनिक कार्यालये",
    hi: "सरकारी और सार्वजनिक कार्यालय",
    codes: [],
    categories: [],
    words: [],
    providerTypes: ["PUBLIC_INSTITUTION"],
  },
  {
    id: "community",
    module: "services",
    en: "NGOs & community helpers",
    mr: "एनजीओ व समाजसेवक",
    hi: "एनजीओ और समाजसेवी",
    codes: [],
    categories: [],
    words: [],
    providerTypes: ["COMMUNITY_ORGANISATION", "SOCIAL_HELPER"],
  },
  {
    id: "emergency",
    module: "services",
    en: "Emergency help",
    mr: "आपत्कालीन मदत",
    hi: "आपातकालीन सहायता",
    codes: [],
    categories: [],
    words: [],
    providerTypes: ["EMERGENCY_ASSISTANCE"],
  },
  {
    id: "political",
    module: "services",
    en: "Party offices",
    mr: "पक्ष कार्यालये",
    hi: "पार्टी कार्यालय",
    codes: [],
    categories: [],
    words: [],
    providerTypes: ["POLITICAL_OFFICE"],
  },
  {
    id: "other",
    module: "services",
    en: "Other services",
    mr: "इतर सेवा",
    hi: "अन्य सेवाएँ",
    codes: [],
    categories: [],
    words: [],
  },
  {
    id: "auto",
    module: "transport",
    en: "Autos & rickshaws",
    mr: "रिक्षा",
    hi: "ऑटो रिक्शा",
    codes: ["AUTO"],
    categories: [],
    words: ["\\bauto\\b", "rickshaw", "रिक्षा"],
  },
  {
    id: "taxi",
    module: "transport",
    en: "Cars & taxis",
    mr: "कार व टॅक्सी",
    hi: "कार और टैक्सी",
    codes: ["CAR_TAXI", "JEEP_MARUTI_VAN"],
    categories: [],
    words: [
      "taxi",
      "jeep",
      "\\bcar\\b",
      "\\bvan\\b",
      "maruti",
      "टॅक्सी",
      "जीप",
      "कार",
      "व्हॅन",
    ],
  },
  {
    id: "bus",
    module: "transport",
    en: "Buses",
    mr: "बस",
    hi: "बस",
    codes: ["BUS"],
    categories: [],
    words: ["\\bbus\\b", "(^|\\s)बस($|\\s)"],
  },
  {
    id: "goods",
    module: "transport",
    en: "Goods vehicles",
    mr: "मालवाहतूक",
    hi: "माल वाहन",
    codes: ["TEMPO", "TRUCK", "PICKUP", "MINI_TRUCK"],
    categories: [],
    words: [
      "goods",
      "tempo",
      "truck",
      "pickup",
      "lorry",
      "मालवाहतूक",
      "टेम्पो",
      "ट्रक",
      "पिकअप",
    ],
  },
  {
    id: "tractor",
    module: "transport",
    en: "Tractor & trolley",
    mr: "ट्रॅक्टर व ट्रॉली",
    hi: "ट्रैक्टर और ट्रॉली",
    codes: ["TRACTOR_TROLLEY"],
    categories: [],
    words: ["tractor", "trolley", "ट्रॅक्टर", "ट्रॉली"],
  },
  {
    id: "bike",
    module: "transport",
    en: "Bikes",
    mr: "दुचाकी",
    hi: "दोपहिया",
    codes: ["BIKE"],
    categories: [],
    words: ["\\bbike\\b", "दुचाकी"],
  },
  {
    id: "ambulance",
    module: "transport",
    en: "Ambulance",
    mr: "रुग्णवाहिका",
    hi: "एम्बुलेंस",
    codes: ["AMBULANCE"],
    categories: [],
    words: ["ambulance", "रुग्णवाहिका"],
  },
  {
    id: "other_transport",
    module: "transport",
    en: "Other vehicles",
    mr: "इतर वाहने",
    hi: "अन्य वाहन",
    codes: [],
    categories: [],
    words: [],
  },
] as const satisfies readonly DirectoryGroupDef[];

// Each group, with the optional provider-kind list present on all of them.
export type DirectoryGroup = (typeof DIRECTORY_GROUPS)[number] & {
  readonly providerTypes?: readonly string[];
};
export type DirectoryGroupId = DirectoryGroup["id"];
export const DIRECTORY_GROUP_IDS = DIRECTORY_GROUPS.map(
  (group) => group.id,
) as [DirectoryGroupId, ...DirectoryGroupId[]];

export type DirectoryEntryFields = {
  profession?: string | null;
  professionMr?: string | null;
  professionCode?: string | null;
  serviceCategory?: string | null;
  providerType?: string | null;
};

// Tiles that come first: help people may need in a hurry. Everything else keeps
// its order below them, and the catch-all stays last.
const GROUPS_FIRST: Record<DirectoryModule, readonly string[]> = {
  services: ["emergency", "public", "community"],
  transport: ["ambulance"],
};
export function directoryGroupsFor(module: DirectoryModule) {
  const first = GROUPS_FIRST[module];
  const rank = (group: DirectoryGroupDef) => {
    const index = first.indexOf(group.id);
    return index >= 0 ? index : group.id.startsWith("other") ? 1000 : 100;
  };
  return DIRECTORY_GROUPS.filter((group) => group.module === module)
    .map((group, order) => ({ group, order }))
    .sort((a, b) => rank(a.group) - rank(b.group) || a.order - b.order)
    .map(({ group }) => group);
}
export function directoryGroup(id: string) {
  return DIRECTORY_GROUPS.find((group) => group.id === id);
}
export function directoryGroupLabel(id: string, language: MobileLanguage) {
  const group = directoryGroup(id);
  return group ? group[language] : null;
}
// The catch-all tile of each module: everything no other tile claimed.
export function isCatchAllGroup(id: string) {
  return id === "other" || id === "other_transport";
}
// Regex source that matches a group's names, or null when it has no words.
export function directoryGroupPattern(group: DirectoryGroup) {
  return group.words.length ? group.words.join("|") : null;
}

function matchesGroup(group: DirectoryGroup, entry: DirectoryEntryFields) {
  if (
    entry.providerType &&
    (group.providerTypes as readonly string[] | undefined)?.includes(
      entry.providerType,
    )
  )
    return true;
  if (
    entry.professionCode &&
    group.codes.some((c) => c === entry.professionCode)
  )
    return true;
  if (
    entry.serviceCategory &&
    group.categories.some((c) => c === entry.serviceCategory)
  )
    return true;
  const pattern = directoryGroupPattern(group);
  if (!pattern) return false;
  const regex = new RegExp(pattern, "i");
  return [entry.profession, entry.professionMr].some(
    (name) => !!name && regex.test(name),
  );
}

// Every group of the module that an entry belongs to; the catch-all when it
// belongs to none.
export function directoryGroupsOf(
  module: DirectoryModule,
  entry: DirectoryEntryFields,
): DirectoryGroupId[] {
  const groups = directoryGroupsFor(module);
  const hits = groups
    .filter((group) => !isCatchAllGroup(group.id) && matchesGroup(group, entry))
    .map((group) => group.id);
  if (hits.length) return hits;
  return groups.filter((group) => isCatchAllGroup(group.id)).map((g) => g.id);
}
