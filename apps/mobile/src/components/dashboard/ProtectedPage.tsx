import type { ReactNode } from "react";
import { Redirect } from "expo-router";
import { useAppStore } from "../../store";

export function ProtectedPage({
  children,
  allowGuest = false,
}: {
  children: ReactNode;
  allowGuest?: boolean;
}) {
  const session = useAppStore((state) => state.session);
  const browsingVillage = useAppStore((state) => state.browsingVillage);
  if (session && !session.user.village) return <Redirect href="/village" />;
  if (!session) {
    if (allowGuest && browsingVillage) return children;
    return <Redirect href={allowGuest ? "/language" : "/register"} />;
  }
  return children;
}
