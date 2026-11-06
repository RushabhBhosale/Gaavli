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
      <Ionicons
        name={name}
        size={24}
        color={yellow ? theme.colors.accent : theme.colors.primary}
      />
    </View>
  );
}
export function Badge({
  children,
  yellow = false,
  tone,
}: {
  children: string;
  yellow?: boolean;
  tone?: "yellow" | "blue" | "green";
}) {
  return (
    <View
      style={[
        d.badge,
        (yellow || tone === "yellow") && d.yellow,
        tone === "blue" && d.blue,
      ]}
    >
      <Text
        style={[
          d.badgeText,
          (yellow || tone === "yellow") && d.yellowText,
          tone === "blue" && d.blueText,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}
export function SectionHeader({
  title,
  action,
  onPress,
  badge,
  icon,
}: {
  title: string;
  icon?: IconName;
  action?: string;
  onPress?: () => void;
  badge?: string;
}) {
  return (
    <View style={d.sectionHeader}>
      {icon && (
        <View accessible={false} style={d.sectionIcon}>
          <Ionicons name={icon} size={18} color={theme.colors.primary} />
        </View>
      )}
      <Text accessibilityRole="header" style={d.sectionTitle}>
        {title}
      </Text>
      {badge && <Badge tone="green">{badge}</Badge>}
      {action && onPress && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={d.textAction}
        >
          <Text style={d.textActionLabel}>{action}</Text>
          <Ionicons
            accessible={false}
            name="chevron-forward"
            size={16}
            color={theme.colors.primary}
          />
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
  badgeTone,
  dashboard = false,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: "yellow" | "blue" | "green";
  dashboard?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, badge].filter(Boolean).join(". ")}
      onPress={onPress}
      style={({ pressed }) => [
        d.navCard,
        dashboard && d.dashboardNavCard,
        pressed && d.pressed,
      ]}
    >
      <IconTile name={icon} />
      <View style={d.navCopy}>
        {dashboard ? (
          <View style={d.navTitleRow}>
            <Text style={[d.cardTitle, d.navTitle]}>{title}</Text>
            {badge && (
              <View style={d.navStatus}>
                <Badge tone={badgeTone}>{badge}</Badge>
              </View>
            )}
          </View>
        ) : (
          <Text style={d.cardTitle}>{title}</Text>
        )}
        <Text style={d.description}>{subtitle}</Text>
        {badge && !dashboard && (
          <View style={d.badgeRow}>
            <Badge tone={badgeTone}>{badge}</Badge>
          </View>
        )}
      </View>
      <Ionicons
        accessible={false}
        name="chevron-forward"
        size={20}
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
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 24,
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
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    flex: 1,
    color: theme.colors.heading,
    ...theme.type.heading,
  },
  textAction: {
    minHeight: theme.layout.touchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 8,
  },
  textActionLabel: {
    ...theme.type.label,
    color: theme.colors.primary,
  },
  panel: {
    borderRadius: theme.radii.card,
    padding: 16,
    gap: 14,
  },
  navCard: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  navCopy: { flex: 1, gap: 4 },
  dashboardNavCard: { padding: 14, gap: 14 },
  navTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  navTitle: { flex: 1 },
  navStatus: { maxWidth: "48%", flexShrink: 1 },
  cardTitle: { ...theme.type.subheading, color: theme.colors.text },
  description: { ...theme.type.caption, color: theme.colors.muted },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.saffronTint,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: theme.colors.tint,
    borderRadius: theme.radii.chip,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: { ...theme.type.micro, color: theme.colors.primaryDark },
  badgeRow: { paddingTop: 4 },
  yellow: { backgroundColor: theme.colors.accentBackground },
  yellowText: { color: theme.colors.warning },
  blue: { backgroundColor: theme.colors.softBlue },
  blueText: { color: theme.colors.info },
  pressed: { opacity: theme.interaction.pressedOpacity },
  preview: { flexDirection: "row", alignItems: "center", gap: 8 },
  previewText: { flex: 1, ...theme.type.caption, color: theme.colors.muted },
});
