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
import { formatMessage, messages } from "../../i18n";
import { listingName, type HomeListing } from "../../types/home";
import { ListingImage } from "./ListingImage";
import { listingQuantity, listingRate } from "./listingText";
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
        128,
        Math.min(150, (width - 56) * 0.38 * Math.min(fontScale, 1.4)),
      );
  const name = listingName(listing, language);
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
  const sellers = listing.offerCount ?? 1;
  const rate = listingRate(listing, language);
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
        compact && s.compactCard,
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
        <View style={[s.image, compact && s.imageCompact]}>
          <ListingImage listing={listing} style={s.photo} iconSize={40} />
          {hasPrice && (
            <View style={s.priceChip}>
              <Text numberOfLines={1} style={s.priceChipText}>
                {rate}
              </Text>
            </View>
          )}
        </View>
      )}
      <View style={s.body}>
        {isDirectory && (
          <Badge tone={isService ? "blue" : "green"}>{kind}</Badge>
        )}
        {listing.isDemo && !compact && <Badge yellow>{t.demoListing}</Badge>}
        <Text numberOfLines={compact ? 1 : 2} style={s.name}>
          {name}
        </Text>
        {!hasPrice && !isDirectory && (
          <Text numberOfLines={1} style={s.noPrice}>
            {rate}
          </Text>
        )}
        {isDirectory ? (
          <Text numberOfLines={1} style={s.meta}>
            {t.directoryAvailable}
          </Text>
        ) : (
          <>
            {sellers > 1 ? (
              <Text numberOfLines={1} style={s.sellers}>
                {formatMessage(t.sellerCount, {
                  count: String(sellers),
                })}
              </Text>
            ) : (
              <Text numberOfLines={1} style={s.meta}>
                {listingQuantity(listing, language)}
              </Text>
            )}
            <View style={s.locationRow}>
              <Ionicons
                accessible={false}
                name="location-outline"
                size={13}
                color={theme.colors.muted}
              />
              <Text numberOfLines={1} style={[s.meta, s.village]}>
                {village}
              </Text>
            </View>
          </>
        )}
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
  image: {
    height: 124,
    width: "100%",
    backgroundColor: theme.colors.tint,
    overflow: "hidden",
  },
  // Same size for every card in the row, whatever the name or photo.
  compactCard: { height: 188 },
  imageCompact: { height: 100 },
  photo: { width: "100%", height: "100%" },
  directoryTile: { alignItems: "center", justifyContent: "center" },
  priceChip: {
    position: "absolute",
    left: 8,
    bottom: 8,
    maxWidth: "90%",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: theme.radii.chip,
    backgroundColor: theme.colors.primary,
  },
  priceChipText: { ...theme.type.micro, color: theme.colors.onPrimary },
  body: { paddingHorizontal: 10, paddingVertical: 8, gap: 1 },
  name: { ...theme.type.label, color: theme.colors.heading },
  sellers: {
    ...theme.type.caption,
    color: theme.colors.saffronText,
    fontWeight: "600",
  },
  noPrice: { ...theme.type.caption, color: theme.colors.muted },
  meta: { fontSize: 13, lineHeight: 18, color: theme.colors.muted },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  village: { flex: 1 },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
