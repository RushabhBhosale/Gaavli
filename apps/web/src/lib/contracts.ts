export type Status = "active" | "blocked" | "pending";
export type UserDto = {
  id: string;
  name: string;
  mobile: string;
  roles: string[];
  village: { id: string; name: string } | null;
  status: Status;
  createdAt: string;
  version: number;
};
export type AdminDto = { id: string; name: string; role: "super_admin" };
export type AdminCategoryDto = {
  id: string;
  code: string;
  name: string;
  nameMr: string;
  defaultShelfLife: string;
  notifyMode: "daily_digest" | "change_only" | "weekly_digest";
  activeListings: number;
};
export type CategoriesPage = {
  categories: AdminCategoryDto[];
  total: number;
  page: number;
  limit: number;
};
export type VillageDto = { id: string; name: string };
export type AdminVillageDto = VillageDto & {
  pinCode: string | null;
  nameMr: string;
  taluka: string;
  district: string;
  users: number;
  status: "active" | "inactive";
  latitude: number | null;
  longitude: number | null;
  version: number;
  // Nearby mappings remain unavailable until authoritative proximity is implemented.
  coordinators: { id: string; name: string }[] | null;
  nearbyMapped: number | null;
};
export type CoordinatorOption = { id: string; name: string; status: Status };
export type VillageDependencies = {
  users: number;
  listings: number;
  coordinators: number;
  mappings: number;
  preferences: number;
  services: number;
  subscriptions: number;
};
export type VillagesPage = {
  villages: AdminVillageDto[];
  districts: string[];
  total: number;
  page: number;
  limit: number;
};
export type Counts = {
  all: number;
  seller: number;
  buyer: number;
  coordinator: number;
};
export type UsersPage = {
  users: UserDto[];
  total: number;
  page: number;
  limit: number;
};
export type Stats = {
  cards: { label: string; count: number; change: number | null }[];
  listings: { name: string; value: number }[];
};
export type Growth = { month: string; Farmers: number; Buyers: number }[];
