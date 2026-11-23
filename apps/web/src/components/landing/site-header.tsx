import Image from "next/image";

const apkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL ?? "#download";

// The public site header. `home` is "" on the landing page itself and "/" on
// other public pages so the section links still reach the landing page.
export function SiteHeader({ home = "" }: { home?: "" | "/" }) {
  return (
    <header className="lp-nav">
      <a className="lp-brand" href={home ? "/" : "#top"}>
        <Image src="/gaavli-logo.png" alt="" width={38} height={38} priority />
        <span>Gaavli</span>
      </a>
      <nav className="lp-nav-links" aria-label="Main navigation">
        <a href={`${home}#modules`}>What&apos;s inside</a>
        <a href={`${home}#how`}>How it works</a>
        <a href={`${home}#faq`}>FAQ</a>
      </nav>
      <div className="lp-nav-cta">
        <a className="lp-link" href="/login">
          Admin
        </a>
        <a
          className="lp-btn lp-btn--primary lp-btn--sm"
          href={home && apkUrl.startsWith("#") ? `/${apkUrl}` : apkUrl}
        >
          Get the app
        </a>
      </div>
    </header>
  );
}
