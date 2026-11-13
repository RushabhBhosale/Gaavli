import {
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
import { showAlert } from "../../alert";
import { theme } from "../../theme";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("");

// The village coordinator: a person to call when the app is not enough.
export function CoordinatorInfo({
  coordinator,
  language,
}: {
  coordinator: HomeCoordinator | null;
  language: MobileLanguage;
}) {
  const t = messages(language);
  if (!coordinator) return null;
  const name = language !== "en" ? coordinator.nameMr : coordinator.name;
  const callable = !!(coordinator.publicContactable && coordinator.phone);
  return (
    <View style={s.card}>
      <View accessible={false} style={s.avatar}>
        <Text style={s.initials}>{initials(name)}</Text>
      </View>
      <View style={s.copy}>
        <Text style={s.label}>{t.villageCoordinator}</Text>
        <View style={s.nameRow}>
          <Text numberOfLines={1} style={s.name}>
            {name}
          </Text>
          {coordinator.verified && (
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={theme.colors.primary}
              accessibilityLabel={t.verified}
            />
          )}
        </View>
        {!callable && <Text style={s.noPhone}>{t.coordinatorNoPhone}</Text>}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t.dashboardContact}: ${name}`}
        accessibilityHint={callable ? undefined : t.coordinatorNoPhone}
        accessibilityState={{ disabled: !callable }}
        disabled={!callable}
        onPress={() => {
          if (/^\+91[6-9]\d{9}$/.test(coordinator.phone ?? ""))
            void Linking.openURL(`tel:${coordinator.phone}`).catch(() =>
              showAlert(t.callError),
            );
        }}
        style={({ pressed }) => [
          s.call,
          !callable && s.callOff,
          pressed && s.pressed,
        ]}
      >
        <Ionicons
          accessible={false}
          name="call"
          size={18}
          color={callable ? theme.colors.onPrimary : theme.colors.inactive}
        />
        <Text style={[s.callText, !callable && s.callTextOff]}>
          {t.dashboardContact}
        </Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.card,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 10,
    minHeight: 68,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { ...theme.type.subheading, color: theme.colors.primaryDark },
  copy: { flex: 1, minWidth: 0 },
  label: { ...theme.type.micro, color: theme.colors.muted },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: {
    flexShrink: 1,
    ...theme.type.subheading,
    color: theme.colors.heading,
  },
  call: {
    minHeight: theme.layout.touchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
  },
  callOff: { backgroundColor: theme.colors.surfaceMuted },
  callTextOff: { color: theme.colors.inactive },
  noPhone: {
    ...theme.type.micro,
    fontWeight: "400" as const,
    color: theme.colors.muted,
  },
  callText: { ...theme.type.label, color: theme.colors.onPrimary },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
