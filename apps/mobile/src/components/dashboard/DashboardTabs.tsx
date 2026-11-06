import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { dashboardTabs, type DashboardTab } from "../../data/dashboardTabs";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { theme } from "../../theme";

export function DashboardTabs({ selected }: { selected: DashboardTab }) {
  const { session, language } = useAppStore();
  const router = useRouter();
  const setDashboardTab = useAppStore((state) => state.setDashboardTab);
  useFocusEffect(
    useCallback(() => {
      setDashboardTab(selected);
    }, [selected, setDashboardTab]),
  );
  const t = messages(language);
  if (!session) return null;
  const labels = {
    coordinator: t.dashboardCoordinator,
    buyer: t.buyer,
    seller: t.dashboardSeller,
  };
  const icons = {
    coordinator: "people-outline",
    buyer: "basket-outline",
    seller: "leaf-outline",
  } as const;
  return (
    <View accessibilityRole="tablist" style={s.tabs}>
      {dashboardTabs(session.user).map((tab) => (
        <Pressable
          key={tab}
          accessibilityRole="tab"
          accessibilityState={{ selected: selected === tab }}
          onPress={() => {
            if (tab === selected) return;
            router.navigate(
              tab === "coordinator"
                ? "/manage"
                : tab === "seller"
                  ? "/my-listings"
                  : { pathname: "/home", params: { dashboard: "buyer" } },
            );
          }}
          style={({ pressed }) => [
            s.tab,
            selected === tab && s.selected,
            pressed && { opacity: theme.interaction.pressedOpacity },
          ]}
        >
          <Ionicons
            accessible={false}
            name={icons[tab]}
            size={18}
            color={
              selected === tab
                ? theme.colors.primaryDark
                : theme.colors.heading
            }
          />
          <Text
            style={[
              s.label,
              {
                color:
                  selected === tab
                    ? theme.colors.primaryDark
                    : theme.colors.heading,
              },
            ]}
          >
            {labels[tab]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    marginVertical: 8,
    alignSelf: "center",
    width: "94%",
    maxWidth: theme.layout.contentWidth,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.control,
  },
  tab: {
    flex: 1,
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: 4,
    paddingVertical: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selected: { borderColor: theme.colors.focusBorder },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.heading,
    textAlign: "center",
    flexShrink: 1,
  },
});
