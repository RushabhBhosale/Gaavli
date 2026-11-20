import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileLanguage } from "@gaavli/types";
import { useAppStore } from "../../store";
import { formatMessage, messages } from "../../i18n";
import { theme } from "../../theme";
import { browsingVillageFor } from "../../storage/browsingVillage";
import { useMappedVillages } from "../../mappedVillages";
import { SectionHeader, d } from "./primitives";

// The villages connected to the one being browsed, so people see whose
// listings reach them. Quietly absent until the list loads or when empty.
export function NearbyVillages({
  language,
  onSeeAll,
}: {
  language: MobileLanguage;
  onSeeAll: () => void;
}) {
  const t = messages(language);
  const browsing = useAppStore(browsingVillageFor);
  const query = useMappedVillages(browsing?.id);
  const villages = query.data?.villages ?? [];
  if (!villages.length) return null;
  return (
    <View style={d.section}>
      <SectionHeader
        icon="location-outline"
        tone="marketplace"
        title={t.nearbyVillages}
        action={t.viewAll}
        onPress={onSeeAll}
      />
      <FlatList
        horizontal
        data={villages}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => {
          const name = language !== "en" ? item.nameMr || item.name : item.name;
          const away =
            item.distanceKm === undefined
              ? [item.taluka, item.district].filter(Boolean).join(", ")
              : formatMessage(t.nearbyAway, {
                  distance: Math.round(item.distanceKm),
                });
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${name}, ${away}`}
              onPress={onSeeAll}
              style={({ pressed }) => [s.card, pressed && s.pressed]}
            >
              <View style={s.pin}>
                <Ionicons
                  accessible={false}
                  name="location"
                  size={16}
                  color={theme.modules.marketplace.color}
                />
              </View>
              <Text numberOfLines={1} style={s.name}>
                {name}
              </Text>
              <Text numberOfLines={1} style={s.away}>
                {away}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    width: 118,
    padding: 10,
    gap: 2,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 9,
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.modules.marketplace.tint,
  },
  name: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  away: { fontSize: 12, lineHeight: 17, color: theme.colors.muted },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
