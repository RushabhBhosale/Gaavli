import type { MobileLanguage, MobileUser } from "@gaavli/types";
import type { HomeDashboardData, HomeUser } from "../types/home";

// Preview fixtures only. Never write these capabilities or contacts to a session.
export const mockUser: HomeUser = {
  firstName: "Harshada",
  lastName: "Bhalerao",
  village: "Palaspe",
  taluka: "Panvel",
  district: "Raigad",
  isBuyer: true,
  isSeller: false,
};
export const mockHomeData: HomeDashboardData = {
  user: mockUser,
  isPreview: true,
  listingCount: 24,
  coordinator: {
    name: "Sachin Patil",
    nameMr: "सचिन पाटील",
    phone: "9876543210",
    verified: true,
  },
  listings: [
    {
      id: "1",
      name: "Tomato",
      nameMr: "टोमॅटो",
      category: "Vegetable",
      categoryMr: "भाजीपाला",
      price: 28,
      unit: "kg",
      availableQuantity: 40,
      sampleDistanceKm: 4,
      village: "Palaspe",
      villageMr: "पळस्पे",
      sellerName: "Ramesh",
      sellerNameMr: "रमेश",
      postedMinutesAgo: 20,
      image: "tomato",
    },
    {
      id: "2",
      name: "Onion",
      nameMr: "कांदा",
      category: "Vegetable",
      categoryMr: "भाजीपाला",
      price: 32,
      unit: "kg",
      availableQuantity: 60,
      sampleDistanceKm: 4,
      village: "Palaspe",
      villageMr: "पळस्पे",
      sellerName: "Suresh",
      sellerNameMr: "सुरेश",
      postedMinutesAgo: 35,
      image: "onion",
    },
    {
      id: "3",
      name: "Potato",
      nameMr: "बटाटा",
      category: "Vegetable",
      categoryMr: "भाजीपाला",
      price: 25,
      unit: "kg",
      availableQuantity: 30,
      sampleDistanceKm: 4,
      village: "Palaspe",
      villageMr: "पळस्पे",
      sellerName: "Mahesh",
      sellerNameMr: "महेश",
      postedMinutesAgo: 60,
      image: "potato",
    },
    {
      id: "4",
      name: "Rice",
      nameMr: "तांदूळ",
      category: "Grain",
      categoryMr: "धान्य",
      price: 55,
      unit: "kg",
      availableQuantity: 100,
      sampleDistanceKm: 4,
      village: "Palaspe",
      villageMr: "पळस्पे",
      sellerName: "Ganesh",
      sellerNameMr: "गणेश",
      postedMinutesAgo: 90,
      image: "rice",
    },
    {
      id: "5",
      name: "Mango",
      nameMr: "आंबा",
      category: "Fruit",
      categoryMr: "फळे",
      price: 120,
      unit: "kg",
      availableQuantity: 25,
      sampleDistanceKm: 4,
      village: "Palaspe",
      villageMr: "पळस्पे",
      sellerName: "Anita",
      sellerNameMr: "अनिता",
      postedMinutesAgo: 120,
      image: "mango",
    },
  ],
};

// The home UI needs a new server DTO before these fixture capabilities become live.
// Keep the real signed-in identity/village, with explicit sample marketplace content.
export function dashboardForAccount(
  account: MobileUser,
  language: MobileLanguage,
): HomeDashboardData {
  return {
    ...mockHomeData,
    user: {
      ...mockUser,
      firstName: account.firstName || account.name,
      lastName: account.lastName || "",
      village: account.village
        ? language === "mr"
          ? account.village.nameMr
          : account.village.name
        : "",
      taluka: account.village?.taluka || "",
      district: account.village?.district || "",
    },
  };
}
export function findMockListing(id: unknown) {
  return typeof id === "string"
    ? mockHomeData.listings.find((listing) => listing.id === id)
    : undefined;
}
