import type { ImageSourcePropType } from "react-native";
import type { ProductImageKey } from "../../types/home";

export const productImages: Record<ProductImageKey, ImageSourcePropType> = {
  tomato: require("../../../assets/products/tomato.webp"),
  onion: require("../../../assets/products/onion.webp"),
  potato: require("../../../assets/products/potato.webp"),
  rice: require("../../../assets/products/rice.webp"),
  mango: require("../../../assets/products/mango.webp"),
};
