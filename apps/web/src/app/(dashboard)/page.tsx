import { requireAdmin } from "@/server/auth/session";
import { Dashboard } from "@/features/dashboard/dashboard";
export default async function DashboardPage() {
  return <Dashboard admin={await requireAdmin()} />;
}
