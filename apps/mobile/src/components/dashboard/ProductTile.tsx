import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileLanguage } from "@gaavli/types";
import { theme } from "../../theme";
import { messages } from "../../i18n";
import { listingName, type HomeListing } from "../../types/home";
import { ListingImage } from "./ListingImage";
import { ProductPrice } from "./ProductPrice";
import { listingRate } from "./listingText";

// A small three-up tile for the Home grid: photo with the price on it, the
// name, and where it is. Cards in a row are always the same height.
export function ProductTile({
  listing,
  language,
  width,
  onPress,
}: {
  listing: HomeListing;
  language: MobileLanguage;
  width: number;
  onPress: () => void;
}) {
  const t = messages(language);
  const name = listingName(listing, language);
  const village = language !== "en" ? listing.villageMr : listing.village;
  const rate =
    listing.price === null ? t.contactForPrice : listingRate(listing, language);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[name, rate, village].join(", ")}
      onPress={onPress}
      style={({ pressed }) => [s.card, { width }, pressed && s.pressed]}
    >
      <View style={s.image}>
        <ListingImage listing={listing} style={s.photo} iconSize={32} />
        <View style={s.priceChip}>
          <ProductPrice
            price={listing.price}
            formatted={rate}
            language={language}
            style={s.priceText}
          />
        </View>
      </View>
      <View style={s.body}>
        <Text numberOfLines={1} style={s.name}>
          {name}
        </Text>
        <View style={s.locationRow}>
          <Ionicons
            accessible={false}
            name="location-outline"
            size={12}
            color={theme.colors.muted}
          />
          <Text numberOfLines={1} style={s.village}>
            {village}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
const s = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  image: {
    height: 84,
    width: "100%",
    backgroundColor: theme.colors.tint,
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%" },
  priceChip: {
    position: "absolute",
    left: 5,
    bottom: 5,
    maxWidth: "92%",
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: theme.radii.chip,
    backgroundColor: theme.colors.primary,
  },
  priceText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    color: theme.colors.onPrimary,
  },
  body: { paddingHorizontal: 7, paddingVertical: 6, gap: 1 },
  name: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  village: { flex: 1, fontSize: 11, lineHeight: 16, color: theme.colors.muted },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
