// A loose sound-alike key, so "tours", "Tours" and "टूर्स" find each other.
// Devanagari is turned into Latin letters, then vowels are dropped and similar
// consonants are merged: "दिशा टूर्स अँड ट्रॅव्हल्स" and "disha tours and
// travels" end up with overlapping keys. It is for matching, not for display.
const CONSONANTS: Record<string, string> = {
  क: "k", ख: "k", ग: "g", घ: "g", ङ: "n",
  च: "c", छ: "c", ज: "j", झ: "j", ञ: "n",
  ट: "t", ठ: "t", ड: "d", ढ: "d", ण: "n",
  त: "t", थ: "t", द: "d", ध: "d", न: "n",
  प: "p", फ: "f", ब: "b", भ: "b", म: "m",
  य: "y", र: "r", ल: "l", ळ: "l", व: "v",
  श: "s", ष: "s", स: "s", ह: "h",
  क़: "k", ख़: "k", ग़: "g", ज़: "j", ड़: "d", ढ़: "d", फ़: "f",
};

const ORDINARY: Record<string, string> = {
  w: "v", c: "k", q: "k", z: "j", x: "ks", f: "f", ph: "f",
};

export function phoneticKey(text: string): string {
  let out = "";
  for (const ch of text.normalize("NFC").toLowerCase()) {
    if (CONSONANTS[ch]) out += CONSONANTS[ch];
    else if (/[a-z]/.test(ch)) out += ch;
    else if (/\s/.test(ch)) out += " ";
  }
  return out
    .replace(/ph/g, "f")
    .replace(/(?<=[a-z])h/g, "") // th, dh, sh, kh, bh, ch ...
    .replace(/[wcqzx]/g, (letter) => ORDINARY[letter] ?? letter)
    .replace(/[aeiouy]/g, "") // Latin vowels carry no key
    .replace(/(.)\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
// Keys for every word of some text, joined: what a record stores to be found.
export function phoneticKeys(...texts: (string | null | undefined)[]) {
  return texts
    .filter((text): text is string => !!text)
    .map((text) => text.split(/\s+/).map(phoneticKey).filter(Boolean).join(" "))
    .filter(Boolean)
    .join(" ");
}
