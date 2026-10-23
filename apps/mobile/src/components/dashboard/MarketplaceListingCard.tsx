import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { listingName, type HomeListing } from "../../types/home";
import { Badge } from "./primitives";
import { ListingImage } from "./ListingImage";
import { listingQuantity, listingRate, listingUnit } from "./listingText";

export function MarketplaceListingCard({
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
  const rate = listingRate(listing, language);
  const quantity = listingQuantity(listing, language);
  const village = language === "mr" ? listing.villageMr : listing.village;
  const unit = listingUnit(listing.unit, language);
  return (
    <View style={[s.shadow, { width }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${rate}, ${quantity}, ${village}`}
        android_ripple={{ color: theme.colors.border }}
        onPress={onPress}
        style={({ pressed }) => [s.card, pressed && s.pressed]}
      >
        <View style={s.imageFrame}>
          <ListingImage listing={listing} style={s.image} resizeMode="cover" />
          {listing.isDemo && (
            <View style={s.demo}>
              <Badge yellow>{t.demoListing}</Badge>
            </View>
          )}
        </View>
        <View style={s.body}>
          <Text style={s.name} numberOfLines={2}>
            {name}
          </Text>
          <Text style={s.price} numberOfLines={1}>
            {listing.price === null ? (
              t.rateNotProvided
            ) : (
              <>
                {`₹${listing.price}`}
                {unit ? <Text style={s.unit}>{` / ${unit}`}</Text> : null}
              </>
            )}
          </Text>
          <Text style={s.meta} numberOfLines={1}>
            {quantity}
          </Text>
          <View style={s.villageRow}>
            <Ionicons
              name="location-outline"
              size={13}
              color={theme.colors.primary}
            />
            <Text style={s.village} numberOfLines={1}>
              {village}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  shadow: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.shadow.color,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pressed: { opacity: 0.92 },
  imageFrame: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: theme.colors.tint,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  demo: { position: "absolute", top: 8, left: 8, maxWidth: "88%" },
  body: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12, gap: 4 },
  name: {
    color: theme.colors.heading,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    minHeight: 38,
  },
  price: {
    color: theme.colors.heading,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },
  unit: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
    minHeight: 17,
  },
  villageRow: { flexDirection: "row", alignItems: "center", gap: 3, minHeight: 18 },
  village: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
});
