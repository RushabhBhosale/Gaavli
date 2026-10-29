import {
  Alert,
  Linking,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileLanguage } from "@gaavli/types";
import type { HomeCoordinator } from "../../types/home";
import { messages } from "../../i18n";
import { theme } from "../../theme";

export function CoordinatorInfo({
  coordinator,
  language,
}: {
  coordinator: HomeCoordinator | null;
  language: MobileLanguage;
}) {
  const t = messages(language);
  if (!coordinator) return null;
  const name = language === "mr" ? coordinator.nameMr : coordinator.name;
  return (
    <View style={s.row}>
      <View style={s.copy}>
        <Text style={s.label}>{t.villageCoordinator}</Text>
        <View style={s.nameRow}>
          <Text style={s.name}>{name}</Text>
          {coordinator.verified && (
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={theme.colors.primary}
              accessibilityLabel={t.verified}
            />
          )}
        </View>
        {!!coordinator.village && (
          <Text style={s.label}>
            {language === "mr"
              ? coordinator.villageMr || coordinator.village
              : coordinator.village}
          </Text>
        )}
      </View>
      {coordinator.publicContactable && coordinator.phone && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.dashboardContact}: ${name}`}
          onPress={() => {
            if (
              coordinator.publicContactable &&
              /^\+91[6-9]\d{9}$/.test(coordinator.phone ?? "")
            )
              void Linking.openURL(`tel:${coordinator.phone}`).catch(() =>
                Alert.alert(t.callError),
              );
          }}
          style={({ pressed }) => [s.callTarget, pressed && s.pressed]}
        >
          <View style={s.callPill}>
            <Ionicons name="call-outline" size={14} color={theme.colors.text} />
            <Text style={s.callText}>{t.dashboardContact}</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.card,
    padding: 12,
  },
  copy: { flex: 1, gap: 2 },
  label: { fontSize: 11, lineHeight: 17, color: theme.colors.muted },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: {
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  callTarget: {
    minHeight: theme.layout.touchTarget,
    minWidth: theme.layout.touchTarget,
    justifyContent: "center",
  },
  callPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.control,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  callText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
