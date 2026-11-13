import type { ImageSourcePropType } from "react-native";
import type { DirectoryGroupId } from "@gaavli/constants";

// Supplied category illustrations, bundled for offline rendering.
// See assets/directory/README.md for the artwork-to-category mapping.
export const directoryGroupImages: Record<
  DirectoryGroupId,
  ImageSourcePropType
> = {
  repairs: require("../../../assets/directory/illustration_repairs.webp"),
  building: require("../../../assets/directory/illustration_building.webp"),
  health: require("../../../assets/directory/illustration_health.webp"),
  shops: require("../../../assets/directory/illustration_shops.webp"),
  personal: require("../../../assets/directory/illustration_personal.webp"),
  farm: require("../../../assets/directory/illustration_farm.webp"),
  events: require("../../../assets/directory/illustration_events.webp"),
  everyday: require("../../../assets/directory/illustration_everyday.webp"),
  other: require("../../../assets/directory/illustration_other.webp"),
  auto: require("../../../assets/directory/illustration_auto.webp"),
  taxi: require("../../../assets/directory/illustration_taxi.webp"),
  bus: require("../../../assets/directory/illustration_bus.webp"),
  goods: require("../../../assets/directory/illustration_goods.webp"),
  tractor: require("../../../assets/directory/illustration_tractor.webp"),
  bike: require("../../../assets/directory/illustration_bike.webp"),
  ambulance: require("../../../assets/directory/illustration_ambulance.webp"),
  other_transport: require("../../../assets/directory/illustration_other_transport.webp"),
  public: require("../../../assets/directory/illustration_public.webp"),
  community: require("../../../assets/directory/illustration_community.webp"),
  emergency: require("../../../assets/directory/illustration_emergency.webp"),
  political: require("../../../assets/directory/illustration_political.webp"),
};
