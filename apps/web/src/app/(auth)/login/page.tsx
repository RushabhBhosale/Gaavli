import { redirect } from "next/navigation";
import Image from "next/image";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata } from "next";
import { currentAdmin } from "@/server/auth/session";
import { LoginForm } from "@/features/auth/login-form";
import { BRAND_TAGLINE_MR } from "@/components/shared/brand";
import "./login.css";

// The sign-in page borrows the public landing typography so the portal feels
// like the same product. Only this route loads the display face.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
});
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Admin sign in · Gaavli",
  description: "Sign in to the Gaavli administration portal.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <main className={`auth ${display.variable} ${body.variable}`}>
      <div className="auth-shell">
        <aside className="auth-brand" aria-label="Gaavli admin portal">
          <Image
            className="auth-brand-art"
            src="/landing-farm.webp"
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 560px"
            priority
          />
          <div className="auth-brand-veil" aria-hidden="true" />
          <div className="auth-brand-content">
            <div className="auth-logo">
              <Image
                src="/gaavli-logo.png"
                alt=""
                width={44}
                height={44}
                priority
              />
              <span>
                Gaavli
                <small>Admin portal</small>
              </span>
            </div>

            <div>
              <p className="auth-eyebrow">Connecting dots, connecting people</p>
              <h1>
                Manage today for a <em>stronger rural tomorrow.</em>
              </h1>
              <p className="auth-brand-lede">
                One place for villages, sellers, services and the people who
                keep them connected.
              </p>
              <ul className="auth-points">
                <li>Village-first directory with mapped nearby villages</li>
                <li>Verified coordinators, listings and provider records</li>
                <li>Marathi, Hindi and English, held consistently</li>
              </ul>
            </div>

            <p className="auth-brand-foot">
              <span className="auth-dot" aria-hidden="true" />
              <span lang="mr">{BRAND_TAGLINE_MR}</span>
            </p>
          </div>
        </aside>

        <section className="auth-form">
          <div className="auth-form-inner">
            <div className="auth-mobile-brand">
              <Image
                src="/gaavli-logo.png"
                alt=""
                width={36}
                height={36}
                priority
              />
              <span>
                Gaavli
                <small>Admin portal</small>
              </span>
            </div>
            <LoginForm />
            <p className="auth-foot">
              Authorised access only. Admin actions are recorded in the audit
              log.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
