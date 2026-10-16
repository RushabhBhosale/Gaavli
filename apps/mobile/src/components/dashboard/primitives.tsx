import type { ComponentProps, ReactNode } from "react";
import {
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "../../theme";
import { Card, OfflineBanner } from "../ui";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";

export type IconName = ComponentProps<typeof Ionicons>["name"];
export function IconTile({
  name,
  yellow = false,
}: {
  name: IconName;
  yellow?: boolean;
}) {
  return (
    <View style={[d.iconTile, yellow && d.yellow]}>
      <Ionicons name={name} size={24} color={theme.colors.primary} />
    </View>
  );
}
export function Badge({
  children,
  yellow = false,
}: {
  children: string;
  yellow?: boolean;
}) {
  return (
    <View style={[d.badge, yellow && d.yellow]}>
      <Text style={d.badgeText}>{children}</Text>
    </View>
  );
}
export function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={d.sectionHeader}>
      <Text accessibilityRole="header" style={d.sectionTitle}>
        {title}
      </Text>
      {action && onPress && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={d.textAction}
        >
          <Text style={d.textActionLabel}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}
export function Panel({
  children,
  yellow = false,
  style,
}: {
  children: ReactNode;
  yellow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <Card style={[d.panel, yellow && d.yellow, style]}>{children}</Card>;
}
export function NavigationCard({
  icon,
  title,
  subtitle,
  badge,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [d.navCard, pressed && d.pressed]}
    >
      <IconTile name={icon} />
      <View style={d.navCopy}>
        <Text style={d.cardTitle}>{title}</Text>
        <Text style={d.description}>{subtitle}</Text>
        {badge && (
          <View style={d.badgeRow}>
            <Badge>{badge}</Badge>
          </View>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={theme.colors.inactive}
      />
    </Pressable>
  );
}
export function PreviewBanner() {
  const t = messages(useAppStore((state) => state.language));
  return (
    <View style={d.preview}>
      <Ionicons
        name="information-circle-outline"
        size={18}
        color={theme.colors.muted}
      />
      <Text style={d.previewText}>{t.previewDescription}</Text>
    </View>
  );
}
export function DashboardScreen({ children }: { children: ReactNode }) {
  const { language, offline } = useAppStore();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={d.safe}>
      {offline && <OfflineBanner message={messages(language).offline} />}
      <ScrollView
        contentContainerStyle={d.content}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export const d = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 22,
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
  },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    flex: 1,
    color: theme.colors.heading,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
  },
  textAction: {
    minHeight: theme.layout.touchTarget,
    justifyContent: "center",
    paddingLeft: 8,
  },
  textActionLabel: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.text,
    fontWeight: "600",
  },
  panel: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: theme.shadow.color,
    shadowOpacity: theme.shadow.opacity,
    shadowRadius: theme.shadow.radius,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  navCard: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    shadowColor: theme.shadow.color,
    shadowOpacity: theme.shadow.opacity,
    shadowRadius: theme.shadow.radius,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  navCopy: { flex: 1, gap: 5 },
  cardTitle: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "600",
    color: theme.colors.text,
  },
  description: { fontSize: 13, lineHeight: 20, color: theme.colors.muted },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: theme.colors.tint,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
  },
  badgeRow: { paddingTop: 5 },
  yellow: { backgroundColor: theme.colors.accentBackground },
  pressed: { opacity: theme.interaction.pressedOpacity },
  preview: { flexDirection: "row", alignItems: "center", gap: 8 },
  previewText: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
