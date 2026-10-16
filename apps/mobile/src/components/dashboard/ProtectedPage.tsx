import type { ReactNode } from "react";
import { Redirect } from "expo-router";
import { useAppStore } from "../../store";

export function ProtectedPage({ children }: { children: ReactNode }) {
  const session = useAppStore((state) => state.session);
  if (!session) return <Redirect href="/register" />;
  if (!session.user.village) return <Redirect href="/village" />;
  return children;
}
