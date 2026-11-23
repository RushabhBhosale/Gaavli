export type LegalBlock =
  | { type: "title" | "h2" | "h3" | "p"; text: string }
  | { type: "ul" | "ol"; items: string[] };

export type LegalDocument = {
  label: string;
  footer: string;
  blocks: LegalBlock[];
};
