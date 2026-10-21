import { Redirect, useRouter } from "expo-router";
import ActivityScreen from "../../screens/ActivityScreen";
import { useAppStore } from "../../store";
export default function PersonalRequests() {
  const { session } = useAppStore();
  const router = useRouter();
  if (!session) return <Redirect href="/register" />;
  return (
    <ActivityScreen
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/home")
      }
    />
  );
}
