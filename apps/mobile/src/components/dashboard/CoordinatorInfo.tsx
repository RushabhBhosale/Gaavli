import { Pressable, Text, View, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileLanguage } from "@gaavli/types";
import type { HomeCoordinator } from "../../types/home";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { dialSampleContact } from "./sampleContacts";

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
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t.call}: ${name}`}
        onPress={() => dialSampleContact(coordinator.phone, language)}
        style={({ pressed }) => [s.callTarget, pressed && s.pressed]}
      >
        <View style={s.callPill}>
          <Ionicons name="call-outline" size={14} color={theme.colors.text} />
          <Text style={s.callText}>{t.call}</Text>
        </View>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
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
