import Link from "next/link";
import { EmptyState } from "@/components/shared/states";
export default function ForgotPassword() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <EmptyState
        title="Password recovery coming soon"
        description="Contact your platform administrator to recover access."
      />
      <Link href="/login" className="mt-5 block text-center text-emerald-800">
        Back to sign in
      </Link>
    </main>
  );
}
