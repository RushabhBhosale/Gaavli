import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileLanguage } from "@gaavli/types";
import type { HomeDestination } from "../../types/home";
import { messages } from "../../i18n";
import { Button } from "../ui";
import { theme } from "../../theme";
import { IconTile, Panel, d } from "./primitives";

export function BecomeSellerCard({
  language,
  onPress,
}: {
  language: MobileLanguage;
  onPress: () => void;
}) {
  const t = messages(language);
  return (
    <Panel yellow>
      <View style={s.intro}>
        <IconTile name="leaf-outline" yellow />
        <View style={s.copy}>
          <Text style={d.cardTitle}>{t.sellerPrompt}</Text>
          <Text style={d.description}>{t.sellerDescription}</Text>
        </View>
      </View>
      <Button onPress={onPress}>{t.becomeSeller}</Button>
    </Panel>
  );
}
export function SellerDashboardCard({
  language,
  onNavigate,
}: {
  language: MobileLanguage;
  onNavigate: (route: HomeDestination) => void;
}) {
  const t = messages(language);
  const actions = [
    { route: "/add-listing", label: t.addListing, icon: "add-circle-outline" },
    { route: "/my-listings", label: t.myListings, icon: "list-outline" },
    { route: "/insights", label: t.viewInsights, icon: "bar-chart-outline" },
  ] as const;
  return (
    <Panel>
      <Text accessibilityRole="header" style={d.cardTitle}>
        {t.sellerDashboard}
      </Text>
      <View style={s.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.route}
            accessibilityRole="button"
            onPress={() => onNavigate(action.route)}
            style={({ pressed }) => [s.action, pressed && d.pressed]}
          >
            <IconTile name={action.icon} />
            <Text style={s.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </Panel>
  );
}
const s = StyleSheet.create({
  intro: { flexDirection: "row", gap: 12, alignItems: "center" },
  copy: { flex: 1, gap: 5 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  action: {
    flexGrow: 1,
    flexBasis: 80,
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    minHeight: 80,
  },
  actionLabel: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
