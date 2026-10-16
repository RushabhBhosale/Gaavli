import { redirect } from "next/navigation";
import { currentAdmin } from "@/server/auth/session";
import { AdminShell } from "@/components/layout/admin-shell";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await currentAdmin();
  if (!admin) redirect("/login");
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
