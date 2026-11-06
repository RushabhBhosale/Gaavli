import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Tabs } from "expo-router";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { coordinatorMessages } from "../coordinator/i18n";
import { hasCoordinatorRole } from "../data/accountAccess";
import { theme } from "../theme";
import { VoiceTabButton } from "./VoiceTabButton";
import { tabSlots } from "../data/dashboardTabs";

type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];
type IconName = ComponentProps<typeof Ionicons>["name"];
type Slot = { route: string; label: string; icon: IconName; active: IconName };

export function GaavliTabBar({ state, navigation }: TabBarProps) {
  const { session, language } = useAppStore();
  const t = messages(language);
  const c = coordinatorMessages(language);
  const insets = useSafeAreaInsets();
  const coordinator = hasCoordinatorRole(session?.user);
  const slots: Record<string, Slot> = {
    home: {
      route: "home",
      label: t.home,
      icon: "home-outline",
      active: "home",
    },
    marketplace: {
      route: "marketplace",
      label: t.marketplace,
      icon: "storefront-outline",
      active: "storefront",
    },
    services: {
      route: "services",
      label: t.dashboardServices,
      icon: "construct-outline",
      active: "construct",
    },
    "my-listings": {
      route: "my-listings",
      label: t.myListings,
      icon: "cube-outline",
      active: "cube",
    },
    manage: {
      route: "manage",
      label: c.manage,
      icon: "grid-outline",
      active: "grid",
    },
    activity: {
      route: "activity",
      label: coordinator ? c.activity : t.myActivity,
      icon: "chatbubbles-outline",
      active: "chatbubbles",
    },
    profile: {
      route: "profile",
      label: t.settings,
      icon: "settings-outline",
      active: "settings",
    },
  };
  const [second, fourth] = tabSlots({
    signedIn: !!session,
    seller: !!session?.user.isSeller,
    coordinator,
  });
  const current = state.routes[state.index]?.name;
  const item = (slot: Slot) => {
    const focused = current === slot.route;
    return (
      <Pressable
        key={slot.route}
        accessibilityRole="tab"
        accessibilityLabel={slot.label}
        accessibilityState={{ selected: focused }}
        onPress={() => {
          const route = state.routes.find((entry) => entry.name === slot.route);
          const event = route
            ? navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              })
            : null;
          if (!focused && !event?.defaultPrevented)
            navigation.navigate(slot.route);
        }}
        style={({ pressed }) => [s.item, pressed && s.pressed]}
      >
        <View
          pointerEvents="none"
          style={[s.indicator, focused && s.indicatorOn]}
        />
        <Ionicons
          accessible={false}
          name={focused ? slot.active : slot.icon}
          size={24}
          color={focused ? theme.colors.primary : theme.colors.inactive}
        />
        <Text numberOfLines={1} style={[s.label, focused && s.labelActive]}>
          {slot.label}
        </Text>
      </Pressable>
    );
  };
  return (
    <View
      accessibilityRole="tablist"
      style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      {item(slots.home)}
      {item(slots[second])}
      <VoiceTabButton />
      {item(slots[fourth])}
      {item(slots.profile)}
    </View>
  );
}

const s = StyleSheet.create({
  // A white bar that lifts off the page with rounded top corners and a soft
  // shadow, instead of a flat strip with a hairline.
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 8,
    paddingHorizontal: 6,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: theme.shadow.color,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  item: {
    flex: 1,
    minHeight: theme.layout.touchTarget + 4,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
  },
  pressed: { opacity: theme.interaction.pressedOpacity },
  // The selected tab gets a short saffron bar on the top edge, a filled
  // icon and a bold label; nothing else in the bar is saffron text.
  indicator: {
    position: "absolute",
    top: -8,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  indicatorOn: { backgroundColor: theme.colors.primary },
  label: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    color: theme.colors.inactive,
    includeFontPadding: true,
  },
  labelActive: { color: theme.colors.primary, fontWeight: "700" },
});
