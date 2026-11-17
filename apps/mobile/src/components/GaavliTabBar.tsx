import { useState, type ComponentProps } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter, type Tabs } from "expo-router";
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
  const router = useRouter();
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
    transport: {
      route: "transport",
      label: t.dashboardTransport,
      icon: "car-outline",
      active: "car",
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
      label: t.myActivity,
      icon: "chatbubbles-outline",
      active: "chatbubbles",
    },
    profile: {
      route: "profile",
      label: t.profile,
      icon: "person-outline",
      active: "person",
    },
  };
  const [moreOpen, setMoreOpen] = useState(false);
  const { second, fourth, fifth, more } = tabSlots({
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
  // "More" holds the pages that did not fit; it looks selected while one of
  // them is open.
  const moreFocused = more.includes(current ?? "");
  const moreButton = (
    <Pressable
      key="more"
      accessibilityRole="tab"
      accessibilityLabel={t.tabMore}
      accessibilityState={{ selected: moreFocused, expanded: moreOpen }}
      onPress={() => setMoreOpen(true)}
      style={({ pressed }) => [s.item, pressed && s.pressed]}
    >
      <View
        pointerEvents="none"
        style={[s.indicator, moreFocused && s.indicatorOn]}
      />
      <Ionicons
        accessible={false}
        name={
          moreFocused
            ? "ellipsis-horizontal-circle"
            : "ellipsis-horizontal-circle-outline"
        }
        size={24}
        color={moreFocused ? theme.colors.primary : theme.colors.inactive}
      />
      <Text numberOfLines={1} style={[s.label, moreFocused && s.labelActive]}>
        {t.tabMore}
      </Text>
    </Pressable>
  );
  return (
    <>
      <View
        accessibilityRole="tablist"
        style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}
      >
        {item(slots.home)}
        {item(slots[second])}
        <VoiceTabButton />
        {item(slots[fourth])}
        {fifth === "more" ? moreButton : item(slots[fifth])}
      </View>
      <Modal
        visible={moreOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreOpen(false)}
      >
        <Pressable
          accessibilityLabel={t.cancel}
          style={s.overlay}
          onPress={() => setMoreOpen(false)}
        >
          <Pressable
            accessibilityViewIsModal
            style={[
              s.sheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 8 },
            ]}
          >
            <View style={s.handle} />
            <Text accessibilityRole="header" style={s.sheetTitle}>
              {t.tabMore}
            </Text>
            {more.map((route) => {
              const slot = slots[route];
              const on = current === route;
              return (
                <Pressable
                  key={route}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setMoreOpen(false);
                    if (!on) navigation.navigate(route);
                  }}
                  style={({ pressed }) => [
                    s.row,
                    on && s.rowOn,
                    pressed && s.pressed,
                  ]}
                >
                  <View style={[s.rowIcon, on && s.rowIconOn]}>
                    <Ionicons
                      accessible={false}
                      name={on ? slot.active : slot.icon}
                      size={22}
                      color={on ? theme.colors.primary : theme.colors.steel}
                    />
                  </View>
                  <Text style={[s.rowText, on && s.rowTextOn]}>
                    {slot.label}
                  </Text>
                  <Ionicons
                    accessible={false}
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.inactive}
                  />
                </Pressable>
              );
            })}
            {!!session && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMoreOpen(false);
                  router.push("/activities");
                }}
                style={({ pressed }) => [s.row, pressed && s.pressed]}
              >
                <View style={s.rowIcon}>
                  <Ionicons
                    accessible={false}
                    name="briefcase-outline"
                    size={22}
                    color={theme.colors.steel}
                  />
                </View>
                <Text style={s.rowText}>{t.actTitle}</Text>
                <Ionicons
                  accessible={false}
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.inactive}
                />
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radii.sheet,
    borderTopRightRadius: theme.radii.sheet,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 4,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    marginBottom: 8,
  },
  sheetTitle: {
    ...theme.type.heading,
    color: theme.colors.heading,
    marginBottom: 4,
  },
  row: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 8,
    borderRadius: theme.radii.control,
  },
  rowOn: { backgroundColor: theme.colors.tint },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.steelTint,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconOn: { backgroundColor: theme.colors.surface },
  rowText: { ...theme.type.subheading, color: theme.colors.text, flex: 1 },
  rowTextOn: { color: theme.colors.saffronText },
});
