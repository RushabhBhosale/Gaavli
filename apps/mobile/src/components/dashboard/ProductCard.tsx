import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileLanguage } from "@gaavli/types";
import { theme } from "../../theme";
import { messages } from "../../i18n";
import { listingName, type HomeListing } from "../../types/home";
import { ListingImage } from "./ListingImage";
import { listingQuantity, listingUnit } from "./listingText";
import { Badge } from "./primitives";

// Photo first, then name, then price: the three things a buyer scans for.
export function ProductCard({
  listing,
  language,
  onPress,
  wide = false,
  compact = false,
}: {
  listing: HomeListing;
  language: MobileLanguage;
  onPress: () => void;
  wide?: boolean;
  compact?: boolean;
}) {
  const t = messages(language);
  const { width, fontScale } = useWindowDimensions();
  const cardWidth = wide
    ? undefined
    : Math.max(
        150,
        Math.min(190, (width - 56) * 0.46 * Math.min(fontScale, 1.4)),
      );
  const name = listingName(listing, language);
  const unit = listingUnit(listing.unit, language);
  const village = language !== "en" ? listing.villageMr : listing.village;
  const isService = listing.module === "services";
  const isTransport = listing.module === "transport";
  const isDirectory = isService || isTransport;
  const kind = isService
    ? t.dashboardServices
    : isTransport
      ? t.dashboardTransport
      : t.dashboardMarketplace;
  const hasPrice = listing.price !== null;
  const rate = hasPrice
    ? `₹${listing.price}${unit ? ` / ${unit}` : ""}`
    : t.rateNotProvided;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        compact ? [kind, name, rate, village].join(", ") : `${name}, ${rate}`
      }
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { width: cardWidth },
        pressed && s.pressed,
      ]}
    >
      {isDirectory ? (
        <View style={[s.image, s.directoryTile]}>
          <Ionicons
            accessible={false}
            name={isService ? "construct-outline" : "car-outline"}
            size={34}
            color={theme.colors.primary}
          />
        </View>
      ) : (
        <ListingImage listing={listing} style={s.image} />
      )}
      <View style={s.body}>
        {isDirectory && (
          <Badge tone={isService ? "blue" : "green"}>{kind}</Badge>
        )}
        {listing.isDemo && <Badge yellow>{t.demoListing}</Badge>}
        <Text numberOfLines={2} style={s.name}>
          {name}
        </Text>
        <Text numberOfLines={1} style={[s.price, !hasPrice && s.noPrice]}>
          {rate}
        </Text>
        <Text numberOfLines={1} style={s.meta}>
          {isDirectory
            ? t.directoryAvailable
            : listingQuantity(listing, language)}
        </Text>
        <View style={s.locationRow}>
          <Ionicons
            accessible={false}
            name="location-outline"
            size={14}
            color={theme.colors.muted}
          />
          <Text numberOfLines={1} style={[s.meta, s.village]}>
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
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  image: { height: 112, width: "100%", backgroundColor: theme.colors.tint },
  directoryTile: { alignItems: "center", justifyContent: "center" },
  body: { padding: 12, gap: 4 },
  name: { ...theme.type.subheading, color: theme.colors.heading },
  price: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  noPrice: { fontSize: 14, fontWeight: "500", color: theme.colors.muted },
  meta: { ...theme.type.caption, color: theme.colors.muted },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  village: { flex: 1 },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
