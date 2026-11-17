import "server-only";
import { romanizeDevanagariWord } from "../../lib/devanagari-transliteration";

// English loanwords have conventional spellings that differ from their sound.
const loanwords = new Map(
  [
    ["tours", "tour", "tur", "turs", "toor", "toors"],
    [
      "travels",
      "travel",
      "trevhal",
      "trevhals",
      "treval",
      "trevals",
      "traival",
      "traivals",
    ],
    ["and", "andd"],
  ].flatMap(([canonical, ...spellings]) =>
    spellings.map((spelling) => [spelling, canonical] as const),
  ),
);

function canonicalWord(word: string) {
  return loanwords.get(word) ?? word;
}

// Query and stored names use the same Latin spellings, so a match works in
// either direction and also when the user combines scripts in one query.
export function directoryNameWordVariants(value: string): string[][] {
  const words =
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\u200c\u200d]/g, "")
      .replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966))
      .match(/[a-z0-9]+|[\u0900-\u0963\u0971-\u097f]+|&/g) ?? [];

  return words
    .map((word) => {
      if (word === "&") return ["and"];
      if (/^[a-z0-9]+$/.test(word)) return [canonicalWord(word)];
      return [
        ...new Set(
          [
            romanizeDevanagariWord(word, "mr"),
            romanizeDevanagariWord(word, "hi"),
            romanizeDevanagariWord(word, "mr", true),
            romanizeDevanagariWord(word, "hi", true),
          ]
            .filter(Boolean)
            .map(canonicalWord),
        ),
      ];
    })
    .filter((variants) => variants.length);
}

export function directoryNameSearchWords(
  ...names: (string | null | undefined)[]
) {
  return [
    ...new Set(
      names.flatMap((name) => directoryNameWordVariants(name ?? "").flat()),
    ),
  ];
}
