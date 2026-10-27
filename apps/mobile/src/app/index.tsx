import { Redirect } from "expo-router";
import { useAppStore } from "../store";
import { initialRoute } from "../storage/preferences";

export default function Index() {
  const hasAuthenticated = useAppStore((state) => state.hasAuthenticated);
  const confirmed = useAppStore((state) => state.confirmed);
  const session = useAppStore((state) => state.session);
  const browsingVillage = useAppStore((state) => state.browsingVillage);
  return (
    <Redirect
      href={initialRoute(
        confirmed,
        session?.user,
        browsingVillage,
        hasAuthenticated,
      )}
    />
  );
}
