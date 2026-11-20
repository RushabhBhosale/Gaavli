import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { listingName, type HomeListing } from "../../types/home";
import type { IconName } from "./primitives";
import { openState } from "../../data/operatingHours";
import { useListingClock } from "../../hooks/useListingClock";

// A person or vehicle you can book: the name in full, what they do, and where.
export function ServiceCard({
  listing,
  language,
  onPress,
}: {
  listing: HomeListing;
  language: MobileLanguage;
  onPress: () => void;
}) {
  const t = messages(language);
  const now = useListingClock();
  const state = openState(listing.hours, !!listing.closed, new Date(now));
  const status =
    state === "open"
      ? t.directoryOpenNow
      : state === "closed"
        ? t.directoryClosedNow
        : null;
  const { width, fontScale } = useWindowDimensions();
  // Exactly the Marketplace card's width, so the three rows line up.
  const cardWidth = Math.max(
    128,
    Math.min(150, (width - 56) * 0.38 * Math.min(fontScale, 1.4)),
  );
  const name = listingName(listing, language);
  const village = language !== "en" ? listing.villageMr : listing.village;
  const transport = listing.module === "transport";
  const detail = [listing.category, village].filter(Boolean).join(" · ");
  const module = theme.modules[transport ? "transport" : "services"];
  const look = {
    icon: (transport
      ? "car-outline"
      : (LOOKS[listing.category] ?? LOOKS.Other).icon) as IconName,
    color: module.color,
    background: module.tint,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[name, detail, status].filter(Boolean).join(", ")}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { width: cardWidth },
        pressed && s.pressed,
      ]}
    >
      <View style={[s.art, { backgroundColor: look.background }]}>
        <Ionicons
          accessible={false}
          name={look.icon}
          size={40}
          color={look.color}
        />
      </View>
      <View style={s.copy}>
        <Text numberOfLines={1} style={s.name}>
          {name}
        </Text>
        {!!detail && (
          <Text numberOfLines={1} style={s.detail}>
            {detail}
          </Text>
        )}
        {status && (
          <View style={s.status}>
            <View style={[s.dot, state === "closed" && s.closedDot]} />
            <Text style={[s.statusText, state === "closed" && s.closedText]}>
              {status}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const LOOKS: Record<
  string,
  {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
    background: string;
  }
> = {
  Utility: {
    icon: "construct-outline",
    color: theme.colors.accent,
    background: theme.colors.accentBackground,
  },
  Medical: {
    icon: "medkit-outline",
    color: theme.colors.error,
    background: theme.colors.errorBackground,
  },
  Shop: {
    icon: "storefront-outline",
    color: theme.colors.info,
    background: theme.colors.softBlue,
  },
  Other: {
    icon: "construct-outline",
    color: theme.colors.primary,
    background: theme.colors.tint,
  },
  Transport: {
    icon: "car-outline",
    color: theme.colors.primary,
    background: theme.colors.tint,
  },
};

const s = StyleSheet.create({
  // Same size and proportions as the product cards beside them.
  card: {
    height: 188,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  art: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { paddingHorizontal: 12, paddingVertical: 10, gap: 1 },
  name: { ...theme.type.subheading, color: theme.colors.heading },
  detail: { fontSize: 14, lineHeight: 20, color: theme.colors.muted },
  status: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  statusText: { ...theme.type.label, color: theme.colors.primaryDark },
  closedDot: { backgroundColor: theme.colors.error },
  closedText: { color: theme.colors.error },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
