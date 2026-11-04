import { Redirect } from "expo-router";
import { useAppStore } from "../../store";
import ActivityScreen from "../../screens/ActivityScreen";
import { CoordinatorActivityScreen } from "../../coordinator/screens";
import { hasCoordinatorRole } from "../../data/accountAccess";
import { availableDashboardTab } from "../../data/dashboardTabs";
export default function ActivityTab() {
  const session = useAppStore((state) => state.session);
  const selected = useAppStore((state) => state.dashboardTab);
  const coordinator = hasCoordinatorRole(session?.user);
  if (!session) return <Redirect href="/register" />;
  if (!coordinator) return <ActivityScreen />;
  const role = availableDashboardTab(session.user, selected);
  return role === "coordinator" ? (
    <CoordinatorActivityScreen />
  ) : (
    <ActivityScreen
      key={role}
      requestDirection={role === "seller" ? "received" : "sent"}
    />
  );
}
