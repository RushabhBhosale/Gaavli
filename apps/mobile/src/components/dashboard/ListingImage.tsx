import { Image, View, type StyleProp, type ImageStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { HomeListing } from "../../types/home";
import { productImages } from "./productImages";
import { theme } from "../../theme";
import { useState } from "react";
import { resolveListingPhotoUrl } from "../../data/listingPhotos";
export function ListingImage({
  listing,
  style,
  resizeMode = "cover",
}: {
  listing: Pick<HomeListing, "photoUrl" | "image">;
  style: StyleProp<ImageStyle>;
  resizeMode?: "cover" | "contain";
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = resolveListingPhotoUrl(
    listing.photoUrl,
    process.env.EXPO_PUBLIC_API_BASE_URL,
    __DEV__,
  );
  if (uri && failedUri !== uri)
    return (
      <Image
        source={{ uri }}
        style={style}
        resizeMode={resizeMode}
        accessible={false}
        onError={() => setFailedUri(uri)}
      />
    );
  return listing.image ? (
    <Image
      source={productImages[listing.image]}
      style={style}
      resizeMode={resizeMode}
      accessible={false}
    />
  ) : (
    <View
      style={[style, { alignItems: "center", justifyContent: "center" }]}
      accessible={false}
    >
      <Ionicons name="leaf-outline" size={28} color={theme.colors.primary} />
    </View>
  );
}
