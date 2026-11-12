import type { MobileLanguage } from "@gaavli/types";
import { ProviderType, type ProviderMasterType } from "./provider-masters";

// The registration flow's provider forms, described once. The API validates
// against these definitions, the app draws its forms from them, and every
// "select" is fed by a master list that the admin manages.
export type Tri = { en: string; mr: string; hi: string };
export type ChoiceOption = { id: string } & Tri;
type Base = { key: string; label: Tri; required: boolean; hint?: Tri };
export type ProviderField = Base &
  (
    | {
        kind: "text";
        multiline?: boolean;
        keyboard?: "default" | "numeric" | "url";
      }
    | { kind: "master"; master: ProviderMasterType }
    | { kind: "choice"; options: readonly ChoiceOption[] }
    | { kind: "bool" }
    // Opening times: slots plus weekly off, stored as a small JSON string.
    | { kind: "hours" }
  );
export type ProviderKind = {
  type: ProviderType;
  icon: string;
  title: Tri;
  blurb: Tri;
  // What the profile's name is called on the details screen.
  nameLabel: Tri;
  // The field whose master option is the profile's category in the directory.
  categoryKey: string;
  fields: readonly ProviderField[];
};

export const MAX_PROVIDER_CONTACTS = 5;
// Photos a provider can add: a shop front, a visiting card.
export const MAX_PROVIDER_IMAGES = 2;
export const CONTACT_LABELS: readonly ChoiceOption[] = [
  { id: "primary", en: "Primary", mr: "मुख्य", hi: "मुख्य" },
  { id: "alternate", en: "Alternate", mr: "पर्यायी", hi: "वैकल्पिक" },
  { id: "office", en: "Office", mr: "कार्यालय", hi: "कार्यालय" },
  { id: "emergency", en: "Emergency", mr: "आपत्कालीन", hi: "आपातकालीन" },
  { id: "home", en: "Home", mr: "घर", hi: "घर" },
];
const text = (
  key: string,
  en: string,
  mr: string,
  hi: string,
  required = false,
  extra: { multiline?: boolean; keyboard?: "default" | "numeric" | "url" } = {},
): ProviderField => ({
  key,
  label: { en, mr, hi },
  required,
  kind: "text",
  ...extra,
});
const hours = (
  key: string,
  en: string,
  mr: string,
  hi: string,
  required = false,
): ProviderField => ({
  key,
  label: { en, mr, hi },
  required,
  kind: "hours",
});
const master = (
  key: string,
  en: string,
  mr: string,
  hi: string,
  m: ProviderMasterType,
  required = true,
): ProviderField => ({
  key,
  label: { en, mr, hi },
  required,
  kind: "master",
  master: m,
});
const bool = (
  key: string,
  en: string,
  mr: string,
  hi: string,
): ProviderField => ({
  key,
  label: { en, mr, hi },
  required: false,
  kind: "bool",
});
const choice = (
  key: string,
  en: string,
  mr: string,
  hi: string,
  options: readonly ChoiceOption[],
  required = true,
): ProviderField => ({
  key,
  label: { en, mr, hi },
  required,
  kind: "choice",
  options,
});

const CALL_OR_WHATSAPP: readonly ChoiceOption[] = [
  { id: "call", en: "Call", mr: "कॉल", hi: "कॉल" },
  { id: "whatsapp", en: "WhatsApp", mr: "व्हॉट्सअ‍ॅप", hi: "व्हाट्सऐप" },
];
const DAY_OR_ALWAYS: readonly ChoiceOption[] = [
  { id: "24x7", en: "24x7", mr: "२४x७", hi: "24x7" },
  { id: "day", en: "Day only", mr: "फक्त दिवसा", hi: "केवल दिन में" },
];
export const PRACTICE_MODES: readonly ChoiceOption[] = [
  {
    id: "existing_facility",
    en: "At an existing clinic / hospital",
    mr: "सध्याच्या दवाखान्यात / रुग्णालयात",
    hi: "मौजूदा क्लिनिक / अस्पताल में",
  },
  {
    id: "own_clinic",
    en: "My own clinic",
    mr: "माझा स्वतःचा दवाखाना",
    hi: "मेरा अपना क्लिनिक",
  },
  {
    id: "home_visits",
    en: "Home visits only",
    mr: "फक्त घरी भेटी",
    hi: "केवल घर पर विज़िट",
  },
];

export const PROVIDER_KINDS: Record<ProviderType, ProviderKind> = {
  [ProviderType.SHOP_BUSINESS]: {
    type: ProviderType.SHOP_BUSINESS,
    title: {
      en: "Shop / Business",
      mr: "दुकान / व्यवसाय",
      hi: "दुकान / व्यवसाय",
    },
    icon: "storefront-outline",
    blurb: {
      en: "Sell goods from a shop or business",
      mr: "दुकान किंवा व्यवसायातून वस्तू विका",
      hi: "दुकान या व्यवसाय से सामान बेचें",
    },
    nameLabel: {
      en: "Shop / Business Name",
      mr: "दुकान / व्यवसायाचे नाव",
      hi: "दुकान / व्यवसाय का नाम",
    },
    categoryKey: "shopType",
    fields: [
      master(
        "shopType",
        "Shop Type",
        "दुकानाचा प्रकार",
        "दुकान का प्रकार",
        "SHOP_TYPE",
      ),
      text(
        "items",
        "Products / Items Available",
        "उपलब्ध उत्पादने / वस्तू",
        "उपलब्ध उत्पाद / सामान",
        false,
        { multiline: true },
      ),
      hours(
        "businessHours",
        "Business Hours",
        "व्यवसायाच्या वेळा",
        "व्यवसाय का समय",
      ),
      bool(
        "homeDelivery",
        "Home Delivery Available",
        "घरपोच सेवा उपलब्ध",
        "होम डिलीवरी उपलब्ध",
      ),
    ],
  },
  [ProviderType.PROFESSIONAL_SERVICE]: {
    type: ProviderType.PROFESSIONAL_SERVICE,
    title: {
      en: "Professional Service",
      mr: "व्यावसायिक सेवा",
      hi: "पेशेवर सेवा",
    },
    icon: "construct-outline",
    blurb: {
      en: "Electrician, plumber, carpenter and more",
      mr: "इलेक्ट्रिशियन, प्लंबर, सुतार आणि बरेच काही",
      hi: "इलेक्ट्रीशियन, प्लंबर, बढ़ई और अन्य",
    },
    nameLabel: {
      en: "Name / Business Name",
      mr: "नाव / व्यवसायाचे नाव",
      hi: "नाम / व्यवसाय का नाम",
    },
    categoryKey: "profession",
    fields: [
      master("profession", "Profession", "व्यवसाय", "पेशा", "PROFESSION"),
      text(
        "servicesOffered",
        "Services Offered",
        "देत असलेल्या सेवा",
        "दी जाने वाली सेवाएँ",
        false,
        { multiline: true },
      ),
      text("experience", "Experience", "अनुभव", "अनुभव"),
      text("serviceArea", "Service Area", "सेवा क्षेत्र", "सेवा क्षेत्र"),
      text("availability", "Availability", "उपलब्धता", "उपलब्धता"),
    ],
  },
  [ProviderType.HEALTHCARE_PROFESSIONAL]: {
    type: ProviderType.HEALTHCARE_PROFESSIONAL,
    title: {
      en: "Doctor / Healthcare Professional",
      mr: "डॉक्टर / आरोग्य व्यावसायिक",
      hi: "डॉक्टर / स्वास्थ्य पेशेवर",
    },
    icon: "medkit-outline",
    blurb: {
      en: "Doctors and clinic practitioners",
      mr: "डॉक्टर आणि दवाखान्यातील वैद्य",
      hi: "डॉक्टर और क्लिनिक चिकित्सक",
    },
    nameLabel: { en: "Doctor Name", mr: "डॉक्टरांचे नाव", hi: "डॉक्टर का नाम" },
    categoryKey: "specialization",
    fields: [
      master(
        "specialization",
        "Specialization",
        "विशेषज्ञता",
        "विशेषज्ञता",
        "DOCTOR_SPECIALIZATION",
      ),
      master(
        "qualification",
        "Qualification",
        "शैक्षणिक पात्रता",
        "योग्यता",
        "DOCTOR_QUALIFICATION",
      ),
      text(
        "registrationNumber",
        "Registration Number",
        "नोंदणी क्रमांक",
        "पंजीकरण संख्या",
        false,
      ),
      hours(
        "consultationHours",
        "Consultation Hours",
        "तपासणीच्या वेळा",
        "परामर्श का समय",
        true,
      ),
    ],
  },
  [ProviderType.MEDICAL_FACILITY]: {
    type: ProviderType.MEDICAL_FACILITY,
    title: {
      en: "Medical Facility",
      mr: "वैद्यकीय सुविधा",
      hi: "चिकित्सा सुविधा",
    },
    icon: "business-outline",
    blurb: {
      en: "Medical shop, clinic, hospital, dispensary",
      mr: "औषध दुकान, दवाखाना, रुग्णालय, औषधालय",
      hi: "मेडिकल शॉप, क्लिनिक, अस्पताल, औषधालय",
    },
    nameLabel: { en: "Facility Name", mr: "सुविधेचे नाव", hi: "सुविधा का नाम" },
    categoryKey: "facilityType",
    fields: [
      master(
        "facilityType",
        "Facility Type",
        "सुविधेचा प्रकार",
        "सुविधा का प्रकार",
        "FACILITY_TYPE",
      ),
      text(
        "servicesAvailable",
        "Services Available",
        "उपलब्ध सेवा",
        "उपलब्ध सेवाएँ",
        true,
        { multiline: true },
      ),
      hours(
        "operatingHours",
        "Operating Hours",
        "कामकाजाच्या वेळा",
        "संचालन समय",
        true,
      ),
      text("location", "Location", "ठिकाण", "स्थान", true),
    ],
  },
  [ProviderType.TRANSPORT_DRIVER]: {
    type: ProviderType.TRANSPORT_DRIVER,
    title: {
      en: "Transport / Driver",
      mr: "वाहतूक / चालक",
      hi: "परिवहन / चालक",
    },
    icon: "car-outline",
    blurb: {
      en: "Vehicles, routes and rides",
      mr: "वाहने, मार्ग आणि प्रवास",
      hi: "वाहन, रूट और सवारी",
    },
    nameLabel: {
      en: "Name / Business Name",
      mr: "नाव / व्यवसायाचे नाव",
      hi: "नाम / व्यवसाय का नाम",
    },
    categoryKey: "vehicleType",
    fields: [
      master(
        "transportType",
        "Transport Type",
        "वाहतुकीचा प्रकार",
        "परिवहन का प्रकार",
        "TRANSPORT_TYPE",
      ),
      master(
        "vehicleType",
        "Vehicle Type",
        "वाहनाचा प्रकार",
        "वाहन का प्रकार",
        "VEHICLE_TYPE",
      ),
      text("vehicleNumber", "Vehicle Number", "वाहन क्रमांक", "वाहन नंबर"),
      text(
        "passengerCapacity",
        "Passenger Capacity",
        "प्रवासी क्षमता",
        "यात्री क्षमता",
        false,
        { keyboard: "numeric" },
      ),
      text(
        "routes",
        "Routes / Destinations",
        "मार्ग / गंतव्य",
        "रूट / गंतव्य",
        false,
        { multiline: true },
      ),
      text("serviceArea", "Service Area", "सेवा क्षेत्र", "सेवा क्षेत्र"),
      text("availability", "Availability", "उपलब्धता", "उपलब्धता"),
    ],
  },
  [ProviderType.PUBLIC_INSTITUTION]: {
    type: ProviderType.PUBLIC_INSTITUTION,
    title: {
      en: "Public Institution",
      mr: "सार्वजनिक संस्था",
      hi: "सार्वजनिक संस्था",
    },
    icon: "business-outline",
    blurb: {
      en: "Gram Panchayat, post office, bank, school, ration office",
      mr: "ग्रामपंचायत, टपाल कार्यालय, बँक, शाळा, रेशन कार्यालय",
      hi: "ग्राम पंचायत, डाकघर, बैंक, स्कूल, राशन कार्यालय",
    },
    nameLabel: {
      en: "Institution Name",
      mr: "संस्थेचे नाव",
      hi: "संस्था का नाम",
    },
    categoryKey: "institutionType",
    fields: [
      master(
        "institutionType",
        "Institution Type",
        "संस्थेचा प्रकार",
        "संस्था का प्रकार",
        "INSTITUTION_TYPE",
      ),
      text(
        "department",
        "Department / Organisation",
        "विभाग / संघटना",
        "विभाग / संगठन",
        true,
      ),
      text(
        "contactPerson",
        "Official Contact Person",
        "अधिकृत संपर्क व्यक्ती",
        "आधिकारिक संपर्क व्यक्ति",
        true,
      ),
      text(
        "servicesProvided",
        "Services Provided",
        "दिल्या जाणाऱ्या सेवा",
        "प्रदान की जाने वाली सेवाएँ",
        true,
        { multiline: true },
      ),
      hours(
        "operatingHours",
        "Operating Hours",
        "कामकाजाच्या वेळा",
        "संचालन समय",
        true,
      ),
      text("landmark", "Landmark", "जवळची खूण", "पहचान स्थल"),
      text(
        "website",
        "Official Website",
        "अधिकृत संकेतस्थळ",
        "आधिकारिक वेबसाइट",
        false,
        { keyboard: "url" },
      ),
      bool(
        "isOfficial",
        "This is an official public institution",
        "ही अधिकृत सार्वजनिक संस्था आहे",
        "यह आधिकारिक सार्वजनिक संस्था है",
      ),
    ],
  },
  [ProviderType.COMMUNITY_ORGANISATION]: {
    type: ProviderType.COMMUNITY_ORGANISATION,
    title: {
      en: "Community Organisation",
      mr: "सामाजिक संघटना",
      hi: "सामुदायिक संगठन",
    },
    icon: "people-outline",
    blurb: {
      en: "Non-profits, village groups, welfare organisations",
      mr: "ना-नफा संस्था, गावातील गट, कल्याणकारी संस्था",
      hi: "गैर-लाभकारी संस्थाएँ, गाँव के समूह, कल्याण संगठन",
    },
    nameLabel: {
      en: "Organisation Name",
      mr: "संस्थेचे नाव",
      hi: "संगठन का नाम",
    },
    categoryKey: "organisationType",
    fields: [
      master(
        "organisationType",
        "Organisation Type",
        "संस्थेचा प्रकार",
        "संगठन का प्रकार",
        "ORGANISATION_TYPE",
      ),
      text(
        "mainActivity",
        "Main Activity",
        "मुख्य कार्य",
        "मुख्य गतिविधि",
        true,
      ),
      text(
        "whoWeHelp",
        "Who do you help?",
        "तुम्ही कोणाला मदत करता?",
        "आप किसकी मदद करते हैं?",
        true,
      ),
      text(
        "servicesOffered",
        "Services / Assistance Offered",
        "दिल्या जाणाऱ्या सेवा / मदत",
        "दी जाने वाली सेवाएँ / सहायता",
        true,
        { multiline: true },
      ),
      text("serviceArea", "Service Area", "सेवा क्षेत्र", "सेवा क्षेत्र", true),
      text(
        "website",
        "Website / Social Media",
        "संकेतस्थळ / सोशल मीडिया",
        "वेबसाइट / सोशल मीडिया",
        false,
        { keyboard: "url" },
      ),
      bool(
        "acceptsVolunteers",
        "We accept volunteers",
        "आम्ही स्वयंसेवक स्वीकारतो",
        "हम स्वयंसेवक स्वीकार करते हैं",
      ),
    ],
  },
  [ProviderType.SOCIAL_HELPER]: {
    type: ProviderType.SOCIAL_HELPER,
    title: { en: "Social Helper", mr: "सामाजिक मदतनीस", hi: "सामाजिक सहायक" },
    icon: "heart-outline",
    blurb: {
      en: "Volunteers, blood donation, senior citizen support",
      mr: "स्वयंसेवक, रक्तदान, ज्येष्ठ नागरिक मदत",
      hi: "स्वयंसेवक, रक्तदान, वरिष्ठ नागरिक सहायता",
    },
    nameLabel: { en: "Your Name", mr: "तुमचे नाव", hi: "आपका नाम" },
    categoryKey: "helperCategory",
    fields: [
      master(
        "helperCategory",
        "Helper Category",
        "मदतनीस प्रकार",
        "सहायक श्रेणी",
        "HELPER_CATEGORY",
      ),
      text(
        "assistanceArea",
        "Area of Assistance",
        "मदतीचे क्षेत्र",
        "सहायता का क्षेत्र",
        true,
      ),
      text("serviceArea", "Service Area", "सेवा क्षेत्र", "सेवा क्षेत्र", true),
      text("availability", "Availability", "उपलब्धता", "उपलब्धता", true),
      choice(
        "preferredContact",
        "Preferred Contact Method",
        "पसंतीची संपर्क पद्धत",
        "पसंदीदा संपर्क तरीका",
        CALL_OR_WHATSAPP,
      ),
    ],
  },
  [ProviderType.EMERGENCY_ASSISTANCE]: {
    type: ProviderType.EMERGENCY_ASSISTANCE,
    title: {
      en: "Emergency Assistance",
      mr: "आपत्कालीन मदत",
      hi: "आपातकालीन सहायता",
    },
    icon: "alert-circle-outline",
    blurb: {
      en: "Snake rescue, first aid, help desks, disaster help",
      mr: "साप बचाव, प्राथमिक उपचार, मदत केंद्र, आपत्ती मदत",
      hi: "साँप बचाव, प्राथमिक उपचार, हेल्प डेस्क, आपदा सहायता",
    },
    nameLabel: {
      en: "Name / Group Name",
      mr: "नाव / गटाचे नाव",
      hi: "नाम / समूह का नाम",
    },
    categoryKey: "assistanceCategory",
    fields: [
      master(
        "assistanceCategory",
        "Assistance Category",
        "मदतीचा प्रकार",
        "सहायता की श्रेणी",
        "ASSISTANCE_CATEGORY",
      ),
      text(
        "serviceArea",
        "Rescue / Service Area",
        "बचाव / सेवा क्षेत्र",
        "बचाव / सेवा क्षेत्र",
        true,
      ),
      text("availability", "Availability", "उपलब्धता", "उपलब्धता", true),
      choice(
        "emergencyAvailability",
        "Emergency Contact Availability",
        "आपत्कालीन संपर्क उपलब्धता",
        "आपातकालीन संपर्क उपलब्धता",
        DAY_OR_ALWAYS,
      ),
      text(
        "experience",
        "Relevant Experience",
        "संबंधित अनुभव",
        "संबंधित अनुभव",
      ),
      text(
        "affiliation",
        "Affiliation / Organisation",
        "संलग्नता / संस्था",
        "संबद्धता / संगठन",
      ),
    ],
  },
  [ProviderType.POLITICAL_OFFICE]: {
    type: ProviderType.POLITICAL_OFFICE,
    title: {
      en: "Party / Political Office",
      mr: "पक्ष / राजकीय कार्यालय",
      hi: "पार्टी / राजनीतिक कार्यालय",
    },
    icon: "flag-outline",
    blurb: {
      en: "Neutral directory listing of local offices",
      mr: "स्थानिक कार्यालयांची तटस्थ यादी",
      hi: "स्थानीय कार्यालयों की तटस्थ सूची",
    },
    nameLabel: {
      en: "Office Name",
      mr: "कार्यालयाचे नाव",
      hi: "कार्यालय का नाम",
    },
    categoryKey: "officeType",
    fields: [
      text(
        "partyName",
        "Political Party / Organisation",
        "राजकीय पक्ष / संघटना",
        "राजनीतिक दल / संगठन",
        true,
      ),
      master(
        "officeType",
        "Office Type",
        "कार्यालयाचा प्रकार",
        "कार्यालय का प्रकार",
        "OFFICE_TYPE",
      ),
      hours(
        "officeHours",
        "Office Hours",
        "कार्यालयाच्या वेळा",
        "कार्यालय का समय",
        true,
      ),
      text(
        "publicServices",
        "Public Services Offered",
        "दिल्या जाणाऱ्या सार्वजनिक सेवा",
        "दी जाने वाली सार्वजनिक सेवाएँ",
        true,
        { multiline: true },
      ),
      text(
        "website",
        "Website / Social Media",
        "संकेतस्थळ / सोशल मीडिया",
        "वेबसाइट / सोशल मीडिया",
        false,
        { keyboard: "url" },
      ),
    ],
  },
  [ProviderType.OTHER_SERVICE]: {
    type: ProviderType.OTHER_SERVICE,
    title: { en: "Other Service", mr: "इतर सेवा", hi: "अन्य सेवा" },
    icon: "apps-outline",
    blurb: {
      en: "Clubs, event organisers, associations",
      mr: "क्लब, कार्यक्रम आयोजक, संघटना",
      hi: "क्लब, आयोजक, संघ",
    },
    nameLabel: { en: "Service Name", mr: "सेवेचे नाव", hi: "सेवा का नाम" },
    categoryKey: "serviceCategory",
    fields: [
      master(
        "serviceCategory",
        "Service Category",
        "सेवेचा प्रकार",
        "सेवा की श्रेणी",
        "OTHER_SERVICE_CATEGORY",
      ),
      text(
        "servicesOffered",
        "Services Offered",
        "देत असलेल्या सेवा",
        "दी जाने वाली सेवाएँ",
        false,
        { multiline: true },
      ),
      text("serviceArea", "Service Area", "सेवा क्षेत्र", "सेवा क्षेत्र"),
      text("availability", "Availability", "उपलब्धता", "उपलब्धता"),
    ],
  },
};

// The first list on "What would you like to register?"; "Other Services"
// opens the second list.
export const PROVIDER_MAIN_TYPES: readonly ProviderType[] = [
  ProviderType.SHOP_BUSINESS,
  ProviderType.PROFESSIONAL_SERVICE,
  ProviderType.HEALTHCARE_PROFESSIONAL,
  ProviderType.MEDICAL_FACILITY,
  ProviderType.TRANSPORT_DRIVER,
];
export const PROVIDER_OTHER_TYPES: readonly ProviderType[] = [
  ProviderType.PUBLIC_INSTITUTION,
  ProviderType.COMMUNITY_ORGANISATION,
  ProviderType.SOCIAL_HELPER,
  ProviderType.EMERGENCY_ASSISTANCE,
  ProviderType.POLITICAL_OFFICE,
  ProviderType.OTHER_SERVICE,
];
export const OTHER_SERVICES_ENTRY: { icon: string; title: Tri; blurb: Tri } = {
  icon: "ellipsis-horizontal-circle-outline",
  title: { en: "Other Services", mr: "इतर सेवा", hi: "अन्य सेवाएँ" },
  blurb: {
    en: "Institutions, NGOs, helpers, emergency help, party offices and more",
    mr: "संस्था, एनजीओ, मदतनीस, आपत्कालीन मदत, पक्ष कार्यालये आणि बरेच काही",
    hi: "संस्थाएँ, एनजीओ, सहायक, आपातकालीन मदद, पार्टी कार्यालय और अन्य",
  },
};

export const PROVIDER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const LINK_STATUSES = ["PENDING", "CONFIRMED", "REJECTED"] as const;
export const CLAIM_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const SHOWN_AS_HOME_EXCLUDED: readonly ProviderType[] = [
  ProviderType.POLITICAL_OFFICE,
];

export function providerKind(type: string) {
  return PROVIDER_KINDS[type as ProviderType];
}
export function pick(tri: Tri, language: MobileLanguage) {
  return tri[language];
}
export function isFacilityType(type: string) {
  return type === ProviderType.MEDICAL_FACILITY;
}
export function isDoctorType(type: string) {
  return type === ProviderType.HEALTHCARE_PROFESSIONAL;
}
