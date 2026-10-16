import { redirect } from "next/navigation";
import { currentAdmin } from "@/server/auth/session";
import { LoginForm } from "@/features/auth/login-form";
import { Brand } from "@/components/shared/brand";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await currentAdmin()) redirect("/");
  return (
    <main className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
      <div className="card grid min-h-[620px] w-full max-w-5xl overflow-hidden md:grid-cols-[.9fr_1.1fr]">
        <section className="relative isolate hidden overflow-hidden md:block">
          <div aria-hidden="true" className="rural-scene">
            <div className="hill back" />
            <div className="hill" />
            <div className="tree" style={{ left: "12%" }} />
            <div className="tree" style={{ right: "8%", bottom: "26%" }} />
            <div className="house" />
            <div className="hill front" />
            <div className="fields" />
          </div>
          <div className="relative z-10 px-8 pt-16">
            <Brand large />
            <p className="mx-auto mt-7 max-w-52 text-center text-xl font-semibold leading-snug text-emerald-950">
              Manage Today
              <br />
              for a Stronger
              <br />
              Rural Tomorrow.
            </p>
          </div>
        </section>
        <section className="flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-white to-slate-50 p-5 sm:p-12">
          <div className="md:hidden">
            <Brand large />
          </div>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
