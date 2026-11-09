export enum ProviderType {
  SHOP_BUSINESS = "SHOP_BUSINESS",
  PROFESSIONAL_SERVICE = "PROFESSIONAL_SERVICE",
  HEALTHCARE_PROFESSIONAL = "HEALTHCARE_PROFESSIONAL",
  MEDICAL_FACILITY = "MEDICAL_FACILITY",
  TRANSPORT_DRIVER = "TRANSPORT_DRIVER",
  OTHER_SERVICE = "OTHER_SERVICE",
  // The "Other Services" second-level list of the registration flow.
  PUBLIC_INSTITUTION = "PUBLIC_INSTITUTION",
  COMMUNITY_ORGANISATION = "COMMUNITY_ORGANISATION",
  SOCIAL_HELPER = "SOCIAL_HELPER",
  EMERGENCY_ASSISTANCE = "EMERGENCY_ASSISTANCE",
  POLITICAL_OFFICE = "POLITICAL_OFFICE",
}

export const PROVIDER_MASTER_GROUPS = {
  SHOP_BUSINESS: ["SHOP_TYPE"],
  PROFESSIONAL_SERVICE: ["PROFESSION"],
  HEALTHCARE_PROFESSIONAL: ["DOCTOR_SPECIALIZATION", "DOCTOR_QUALIFICATION"],
  MEDICAL_FACILITY: ["FACILITY_TYPE"],
  TRANSPORT_DRIVER: ["TRANSPORT_TYPE", "VEHICLE_TYPE"],
  OTHER_SERVICE: ["OTHER_SERVICE_CATEGORY"],
  PUBLIC_INSTITUTION: ["INSTITUTION_TYPE"],
  COMMUNITY_ORGANISATION: ["ORGANISATION_TYPE"],
  SOCIAL_HELPER: ["HELPER_CATEGORY"],
  EMERGENCY_ASSISTANCE: ["ASSISTANCE_CATEGORY"],
  POLITICAL_OFFICE: ["OFFICE_TYPE"],
} as const;
export const PROVIDER_MASTER_TYPES = [
  "SHOP_TYPE",
  "PROFESSION",
  "DOCTOR_SPECIALIZATION",
  "DOCTOR_QUALIFICATION",
  "FACILITY_TYPE",
  "TRANSPORT_TYPE",
  "VEHICLE_TYPE",
  "OTHER_SERVICE_CATEGORY",
  "INSTITUTION_TYPE",
  "ORGANISATION_TYPE",
  "HELPER_CATEGORY",
  "ASSISTANCE_CATEGORY",
  "OFFICE_TYPE",
] as const;
export type ProviderMasterType = (typeof PROVIDER_MASTER_TYPES)[number];
export const PROVIDER_TYPE_LABELS = {
  SHOP_BUSINESS: {
    en: "Shop / Business",
    mr: "दुकान / व्यवसाय",
    hi: "दुकान / व्यवसाय",
  },
  PROFESSIONAL_SERVICE: {
    en: "Professional Service",
    mr: "व्यावसायिक सेवा",
    hi: "पेशेवर सेवा",
  },
  HEALTHCARE_PROFESSIONAL: {
    en: "Doctor / Healthcare Professional",
    mr: "डॉक्टर / आरोग्य व्यावसायिक",
    hi: "डॉक्टर / स्वास्थ्य पेशेवर",
  },
  MEDICAL_FACILITY: {
    en: "Medical Facility",
    mr: "वैद्यकीय सुविधा",
    hi: "चिकित्सा सुविधा",
  },
  TRANSPORT_DRIVER: {
    en: "Transport / Driver",
    mr: "वाहतूक / चालक",
    hi: "परिवहन / चालक",
  },
  OTHER_SERVICE: { en: "Other Service", mr: "इतर सेवा", hi: "अन्य सेवा" },
  PUBLIC_INSTITUTION: {
    en: "Government / Public Institution",
    mr: "शासकीय / सार्वजनिक संस्था",
    hi: "सरकारी / सार्वजनिक संस्था",
  },
  COMMUNITY_ORGANISATION: {
    en: "Community Organisation / NGO",
    mr: "सामाजिक संस्था / एनजीओ",
    hi: "सामुदायिक संगठन / एनजीओ",
  },
  SOCIAL_HELPER: {
    en: "Social Worker / Community Helper",
    mr: "समाजसेवक / सामुदायिक मदतनीस",
    hi: "समाजसेवी / सामुदायिक सहायक",
  },
  EMERGENCY_ASSISTANCE: {
    en: "Emergency / Special Assistance",
    mr: "आपत्कालीन / विशेष मदत",
    hi: "आपातकालीन / विशेष सहायता",
  },
  POLITICAL_OFFICE: {
    en: "Political Party Office",
    mr: "राजकीय पक्ष कार्यालय",
    hi: "राजनीतिक दल कार्यालय",
  },
} as const;
export const PROVIDER_MASTER_LABELS: Record<ProviderMasterType, string> = {
  SHOP_TYPE: "Shop Types",
  PROFESSION: "Professions",
  DOCTOR_SPECIALIZATION: "Specializations",
  DOCTOR_QUALIFICATION: "Qualifications",
  FACILITY_TYPE: "Facility Types",
  TRANSPORT_TYPE: "Transport Types",
  VEHICLE_TYPE: "Vehicle Types",
  OTHER_SERVICE_CATEGORY: "Other Service Categories",
  INSTITUTION_TYPE: "Institution Types",
  ORGANISATION_TYPE: "Organisation Types",
  HELPER_CATEGORY: "Helper Categories",
  ASSISTANCE_CATEGORY: "Assistance Categories",
  OFFICE_TYPE: "Party Office Types",
};
