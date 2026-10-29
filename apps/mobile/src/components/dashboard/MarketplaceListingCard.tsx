import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { listingName, type HomeListing } from "../../types/home";
import { Badge } from "./primitives";
import { ListingImage } from "./ListingImage";
import { listingQuantity, listingRate, listingPosted } from "./listingText";

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
  const village = language === "mr" ? listing.villageMr : listing.village;
  if (!unavailable) {
    return (
      <Pressable
        accessible={false}
        onPress={onPress}
        style={({ pressed }) => [s.card, s.activeCard, pressed && s.pressed]}
      >
        <View style={[s.row, s.activeRow]}>
          <View style={s.imageFrame}>
            <ListingImage
              listing={listing}
              style={s.image}
              resizeMode="cover"
            />
          </View>
          <View style={[s.body, s.activeBody]}>
            <Text style={s.name}>{name}</Text>
            <View style={s.priceBadge}>
              <Text style={s.price}>{listingRate(listing, language)}</Text>
            </View>
            <View style={s.villageRow}>
              <Ionicons
                accessible={false}
                name="location-outline"
                size={15}
                color={theme.colors.icon}
              />
              <Text style={s.meta}>{village}</Text>
            </View>
            <View style={s.villageRow}>
              <Ionicons
                accessible={false}
                name="cube-outline"
                size={15}
                color={theme.colors.icon}
              />
              <Text style={s.meta}>{listingQuantity(listing, language)}</Text>
            </View>
            <View style={s.villageRow}>
              <Ionicons
                accessible={false}
                name="time-outline"
                size={15}
                color={theme.colors.icon}
              />
              <Text style={s.meta}>{listingPosted(listing, language)}</Text>
            </View>
            {listing.isDemo && <Badge yellow>{t.demoListing}</Badge>}
          </View>
          <View style={s.detailsColumn}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t.viewDetails}, ${name}`}
              onPress={(event) => {
                event.stopPropagation();
                onPress?.();
              }}
              style={({ pressed }) => [s.viewDetails, pressed && s.pressed]}
            >
              <Text style={s.viewDetailsText}>{t.viewDetails}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  }
  const content = (
    <>
      <View style={s.row}>
        <ListingImage
          listing={listing}
          style={s.thumbnail}
          resizeMode="cover"
        />
        <View style={s.body}>
          <Text style={[s.name, s.muted]} numberOfLines={2}>
            {name}
          </Text>
          <View style={s.previousMetaRow}>
            <View
              accessible
              accessibilityLabel={`${t.marketplacePreviousRate}: ${listingRate(listing, language)}`}
              style={s.previousMetaItem}
            >
              <MaterialCommunityIcons
                accessible={false}
                name="currency-rupee"
                size={14}
                color={theme.colors.icon}
              />
              <Text style={s.meta}>
                {listingRate(listing, language).replace(/^₹/, "")}
              </Text>
            </View>
            {!!village && (
              <View
                accessible
                accessibilityLabel={`${t.marketplaceVillage}: ${village}`}
                style={s.previousMetaItem}
              >
                <Ionicons
                  accessible={false}
                  name="location-outline"
                  size={14}
                  color={theme.colors.icon}
                />
                <Text style={s.meta}>{village}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={s.unavailableStatus}>
          <Text style={s.unavailableLabel}>{t.marketplaceNotAvailable}</Text>
          <View style={s.ageRow}>
            <Ionicons
              accessible={false}
              name="time-outline"
              size={14}
              color={theme.colors.icon}
            />
            <Text style={[s.meta, s.age]}>
              {listingPosted(listing, language)}
            </Text>
          </View>
        </View>
      </View>
    </>
  );
  // Unavailable rows are informational: the active-only detail/contact route stays protected.
  return <View style={[s.card, s.unavailable]}>{content}</View>;
}
const s = StyleSheet.create({
  card: {
    padding: 12,
    gap: 10,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  unavailable: { backgroundColor: theme.colors.background, padding: 10 },
  activeCard: { padding: 10 },
  pressed: { opacity: theme.interaction.pressedOpacity },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  activeRow: { alignItems: "stretch", gap: 8 },
  activeBody: { gap: 2 },
  detailsColumn: {
    width: "24%",
    maxWidth: 96,
    minWidth: theme.layout.touchTarget,
    justifyContent: "center",
    alignItems: "center",
  },
  imageFrame: {
    width: "26%",
    maxWidth: 112,
    minHeight: 120,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.tint,
    overflow: "hidden",
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  thumbnail: {
    width: 42,
    height: 42,
    borderRadius: 8,
    opacity: 0.65,
    backgroundColor: theme.colors.border,
  },
  body: { flex: 1, gap: 4, minWidth: 0 },
  name: {
    color: theme.colors.heading,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
  price: {
    color: theme.colors.heading,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
  priceBadge: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    backgroundColor: theme.colors.accentBackground,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  viewDetails: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: theme.layout.touchTarget,
    maxWidth: "100%",
    paddingHorizontal: 8,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.tint,
  },
  viewDetailsText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center",
  },
  muted: { color: theme.colors.muted },
  villageRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  previousMetaRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  previousMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 1,
    minWidth: 0,
  },
  ageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    maxWidth: "100%",
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },
  unavailableLabel: {
    color: theme.colors.error,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${theme.colors.error}10`,
    textAlign: "right",
  },
  unavailableStatus: { alignItems: "flex-end", gap: 4, maxWidth: "30%" },
  age: { textAlign: "right" },
});
