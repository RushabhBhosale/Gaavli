import { Redirect, Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, useWindowDimensions, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { coordinatorMessages } from "../../coordinator/i18n";
import { hasCoordinatorRole } from "../../data/accountAccess";

const tabLabel = (text: string) =>
  function TabLabel({
    color,
    focused,
  }: {
    color: ColorValue;
    focused: boolean;
  }) {
    return (
      <Text
        numberOfLines={1}
        style={{
          color,
          fontSize: 12,
          lineHeight: 18,
          fontWeight: focused ? "700" : "500",
          includeFontPadding: true,
          textAlign: "center",
        }}
      >
        {text}
      </Text>
    );
  };

export default function BuyerTabs() {
  const { session, language, browsingVillage } = useAppStore();
  const t = messages(language);
  const coordinator = hasCoordinatorRole(session?.user);
  const c = coordinatorMessages(language);
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (session && !session.user.village) return <Redirect href="/village" />;
  if (!session && !browsingVillage) return <Redirect href="/language" />;
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.inactive,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          elevation: 0,
          paddingTop: 8,
          height: Math.max(68, 36 + 30 * fontScale) + insets.bottom,
        },
        tabBarItemStyle: { minHeight: theme.layout.touchTarget },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.home,
          tabBarLabel: tabLabel(t.home),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          href: session ? null : undefined,
          title: t.marketplace,
          tabBarLabel: tabLabel(t.marketplace),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "storefront" : "storefront-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="my-listings"
        options={{
          href: !coordinator && session?.user.isSeller ? undefined : null,
          title: t.myListings,
          tabBarLabel: tabLabel(t.myListings),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "list" : "list-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          href: coordinator ? undefined : null,
          title: c.manage,
          tabBarLabel: tabLabel(c.manage),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "grid" : "grid-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          href: session ? undefined : null,
          title: coordinator ? c.activity : t.myActivity,
          tabBarLabel: tabLabel(coordinator ? c.activity : t.myActivity),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "receipt" : "receipt-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.settings,
          tabBarLabel: tabLabel(t.settings),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen name="product/[id]" options={{ href: null }} />
    </Tabs>
  );
}
