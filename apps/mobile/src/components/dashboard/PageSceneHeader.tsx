import { StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { BackButton } from "../ui";
import { theme } from "../../theme";

// Plain page header: back, what this page is, and one line saying what it holds.
export function PageSceneHeader({
  title,
  subtitle,
  backLabel,
  onBack,
  action,
}: {
  title: string;
  subtitle: string;
  backLabel: string;
  onBack: () => void;
  action?: ReactNode;
  // Accepted for existing callers; the plain header needs no bleed-out insets.
  edgeInset?: number;
  topInset?: number;
}) {
  return (
    <View style={s.row}>
      <BackButton label={backLabel} onPress={onBack} />
      <View style={s.copy}>
        <Text accessibilityRole="header" style={s.title}>
          {title}
        </Text>
        <Text style={s.subtitle}>{subtitle}</Text>
      </View>
      {action}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 56 },
  copy: { flex: 1, minWidth: 0 },
  title: { ...theme.type.title, color: theme.colors.heading },
  subtitle: { ...theme.type.caption, color: theme.colors.muted },
});
