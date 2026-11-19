import Image from "next/image";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./landing.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700"] });
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });

const apkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL ?? "#download";

const modules = [
  { key: "marketplace", name: "Marketplace", text: "Vegetables, grains, fruit and everyday goods from sellers in your village.", icon: "🛒", photo: "/landing/tomato.webp" },
  { key: "services", name: "Services", text: "Electricians, tailors, tutors and more. People you can call directly.", icon: "🛠️" },
  { key: "transport", name: "Transport", text: "Autos, buses and local rides, with the number one tap away.", icon: "🚌" },
  { key: "activities", name: "Activities", text: "Events, notices and what is happening around you this week.", icon: "📣" },
];

const steps = [
  { n: "1", title: "Pick your village", text: "Choose where you are. Nearby mapped villages are included automatically." },
  { n: "2", title: "Find what you need", text: "Search products, services and transport. See what is open right now." },
  { n: "3", title: "Call or send a request", text: "Reach the person directly. Payment and delivery stay between you." },
];

const faqs = [
  ["Can I browse without registering?", "Yes. Pick a village and browse first. You register only when you want to contact a seller or provider."],
  ["Does Gaavli take payments or manage delivery?", "No. Gaavli connects people directly. Payment and delivery stay between the people involved."],
  ["Which languages are supported?", "Marathi, Hindi and English, with a language choice that stays with you."],
  ["Which villages can I see?", "You start with one browsing village and also see directly mapped, active nearby villages."],
];

function Phone({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`lp-phone ${className}`} aria-hidden="true">
      <div className="lp-phone-notch" />
      <div className="lp-phone-screen">{children}</div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className={`lp ${display.variable} ${body.variable}`} id="top">
      <header className="lp-nav">
        <a className="lp-brand" href="#top">
          <Image src="/gaavli-logo.png" alt="" width={38} height={38} priority />
          <span>Gaavli</span>
        </a>
        <nav className="lp-nav-links" aria-label="Main navigation">
          <a href="#modules">What&apos;s inside</a>
          <a href="#how">How it works</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="lp-nav-cta">
          <a className="lp-link" href="/login">Admin</a>
          <a className="lp-btn lp-btn--primary lp-btn--sm" href={apkUrl}>Get the app</a>
        </div>
      </header>

      <section className="lp-hero" aria-labelledby="hero-title">
        <div className="lp-hero-copy">
          <p className="lp-pill"><span /> आपलं गाव, आपली माणसं, आपली जोडणी!</p>
          <h1 id="hero-title">Your village, <em>closer than ever.</em></h1>
          <p className="lp-lede">
            Products, services, transport and people around you, in one simple app.
            Browse first, then call the person directly.
          </p>
          <div className="lp-actions">
            <a className="lp-btn lp-btn--primary" href={apkUrl}>Download for Android <span aria-hidden="true">↓</span></a>
            <a className="lp-btn lp-btn--ghost" href="#how">See how it works</a>
          </div>
          <ul className="lp-trust">
            <li>Marathi · Hindi · English</li>
            <li>Free to browse</li>
            <li>No middlemen</li>
          </ul>
        </div>

        <div className="lp-hero-visual">
          <div className="lp-hero-art">
            <Image src="/landing-farm.webp" alt="" fill sizes="(max-width: 900px) 100vw, 560px" priority />
          </div>
          <Phone className="lp-phone--hero">
            <div className="lp-app-hero">
              <div className="lp-app-top"><b>Gaavli</b><span>⌖ Kalamb ⌄</span></div>
              <p>Good morning</p>
              <h2>What do you need today?</h2>
              <div className="lp-app-search">⌕ Search products, services…</div>
            </div>
            <div className="lp-app-body">
              <div className="lp-app-label">Explore your village</div>
              <div className="lp-app-grid">
                {modules.map((m) => (
                  <div key={m.key} className={`lp-app-tile lp-m-${m.key}`}>
                    <span>{m.icon}</span>
                    <b>{m.name}</b>
                  </div>
                ))}
              </div>
              <div className="lp-app-note"><i /> <b>Kalamb</b> is your browsing village</div>
            </div>
          </Phone>
          <div className="lp-float lp-float--a"><i>✓</i><span><b>Ravi Kirana</b><small>Open now · 0.8 km</small></span></div>
          <div className="lp-float lp-float--b"><span className="lp-dot" /> 12 sellers nearby</div>
        </div>
      </section>

      <section className="lp-modules" id="modules" aria-labelledby="modules-title">
        <div className="lp-head">
          <p className="lp-eyebrow">What&apos;s inside</p>
          <h2 id="modules-title">One village, four ways to find help.</h2>
        </div>
        <div className="lp-module-grid">
          {modules.map((m) => (
            <article key={m.key} className={`lp-module lp-m-${m.key}`}>
              <span className="lp-module-icon">{m.icon}</span>
              <h3>{m.name}</h3>
              <p>{m.text}</p>
              {m.photo && <Image className="lp-module-photo" src={m.photo} alt="" width={120} height={120} />}
            </article>
          ))}
        </div>
      </section>

      <section className="lp-showcase" aria-labelledby="show-title">
        <div className="lp-showcase-phones">
          <Phone className="lp-phone--a">
            <div className="lp-band lp-m-marketplace-band"><b>Marketplace</b><span>Kalamb ⌄</span></div>
            <div className="lp-app-body">
              <div className="lp-app-search">⌕ Search for anything</div>
              {[
                ["Tomatoes", "Ravi Kirana · 0.8 km", "₹30/kg", "/landing/tomato.webp"],
                ["Alphonso mango", "Patil Farm · 1.4 km", "₹400/dz", "/landing/mango.webp"],
                ["Onions", "Shinde Stores · 2.1 km", "₹25/kg", "/landing/onion.webp"],
              ].map(([n, s, p, img]) => (
                <div className="lp-listing" key={n}>
                  <Image src={img} alt="" width={44} height={44} />
                  <span><b>{n}</b><small>{s}</small></span>
                  <strong>{p}</strong>
                </div>
              ))}
            </div>
          </Phone>
          <Phone className="lp-phone--b">
            <div className="lp-band lp-m-services-band"><b>Services</b><span>Kalamb ⌄</span></div>
            <div className="lp-app-body">
              {[["Tailoring", "Meena Tai", "Open"], ["Electrician", "Suresh Pawar", "Open"], ["Home tutor", "Anita Jadhav", "Busy"]].map(([n, s, st]) => (
                <div className="lp-listing" key={n}>
                  <i className="lp-avatar">{s[0]}</i>
                  <span><b>{n}</b><small>{s}</small></span>
                  <strong className={st === "Open" ? "is-open" : "is-busy"}>{st}</strong>
                </div>
              ))}
              <div className="lp-call">📞 Call Meena Tai</div>
            </div>
          </Phone>
        </div>
        <div className="lp-showcase-copy">
          <p className="lp-eyebrow">Discover</p>
          <h2 id="show-title">The local answer is usually closer than you think.</h2>
          <p>
            See the people, products and services already around you. Mapped nearby villages
            are included, so a useful answer does not stop at a boundary.
          </p>
          <ul className="lp-checks">
            <li>Live “open now” status</li>
            <li>Distance on every listing</li>
            <li>Call directly, no commission</li>
          </ul>
          <a className="lp-btn lp-btn--steel" href={apkUrl}>Open Gaavli <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="lp-how" id="how" aria-labelledby="how-title">
        <div className="lp-head lp-head--light">
          <p className="lp-eyebrow">How it works</p>
          <h2 id="how-title">Start with where you are.</h2>
          <p>No account needed to browse. Register once when you find the right person.</p>
        </div>
        <ol className="lp-steps">
          {steps.map((s) => (
            <li key={s.n}><span>{s.n}</span><h3>{s.title}</h3><p>{s.text}</p></li>
          ))}
        </ol>
      </section>

      <section className="lp-bento" aria-labelledby="bento-title">
        <div className="lp-head">
          <p className="lp-eyebrow">Made for real village life</p>
          <h2 id="bento-title">Useful by design.</h2>
        </div>
        <div className="lp-bento-grid">
          <div className="lp-bento-card lp-bento-card--wide"><h3>Marathi, Hindi and English</h3><p>Use the language that feels like home. Your choice stays with you.</p><div className="lp-langs"><span>मराठी</span><span>हिन्दी</span><span>English</span></div></div>
          <div className="lp-bento-card lp-bento-card--blue"><h3>Guest browsing first</h3><p>Look around before you decide to join.</p></div>
          <div className="lp-bento-card lp-bento-card--green"><h3>Direct contact</h3><p>Gaavli stays out of the transaction.</p></div>
          <div className="lp-bento-card lp-bento-card--saffron lp-bento-card--wide"><h3>One village view</h3><p>Instead of scattered phone numbers and word of mouth, everything local sits in one place.</p></div>
          <div className="lp-bento-card lp-bento-card--steel lp-bento-card--wide"><h3>Free to browse, always</h3><p>No sign-up wall. Open the app, pick a village and start looking.</p></div>
        </div>
      </section>

      <section className="lp-faq" id="faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Before you begin</h2>
        <div>
          {faqs.map(([q, a]) => (
            <details key={q}><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </section>

      <section className="lp-cta" id="download" aria-labelledby="cta-title">
        <div className="lp-cta-copy">
          <h2 id="cta-title">Bring your village with you.</h2>
          <p>Download Gaavli for Android and make the local network easier to find, use and grow.</p>
          <a className="lp-btn lp-btn--primary" href={apkUrl}>Download the Android APK <span aria-hidden="true">↓</span></a>
        </div>
        <Image className="lp-cta-art" src="/landing-village.webp" alt="" fill sizes="100vw" />
      </section>

      <footer className="lp-footer">
        <a className="lp-brand" href="#top"><Image src="/gaavli-logo.png" alt="" width={34} height={34} /><span>Gaavli</span></a>
        <span>Connecting dots, connecting people.</span>
        <nav aria-label="Footer navigation"><a href="#modules">What&apos;s inside</a><a href="#how">How it works</a><a href="/login">Admin sign in</a></nav>
        <small>© 2026 Gaavli</small>
      </footer>
    </main>
  );
}
