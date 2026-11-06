import { Redirect, Tabs } from "expo-router";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { coordinatorMessages } from "../../coordinator/i18n";
import { hasCoordinatorRole } from "../../data/accountAccess";
import { GaavliTabBar } from "../../components/GaavliTabBar";

export default function BuyerTabs() {
  const { session, language, browsingVillage } = useAppStore();
  const t = messages(language);
  const coordinator = hasCoordinatorRole(session?.user);
  const c = coordinatorMessages(language);
  if (session && !session.user.village) return <Redirect href="/village" />;
  if (!session && !browsingVillage) return <Redirect href="/language" />;
  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <GaavliTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      {/* GaavliTabBar decides which of these show for each account. */}
      <Tabs.Screen name="home" options={{ title: t.home }} />
      <Tabs.Screen name="marketplace" options={{ title: t.marketplace }} />
      <Tabs.Screen name="my-listings" options={{ title: t.myListings }} />
      <Tabs.Screen name="manage" options={{ title: c.manage }} />
      <Tabs.Screen name="voice" options={{ title: t.voiceSearch }} />
      <Tabs.Screen name="services" options={{ title: t.dashboardServices }} />
      <Tabs.Screen
        name="activity"
        options={{ title: coordinator ? c.activity : t.myActivity }}
      />
      <Tabs.Screen name="profile" options={{ title: t.settings }} />
      <Tabs.Screen name="product/[id]" options={{ href: null }} />
    </Tabs>
  );
}
