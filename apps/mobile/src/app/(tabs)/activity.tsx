import { useAppStore } from "../../store";
import ActivityScreen from "../../screens/ActivityScreen";
import { CoordinatorActivityScreen } from "../../coordinator/screens";
import { hasCoordinatorRole } from "../../data/accountAccess";
export default function ActivityTab() {
  const coordinator = useAppStore((state) =>
    hasCoordinatorRole(state.session?.user),
  );
  return coordinator ? <CoordinatorActivityScreen /> : <ActivityScreen />;
}
