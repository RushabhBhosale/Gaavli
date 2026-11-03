import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { listingName, type HomeListing } from "../../types/home";
import { Badge } from "./primitives";
import { ListingImage } from "./ListingImage";
import { listingQuantity, listingRate, listingPosted } from "./listingText";

// One row per product: photo, name, price, then the facts a buyer checks next.
// The whole card opens the product, so there is a single obvious target.
export function MarketplaceListingCard({
  listing,
  language,
  unavailable = false,
  onPress,
}: {
  listing: HomeListing;
  language: MobileLanguage;
  unavailable?: boolean;
  onPress?: () => void;
}) {
  const t = messages(language);
  const name = listingName(listing, language);
  const village = language !== "en" ? listing.villageMr : listing.village;
  const rate = listingRate(listing, language);
  if (!unavailable) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[
          name,
          rate,
          listingQuantity(listing, language),
          village,
        ].join(", ")}
        onPress={onPress}
        style={({ pressed }) => [s.card, pressed && s.pressed]}
      >
        <View style={s.imageFrame}>
          <ListingImage listing={listing} style={s.image} resizeMode="cover" />
        </View>
        <View style={s.body}>
          <Text numberOfLines={2} style={s.name}>
            {name}
          </Text>
          <Text style={s.price}>{rate}</Text>
          <View style={s.metaRow}>
            <Ionicons
              accessible={false}
              name="cube-outline"
              size={15}
              color={theme.colors.muted}
            />
            <Text numberOfLines={1} style={s.meta}>
              {listingQuantity(listing, language)}
            </Text>
          </View>
          <View style={s.metaRow}>
            <Ionicons
              accessible={false}
              name="location-outline"
              size={15}
              color={theme.colors.muted}
            />
            <Text numberOfLines={1} style={s.meta}>
              {[village, listingPosted(listing, language)]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
          {listing.isDemo && <Badge yellow>{t.demoListing}</Badge>}
        </View>
        <Ionicons
          accessible={false}
          name="chevron-forward"
          size={20}
          color={theme.colors.inactive}
        />
      </Pressable>
    );
  }
  // Unavailable rows are informational: the active-only detail/contact route stays protected.
  return (
    <View style={[s.card, s.unavailable]}>
      <ListingImage listing={listing} style={s.thumbnail} resizeMode="cover" />
      <View style={s.body}>
        <Text style={[s.name, s.muted]} numberOfLines={2}>
          {name}
        </Text>
        <Text
          accessibilityLabel={`${t.marketplacePreviousRate}: ${rate}`}
          style={s.meta}
        >
          {rate}
          {village ? ` · ${village}` : ""}
        </Text>
      </View>
      <View style={s.unavailableStatus}>
        <Text style={s.unavailableLabel}>{t.marketplaceNotAvailable}</Text>
        <Text style={[s.meta, s.age]}>{listingPosted(listing, language)}</Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  unavailable: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: "transparent",
    padding: 10,
  },
  pressed: { opacity: theme.interaction.pressedOpacity },
  imageFrame: {
    width: 96,
    height: 96,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.tint,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    opacity: 0.7,
    backgroundColor: theme.colors.border,
  },
  body: { flex: 1, gap: 3, minWidth: 0 },
  name: { ...theme.type.subheading, color: theme.colors.heading },
  muted: { color: theme.colors.muted },
  price: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { ...theme.type.caption, color: theme.colors.muted, flexShrink: 1 },
  unavailableLabel: {
    ...theme.type.micro,
    color: theme.colors.error,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radii.chip,
    backgroundColor: theme.colors.errorBackground,
    overflow: "hidden",
    textAlign: "center",
  },
  unavailableStatus: { alignItems: "flex-end", gap: 4, maxWidth: "34%" },
  age: { textAlign: "right" },
});
