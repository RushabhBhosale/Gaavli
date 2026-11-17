const base: Record<string, string> = {
  क: "k",
  ख: "kh",
  ग: "g",
  घ: "gh",
  ङ: "n",
  च: "ch",
  छ: "chh",
  ज: "j",
  झ: "jh",
  ञ: "n",
  ट: "t",
  ठ: "th",
  ड: "d",
  ढ: "dh",
  ण: "n",
  त: "t",
  थ: "th",
  द: "d",
  ध: "dh",
  न: "n",
  प: "p",
  फ: "f",
  ब: "b",
  भ: "bh",
  म: "m",
  य: "y",
  र: "r",
  ल: "l",
  ळ: "l",
  व: "v",
  श: "sh",
  ष: "sh",
  स: "s",
  ह: "h",
};
const nukta: Record<string, string> = {
  क: "q",
  ख: "kh",
  ग: "g",
  ज: "z",
  ड: "r",
  ढ: "rh",
  फ: "f",
};
const matra: Record<string, string> = {
  "ा": "a",
  "ि": "i",
  "ी": "i",
  "ु": "u",
  "ू": "u",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au",
  "ृ": "ri",
  "ॅ": "e",
  "ॉ": "o",
  "ॆ": "e",
  "ॊ": "o",
};
const independent: Record<string, string> = {
  अ: "a",
  आ: "a",
  इ: "i",
  ई: "i",
  उ: "u",
  ऊ: "u",
  ए: "e",
  ऐ: "ai",
  ओ: "o",
  औ: "au",
  ऋ: "ri",
  ऑ: "o",
  ऍ: "e",
};
const long: Record<string, string> = { "ी": "ee", "ू": "oo", ई: "ee", ऊ: "oo" };
const labial = new Set(["प", "फ", "ब", "भ", "म"]);

// One spelling per word. `longVowels` spells ी and ू as ee and oo.
export function romanizeDevanagariWord(
  word: string,
  language: "hi" | "mr",
  longVowels = false,
) {
  const chars = [...word.normalize("NFC")];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === "ज" && chars[i + 1] === "्" && chars[i + 2] === "ञ") {
      out += language === "mr" ? "dny" : "gy";
      i += 2;
      const m = matra[chars[i + 1]];
      if (m !== undefined) {
        out += m || "";
        i++;
      } else if (i + 1 < chars.length) out += "a";
      continue;
    }
    if (c in base) {
      let roman = base[c];
      if (chars[i + 1] === "़") {
        roman = nukta[c] ?? roman;
        i++;
      }
      out += roman;
      const next = chars[i + 1];
      if (next === "्") {
        i++;
        continue;
      }
      if (next in matra) {
        out += longVowels && next in long ? long[next] : matra[next];
        i++;
      } else if (i + 1 < chars.length && !"ंँः".includes(next)) out += "a";
      else if (i + 1 < chars.length) out += "a";
      continue;
    }
    if (c in independent) {
      out += longVowels && c in long ? long[c] : independent[c];
      continue;
    }
    if (c === "ं" || c === "ँ") {
      const next = chars[i + 1];
      out += next && labial.has(next) ? "m" : "n";
      continue;
    }
    if (c === "ः") {
      out += "h";
      continue;
    }
    if (/[0-9]/.test(c)) out += c;
  }
  return out;
}
