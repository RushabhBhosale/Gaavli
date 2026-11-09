import type { ImageSourcePropType } from "react-native";
import type { DirectoryGroupId } from "@gaavli/constants";

// Backdrop picture for each Services and Transport tile. Original artwork,
// see assets/directory/README.md.
export const directoryGroupImages: Record<
  DirectoryGroupId,
  ImageSourcePropType
> = {
  repairs: require("../../../assets/directory/repairs.jpg"),
  building: require("../../../assets/directory/building.jpg"),
  health: require("../../../assets/directory/health.jpg"),
  shops: require("../../../assets/directory/shops.jpg"),
  personal: require("../../../assets/directory/personal.jpg"),
  farm: require("../../../assets/directory/farm.jpg"),
  events: require("../../../assets/directory/events.jpg"),
  everyday: require("../../../assets/directory/everyday.jpg"),
  other: require("../../../assets/directory/other.jpg"),
  auto: require("../../../assets/directory/auto.jpg"),
  taxi: require("../../../assets/directory/taxi.jpg"),
  bus: require("../../../assets/directory/bus.jpg"),
  goods: require("../../../assets/directory/goods.jpg"),
  tractor: require("../../../assets/directory/tractor.jpg"),
  bike: require("../../../assets/directory/bike.jpg"),
  ambulance: require("../../../assets/directory/ambulance.jpg"),
  other_transport: require("../../../assets/directory/other_transport.jpg"),
};
