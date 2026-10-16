import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileLanguage } from "@gaavli/types";
import type { HomeCoordinator, HomeUser } from "../../types/home";
import { theme } from "../../theme";
import { CoordinatorInfo } from "./CoordinatorInfo";

export function VillageHeader({
  user,
  coordinator,
  language,
  changeVillageLabel,
  onPress,
}: {
  user: HomeUser;
  coordinator: HomeCoordinator | null;
  language: MobileLanguage;
  changeVillageLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={s.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${user.village}. ${changeVillageLabel}`}
        onPress={onPress}
        style={s.location}
      >
        <Ionicons name="location" size={24} color={theme.colors.primary} />
        <View style={s.copy}>
          <Text style={s.name}>{user.village}</Text>
          <Text style={s.subtitle}>
            {[user.taluka, user.district].filter(Boolean).join(", ")}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={14} color={theme.colors.inactive} />
      </Pressable>
      {coordinator && (
        <View style={s.coordinator}>
          <CoordinatorInfo coordinator={coordinator} language={language} />
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  header: { gap: 2 },
  coordinator: { paddingLeft: 32 },
  location: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  copy: { flex: 1, gap: 2 },
  name: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
  },
  subtitle: { color: theme.colors.muted, fontSize: 12, lineHeight: 18 },
});
