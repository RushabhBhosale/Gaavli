import { Redirect, useRouter } from "expo-router";
import ActivityScreen from "../screens/ActivityScreen";
import { useAppStore } from "../store";

export default function Notifications() {
  const session = useAppStore((state) => state.session);
  const router = useRouter();
  if (!session) return <Redirect href="/register" />;
  if (!session.user.village) return <Redirect href="/village" />;
  return (
    <ActivityScreen
      initialDirection="received"
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/home")
      }
    />
  );
}
