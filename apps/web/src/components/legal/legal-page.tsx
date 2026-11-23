import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import type { LegalDocument } from "@/content/legal/types";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import "@/app/landing.css";
import "./legal.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
});
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });

// Renders an approved legal document exactly as supplied: the wording lives in
// src/content/legal and is never edited here. Header and footer are the same
// ones the landing page uses.
export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <div className={`lp ${display.variable} ${body.variable}`}>
      <SiteHeader home="/" />
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
      <SiteFooter home="/" />
    </div>
  );
}
