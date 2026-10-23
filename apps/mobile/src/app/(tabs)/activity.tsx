import { Redirect } from "expo-router";
import { useAppStore } from "../../store";
import ActivityScreen from "../../screens/ActivityScreen";
import { CoordinatorActivityScreen } from "../../coordinator/screens";
import { hasCoordinatorRole } from "../../data/accountAccess";
export default function ActivityTab() {
  const session = useAppStore((state) => state.session);
  const coordinator = hasCoordinatorRole(session?.user);
  if (!session) return <Redirect href="/register" />;
  return coordinator ? <CoordinatorActivityScreen /> : <ActivityScreen />;
}
