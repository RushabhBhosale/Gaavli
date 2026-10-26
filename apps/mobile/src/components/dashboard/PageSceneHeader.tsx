import { Image, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { BackButton } from "../ui";
import { theme } from "../../theme";

export function PageSceneHeader({
  title,
  subtitle,
  backLabel,
  onBack,
  action,
  edgeInset = 20,
  topInset = 14,
}: {
  title: string;
  subtitle: string;
  backLabel: string;
  onBack: () => void;
  action?: ReactNode;
  edgeInset?: number;
  topInset?: number;
}) {
  return (
    <View
      style={[s.header, { marginHorizontal: -edgeInset, marginTop: -topInset }]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={s.art}
      >
        <Image
          source={require("../../../assets/account-header-village.png")}
          resizeMode="cover"
          accessible={false}
          style={s.landscape}
        />
      </View>
      {action && <View style={s.action}>{action}</View>}
      <View style={s.row}>
        <BackButton label={backLabel} onPress={onBack} />
        <View style={s.copy}>
          <Text accessibilityRole="header" style={s.title}>
            {title}
          </Text>
          <Text style={s.subtitle}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  action: { position: "absolute", right: 12, top: 12 },
  header: {
    backgroundColor: theme.colors.background,
    minHeight: 84,
    borderBottomLeftRadius: theme.radii.card,
    borderBottomRightRadius: theme.radii.card,
    overflow: "hidden",
    paddingVertical: 6,
    paddingLeft: 4,
    paddingRight: 110,
    justifyContent: "center",
  },
  art: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    opacity: 0.65,
  },
  landscape: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: {
    fontSize: 22,
    lineHeight: 34,
    fontWeight: "700",
    color: theme.colors.heading,
    includeFontPadding: true,
  },
  subtitle: { fontSize: 13, lineHeight: 21, color: theme.colors.muted },
});
