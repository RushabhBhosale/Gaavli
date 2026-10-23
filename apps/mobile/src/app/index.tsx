import { Redirect } from "expo-router";
import { useAppStore } from "../store";
import { initialRoute } from "../storage/preferences";

export default function Index() {
  const confirmed = useAppStore((state) => state.confirmed);
  const session = useAppStore((state) => state.session);
  const guestVillage = useAppStore((state) => state.guestVillage);
  return (
    <Redirect href={initialRoute(confirmed, session?.user, guestVillage)} />
  );
}
