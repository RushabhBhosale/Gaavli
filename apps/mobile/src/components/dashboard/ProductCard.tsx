import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { MobileLanguage } from "@gaavli/types";
import { theme } from "../../theme";
import { messages } from "../../i18n";
import { listingName, type HomeListing } from "../../types/home";
import { ListingImage } from "./ListingImage";
import { listingRate, listingQuantity, listingUnit } from "./listingText";
import { Badge } from "./primitives";

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
        140,
        Math.min(190, (width - 56) * 0.44 * Math.min(fontScale, 1.4)),
      );
  const name = listingName(listing, language);
  const rate = listingRate(listing, language);
  const unit = listingUnit(listing.unit, language);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        compact
          ? [
              listing.module === "services"
                ? t.dashboardServices
                : listing.module === "transport"
                  ? t.dashboardTransport
                  : t.dashboardMarketplace,
              name,
              rate,
              language === "mr" ? listing.villageMr : listing.village,
            ].join(", ")
          : `${name}, ${rate}`
      }
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { width: cardWidth },
        pressed && s.pressed,
      ]}
    >
      {!compact && (
        <ListingImage listing={listing} style={s.image} resizeMode="contain" />
      )}
      <View style={s.body}>
        {compact && (
          <Badge
            tone={
              listing.module === "services"
                ? "blue"
                : listing.module === "transport"
                  ? "green"
                  : "yellow"
            }
          >
            {listing.module === "services"
              ? t.dashboardServices
              : listing.module === "transport"
                ? t.dashboardTransport
                : t.dashboardMarketplace}
          </Badge>
        )}
        {listing.isDemo && <Badge yellow>{t.demoListing}</Badge>}
        <Text style={s.name}>{name}</Text>
        {compact ? (
          <View
            style={[
              s.priceBadge,
              listing.module === "services" && s.servicePriceBadge,
              listing.module === "transport" && s.transportPriceBadge,
              listing.price === null && s.missingPriceBadge,
            ]}
          >
            <Text style={[s.price, s.compactPrice]}>
              {listing.price === null ? t.rateNotProvided : `₹${listing.price}`}
            </Text>
            {listing.price !== null && !!unit && (
              <Text style={[s.price, s.compactPrice]}>{`/ ${unit}`}</Text>
            )}
          </View>
        ) : (
          <Text style={s.price}>{rate}</Text>
        )}
        {compact && (
          <>
            <Text style={s.meta}>
              {!listing.module || listing.module === "marketplace"
                ? listingQuantity(listing, language)
                : t.directoryAvailable}
            </Text>
            <Text style={s.meta}>
              {language === "mr" ? listing.villageMr : listing.village}
            </Text>
            {listing.module === "services" && (
              <Text style={s.meta}>{t.directorySelfDeclared}</Text>
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}
const s = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    shadowColor: theme.shadow.color,
    shadowOpacity: theme.shadow.opacity,
    shadowRadius: theme.shadow.radius,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  image: { height: 120, width: "100%", backgroundColor: theme.colors.tint },
  body: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6, gap: 4 },
  meta: { color: theme.colors.muted, fontSize: 11, lineHeight: 16 },
  name: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  price: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
  },
  priceBadge: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    backgroundColor: theme.colors.accentBackground,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  compactPrice: { fontSize: 15, lineHeight: 24, flexShrink: 1 },
  servicePriceBadge: { backgroundColor: theme.colors.softBlue },
  transportPriceBadge: { backgroundColor: theme.colors.tint },
  missingPriceBadge: { backgroundColor: theme.colors.border },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
