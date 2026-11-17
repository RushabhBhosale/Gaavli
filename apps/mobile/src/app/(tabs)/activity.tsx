import { Redirect } from "expo-router";
import { useAppStore } from "../../store";
import ActivityScreen from "../../screens/ActivityScreen";

// Requests and notifications for everyone, coordinators included. A
// coordinator's village action log lives on the Manage page.
export default function ActivityTab() {
  const session = useAppStore((state) => state.session);
  if (!session) return <Redirect href="/register" />;
  return <ActivityScreen />;
}
