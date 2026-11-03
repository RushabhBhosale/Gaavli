import { editDistance, maxEdits } from "@gaavli/utils";

export { editDistance, maxEdits };

// Shared by indexing and querying. Keep combining marks (including Devanagari)
// intact; removing them changes the spelling and meaning of Indian names.
export function normalizeCatalogTerm(value: string) {
  return value.normalize("NFKC").toLowerCase().trim().replace(/\s+/gu, " ");
}

const MIN_WORD_LENGTH = 2;
export const MAX_QUERY_TOKENS = 4;

// Every word of a multi-word term ("mango pickle" -> mango, pickle), so a
// product can be found by any word in its name, in any order. Single-word terms
// are already the term itself.
export function termWords(value: string) {
  const words = value.split(" ");
  if (words.length < 2) return [];
  return [
    ...new Set(
      words.filter((word) => Array.from(word).length >= MIN_WORD_LENGTH),
    ),
  ];
}

export function queryTokens(value: string) {
  return [...new Set(value.split(" ").filter(Boolean))].slice(
    0,
    MAX_QUERY_TOKENS,
  );
}

export function deletionKeys(value: string) {
  const chars = Array.from(value);
  if (chars.length < 3 || chars.length > 40) return [];
  return [
    ...new Set([
      value,
      ...chars.map((_, i) =>
        [...chars.slice(0, i), ...chars.slice(i + 1)].join(""),
      ),
    ]),
  ];
}

// Two deletions from a short query. Matched against stored one-deletions this
// finds terms up to two edits away without storing more keys per term.
export function twoDeletionKeys(value: string) {
  const chars = Array.from(value);
  if (chars.length < 7 || chars.length > 12) return [];
  const keys = new Set<string>();
  for (let i = 0; i < chars.length; i++)
    for (let j = i + 1; j < chars.length; j++)
      keys.add(chars.filter((_, k) => k !== i && k !== j).join(""));
  return [...keys];
}

// Neighbouring letters swapped ("tomtao" -> "tomato"): exact lookups only.
export function swapVariants(value: string) {
  const chars = Array.from(value);
  if (chars.length < 3 || chars.length > 40) return [];
  const variants = new Set<string>();
  for (let i = 0; i < chars.length - 1; i++) {
    if (chars[i] === chars[i + 1]) continue;
    const copy = [...chars];
    [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
    variants.add(copy.join(""));
  }
  return [...variants];
}

// A typo inside what the person is still typing: compare with the same-length
// start of the term (plus or minus one letter).
export function prefixEditDistance(query: string, term: string) {
  const length = Array.from(query).length;
  const chars = Array.from(term);
  if (chars.length <= length) return 2;
  let best = 2;
  for (const n of [length - 1, length, length + 1])
    if (n >= 3 && n < chars.length)
      best = Math.min(best, editDistance(query, chars.slice(0, n).join(""), 1));
  return best;
}

// At most one insertion, deletion or substitution. Work is bounded by the
// input length and comparison is over Unicode code points, not UTF-16 units.
export function withinOneEdit(left: string, right: string) {
  const a = Array.from(left),
    b = Array.from(right);
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + Number(i < a.length || j < b.length) <= 1;
}

// Sounds-alike keys. Romanized Marathi and Hindi have no standard spelling
// (kothimbir, kothambir, kothimbeer; aloo, alu) and Devanagari has near-equal
// signs (ि/ी, श/ष/स, ण/न), so both scripts are reduced to a spelling-neutral
// form. This is a lookup aid only; results are still checked by edit distance.
const DEVANAGARI = /[ऀ-ॿ]/u;
const DEVANAGARI_MAP: Record<string, string> = {
  "ी": "ि",
  "ू": "ु",
  "ँ": "ं",
  "ॅ": "ा",
  "ॉ": "ो",
  ण: "न",
  ङ: "न",
  ञ: "न",
  ळ: "ल",
  ष: "स",
  श: "स",
  ई: "इ",
  ऊ: "उ",
  ऑ: "ओ",
  ऍ: "ए",
  ऩ: "न",
  ऱ: "र",
};
const DEVANAGARI_VOWELS = /[ऀ-औऺ-्ॕ-ॗॢॣ]/u;

function devanagariKey(word: string) {
  return Array.from(
    word.replace(/[़‌‍]/gu, ""),
    (char) => DEVANAGARI_MAP[char] ?? char,
  )
    .join("")
    .replace(/(.)\1+/gu, "$1");
}

function latinKey(word: string) {
  return word
    .replace(/ch/g, "\u0001")
    .replace(/c/g, "k")
    .replace(/\u0001/g, "c")
    .replace(/sh/g, "s")
    .replace(/ph/g, "f")
    .replace(/([tdbkgj])h/g, "$1")
    .replace(/w/g, "v")
    .replace(/z/g, "j")
    .replace(/q/g, "k")
    .replace(/x/g, "ks")
    .replace(/aa+/g, "a")
    .replace(/ee+|ii+|ie/g, "i")
    .replace(/oo+|uu+|ou/g, "u")
    .replace(/(.)\1+/g, "$1");
}

export function phoneticKey(value: string) {
  return value
    .split(" ")
    .map((word) =>
      DEVANAGARI.test(word) ? devanagariKey(word) : latinKey(word),
    )
    .join(" ");
}

// Consonant skeleton of one word: vowels (and vowel signs) dropped after the
// first letter, so missing or swapped vowels still meet. Empty when too short
// to be selective.
export function skeletonKey(value: string) {
  if (value.includes(" ")) return "";
  const key = phoneticKey(value);
  const chars = Array.from(key);
  const drop = DEVANAGARI.test(key) ? DEVANAGARI_VOWELS : /[aeiouy]/;
  const skeleton =
    (chars[0] ?? "") +
    chars
      .slice(1)
      .filter((char) => !drop.test(char))
      .join("");
  const collapsed = skeleton.replace(/(.)\1+/gu, "$1");
  return Array.from(collapsed).length >= 2 ? collapsed : "";
}
