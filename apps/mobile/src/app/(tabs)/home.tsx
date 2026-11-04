import { useLocalSearchParams } from "expo-router";
import HomeScreen from "../../screens/HomeScreen";
import { CoordinatorManageScreen } from "../../coordinator/screens";
import { homeDashboardTab } from "../../data/dashboardTabs";
import { useAppStore } from "../../store";

export default function DashboardHome() {
  const account = useAppStore((state) => state.session?.user);
  const { dashboard } = useLocalSearchParams<{
    dashboard?: string | string[];
  }>();
  return homeDashboardTab(account, dashboard) === "coordinator" ? (
    <CoordinatorManageScreen />
  ) : (
    <HomeScreen />
  );
}
