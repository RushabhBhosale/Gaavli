import { Redirect, Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { coordinatorMessages } from "../../coordinator/i18n";
import { hasCoordinatorRole } from "../../data/accountAccess";

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
          paddingTop: 6,
          height: Math.max(70, 38 + 32 * fontScale) + insets.bottom,
        },
        tabBarItemStyle: { minHeight: theme.layout.touchTarget },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.home,
          tabBarLabel: ({ color }) => (
            <Text
              style={{
                color,
                fontSize: 10,
                includeFontPadding: true,
                paddingVertical: 2,
                textAlign: "center",
              }}
            >
              {t.home}
            </Text>
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          href: session ? null : undefined,
          title: t.marketplace,
          tabBarLabel: ({ color }) => (
            <Text
              style={{
                color,
                fontSize: 10,
                includeFontPadding: true,
                paddingVertical: 2,
                textAlign: "center",
              }}
            >
              {t.marketplace}
            </Text>
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "storefront" : "storefront-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="my-listings"
        options={{
          href: !coordinator && session?.user.isSeller ? undefined : null,
          title: t.myListings,
          tabBarLabel: ({ color }) => (
            <Text
              style={{
                color,
                fontSize: 10,
                includeFontPadding: true,
                paddingVertical: 2,
                textAlign: "center",
              }}
            >
              {t.myListings}
            </Text>
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "list" : "list-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          href: coordinator ? undefined : null,
          title: c.manage,
          tabBarLabel: ({ color }) => (
            <Text
              style={{
                color,
                fontSize: 10,
                includeFontPadding: true,
                paddingVertical: 2,
                textAlign: "center",
              }}
            >
              {c.manage}
            </Text>
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "grid" : "grid-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          href: session ? undefined : null,
          title: coordinator ? c.activity : t.myActivity,
          tabBarLabel: ({ color }) => (
            <Text
              style={{
                color,
                fontSize: 10,
                includeFontPadding: true,
                paddingVertical: 2,
                textAlign: "center",
              }}
            >
              {coordinator ? c.activity : t.myActivity}
            </Text>
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "receipt" : "receipt-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.settings,
          tabBarLabel: ({ color }) => (
            <Text
              style={{
                color,
                fontSize: 10,
                includeFontPadding: true,
                paddingVertical: 2,
                textAlign: "center",
              }}
            >
              {t.settings}
            </Text>
          ),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen name="product/[id]" options={{ href: null }} />
    </Tabs>
  );
}
