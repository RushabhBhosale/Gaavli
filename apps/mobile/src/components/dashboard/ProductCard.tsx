import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { MobileLanguage } from "@gaavli/types";
import { theme } from "../../theme";
import { formatMessage, messages } from "../../i18n";
import { listingName, type HomeListing } from "../../types/home";
import { ListingImage } from "./ListingImage";
import { listingRate } from "./listingText";
import { Badge } from "./primitives";

export function ProductCard({
  listing,
  language,
  onPress,
  wide = false,
}: {
  listing: HomeListing;
  language: MobileLanguage;
  onPress: () => void;
  wide?: boolean;
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${rate}`}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { width: cardWidth },
        pressed && s.pressed,
      ]}
    >
      <ListingImage listing={listing} style={s.image} resizeMode="contain" />
      <View style={s.body}>
        {listing.isDemo && <Badge yellow>{t.demoListing}</Badge>}
        <Text style={s.name}>{name}</Text>
        <Text style={s.price}>{rate}</Text>
        <Text style={s.time}>
          {formatMessage(
            listing.postedMinutesAgo < 60 ? t.minutesAgo : t.hoursAgo,
            {
              count:
                listing.postedMinutesAgo < 60
                  ? listing.postedMinutesAgo
                  : Math.floor(listing.postedMinutesAgo / 60),
            },
          )}
        </Text>
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
  time: {
    color: theme.colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 2,
  },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
