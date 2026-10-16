import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileLanguage } from "@gaavli/types";
import { formatMessage, messages } from "../../i18n";
import { theme } from "../../theme";
import { listingName, type HomeListing } from "../../types/home";
import { Badge, Panel, d } from "./primitives";
import { ListingImage } from "./ListingImage";
import { listingRate, listingQuantity } from "./listingText";

export function MarketplaceListingCard({
  listing,
  language,
  onPress,
}: {
  listing: HomeListing;
  language: MobileLanguage;
  onPress: () => void;
}) {
  const t = messages(language);
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 320 || fontScale > 1.4;
  return (
    <Panel style={s.card}>
      <View style={s.info}>
        <View style={[s.product, stacked && s.stacked]}>
          <ListingImage listing={listing} style={s.image} />
          <View style={s.copy}>
            {listing.isDemo && <Badge yellow>{t.demoListing}</Badge>}
            <Text style={s.name}>{listingName(listing, language)}</Text>
            <Text style={s.price}>{listingRate(listing, language)}</Text>
            <Text style={s.quantityText}>
              {listingQuantity(listing, language)}
            </Text>
          </View>
        </View>
        <View style={s.location}>
          <Ionicons
            name="location-outline"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={s.metadataText}>
            {formatMessage(t.listingVillage, {
              village: language === "mr" ? listing.villageMr : listing.village,
            })}
            {listing.distanceKm !== undefined &&
              ` · ${formatMessage(t.listingDistance, {
                distance: listing.distanceKm,
              })}`}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t.viewDetails}: ${listingName(listing, language)}`}
        onPress={onPress}
        style={({ pressed }) => [s.details, pressed && d.pressed]}
      >
        <Text style={s.detailsText}>{t.viewDetails}</Text>
        <Ionicons name="chevron-forward" size={14} color={theme.colors.text} />
      </Pressable>
    </Panel>
  );
}
const s = StyleSheet.create({
  card: { padding: 12, gap: 10, flexDirection: "row", alignItems: "center" },
  info: { flex: 1, gap: 8 },
  product: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stacked: { flexDirection: "column" },
  image: {
    width: 64,
    height: 64,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.tint,
  },
  copy: { flexShrink: 1, gap: 3 },
  name: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
  },
  price: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "700",
  },
  unit: { color: theme.colors.muted, fontSize: 14, fontWeight: "400" },
  quantityText: { color: theme.colors.muted, fontSize: 12, lineHeight: 18 },
  details: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: theme.colors.softGreen,
    borderRadius: theme.radii.control,
    maxWidth: "32%",
  },
  detailsText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    flexShrink: 1,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  metadataText: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },
});
