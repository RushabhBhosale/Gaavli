import Image from "next/image";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import type { LegalDocument } from "@/content/legal/types";
import "./legal.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
});
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });

// Renders an approved legal document exactly as supplied: the wording lives in
// src/content/legal and is never edited here.
export function LegalPage({
  document,
  current,
}: {
  document: LegalDocument;
  current: "privacy" | "terms";
}) {
  return (
    <div className={`legal ${display.variable} ${body.variable}`}>
      <header className="legal-bar">
        <a className="legal-brand" href="/">
          <Image
            src="/gaavli-logo.png"
            alt=""
            width={34}
            height={34}
            priority
          />
          <span>Gaavli</span>
        </a>
        <nav aria-label="Legal documents">
          <a
            href="/privacy-policy"
            aria-current={current === "privacy" ? "page" : undefined}
          >
            Privacy Policy
          </a>
          <a
            href="/terms-and-conditions"
            aria-current={current === "terms" ? "page" : undefined}
          >
            Terms &amp; Conditions
          </a>
        </nav>
      </header>
      <main className="legal-doc">
        <p className="legal-label">{document.label}</p>
        {document.blocks.map((block, index) => {
          switch (block.type) {
            case "title":
              return <h1 key={index}>{block.text}</h1>;
            case "h2":
              return <h2 key={index}>{block.text}</h2>;
            case "h3":
              return <h3 key={index}>{block.text}</h3>;
            case "p":
              return <p key={index}>{block.text}</p>;
            case "ul":
              return (
                <ul key={index}>
                  {block.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              );
            case "ol":
              return (
                <ol key={index}>
                  {block.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              );
          }
        })}
      </main>
      <footer className="legal-footer">{document.footer}</footer>
    </div>
  );
}
