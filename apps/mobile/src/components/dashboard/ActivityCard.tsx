import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { PROVIDER_KINDS, ProviderType } from "@gaavli/constants";
import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import type { IconName } from "./primitives";
import { activityStatus, type ActivityCardData } from "../../data/activities";
import { useListingClock } from "../../hooks/useListingClock";

const iconFor = (type?: string): IconName =>
  type === ProviderType.TRANSPORT_DRIVER
    ? "car-outline"
    : type === ProviderType.SHOP_BUSINESS
      ? "storefront-outline"
      : type === ProviderType.HEALTHCARE_PROFESSIONAL ||
          type === ProviderType.MEDICAL_FACILITY
        ? "medkit-outline"
        : "briefcase-outline";

// One of your own activities on the dashboard: a shop, a service or products.
export function ActivityCard({
  card,
  language,
  onPress,
}: {
  card: ActivityCardData;
  language: MobileLanguage;
  onPress: () => void;
}) {
  const t = messages(language);
  const now = useListingClock();
  const state = activityStatus(card, new Date(now));
  const status =
    state === "inactive"
      ? t.actInactive
      : state === "open"
        ? t.directoryOpenNow
        : state === "closed"
          ? t.directoryClosedNow
          : null;
  const statusColor =
    state === "inactive"
      ? theme.colors.muted
      : state === "closed"
        ? theme.colors.error
        : theme.colors.success;
  const { width, fontScale } = useWindowDimensions();
  const cardWidth = Math.max(
    128,
    Math.min(150, (width - 56) * 0.38 * Math.min(fontScale, 1.4)),
  );
  const icon: IconName =
    card.kind === "products" ? "basket-outline" : iconFor(card.providerType);
  const kind =
    card.providerType && PROVIDER_KINDS[card.providerType as ProviderType]
      ? PROVIDER_KINDS[card.providerType as ProviderType].title[language]
      : card.detail;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[card.title, kind, status].filter(Boolean).join(", ")}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { width: cardWidth },
        pressed && s.pressed,
      ]}
    >
      <View style={s.art}>
        <Ionicons
          accessible={false}
          name={icon}
          size={40}
          color={theme.modules.activities.color}
        />
      </View>
      <View style={s.copy}>
        <Text numberOfLines={1} style={s.name}>
          {card.title}
        </Text>
        {!!kind && (
          <Text numberOfLines={1} style={s.detail}>
            {kind}
          </Text>
        )}
        {status && (
          <View style={s.status}>
            <View style={[s.dot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusText, { color: statusColor }]}>{status}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
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
    backgroundColor: theme.modules.activities.tint,
  },
  copy: { paddingHorizontal: 12, paddingVertical: 10, gap: 1 },
  name: { ...theme.type.subheading, color: theme.colors.heading },
  detail: { fontSize: 14, lineHeight: 20, color: theme.colors.muted },
  status: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  statusText: { ...theme.type.label, color: theme.colors.primaryDark },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
