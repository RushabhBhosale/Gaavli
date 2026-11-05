// Writes data/catalog/source/58-generated-aliases.txt: extra search words for
// every product, derived only from its names so the file can be regenerated at
// any time. Read-only apart from that file.
//   - Latin spellings of the Hindi and Marathi names ("कांदा बियाणे" -> kanda biyane)
//   - the English name with everyday Hindi/Marathi words swapped in (tur for pigeon pea)
//   - seed words (seed, beej, biyane) for seed products
//   - release codes written without spaces (hd2967)
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../data/catalog/", import.meta.url));
const MAX_ALIASES = 10;

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
function latin(word: string, language: "hi" | "mr", longVowels = false) {
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
function latinName(name: string, language: "hi" | "mr", longVowels = false) {
  return name
    .split(/[\s\-/()&,.]+/)
    .filter(Boolean)
    .map((word) => latin(word, language, longVowels))
    .filter(Boolean)
    .join(" ");
}

// Everyday words people type, by English word or phrase.
const synonyms: Record<string, string[]> = {
  "pigeon pea": ["tur", "toor", "arhar"],
  "green gram": ["moong", "mung", "mug"],
  "black gram": ["urad", "udid"],
  chickpea: ["chana", "harbhara", "gram"],
  lentil: ["masoor"],
  "horse gram": ["kulthi", "hulga"],
  "moth bean": ["matki", "moth"],
  cowpea: ["lobia", "chavli"],
  "field pea": ["matar", "vatana"],
  "green peas": ["matar", "vatana"],
  "french beans": ["farasbi", "beans"],
  "cluster beans": ["gavar", "guar"],
  "lablab bean": ["val", "ghevda", "sem"],
  "bottle gourd": ["lauki", "dudhi"],
  "bitter gourd": ["karela", "karle"],
  "ridge gourd": ["turai", "dodka"],
  "sponge gourd": ["ghosale", "gilki"],
  "snake gourd": ["padwal", "chichinda"],
  "ash gourd": ["petha", "kohla"],
  pumpkin: ["kaddu", "bhopla"],
  cucumber: ["kheera", "kakdi"],
  watermelon: ["tarbooz", "kalingad"],
  muskmelon: ["kharbuja", "kharbuj"],
  brinjal: ["eggplant", "baingan", "vangi"],
  okra: ["lady finger", "bhindi", "bhendi"],
  tomato: ["tamatar"],
  potato: ["aloo", "batata"],
  onion: ["kanda", "pyaz"],
  garlic: ["lasun", "lahsun"],
  ginger: ["adrak", "ale"],
  coriander: ["dhania", "kothimbir"],
  spinach: ["palak"],
  fenugreek: ["methi"],
  cabbage: ["kobi", "patta gobi"],
  cauliflower: ["fulkobi", "phool gobi", "gobi"],
  carrot: ["gajar"],
  radish: ["mooli", "mula"],
  beetroot: ["beet", "chukandar"],
  capsicum: ["shimla mirch", "dhobli mirchi", "bell pepper"],
  "green chilli": ["hirvi mirchi", "hari mirch", "chili"],
  "dry red chilli": ["sukhi mirchi", "lal mirch"],
  drumstick: ["shevga", "sahjan", "moringa"],
  "sweet corn": ["makka", "corn"],
  maize: ["makka", "makai", "corn", "maka"],
  wheat: ["gehun", "gahu"],
  paddy: ["dhan", "bhat", "rice"],
  rice: ["chawal", "tandul", "bhat"],
  barley: ["jau", "jav"],
  sorghum: ["jowar", "jwari"],
  "pearl millet": ["bajra", "bajri"],
  "finger millet": ["ragi", "nachni"],
  "foxtail millet": ["rala", "kangni"],
  "little millet": ["sava", "kutki"],
  "kodo millet": ["kodra", "kodo"],
  "barnyard millet": ["varai", "sanwa"],
  amaranth: ["rajgira", "ramdana", "math"],
  groundnut: ["peanut", "moongphali", "bhuimug", "shengdana"],
  sunflower: ["surajmukhi", "suryaphool"],
  mustard: ["sarson", "rai", "mohri"],
  sesame: ["til"],
  soybean: ["soyabean", "soya"],
  turmeric: ["haldi", "halad"],
  mango: ["aam", "amba"],
  banana: ["kela", "keli"],
  grapes: ["angur", "draksha"],
  pomegranate: ["anar", "dalimb"],
  papaya: ["papita", "papai"],
  guava: ["amrud", "peru"],
  orange: ["santra"],
  lemon: ["nimbu", "limbu"],
  jackfruit: ["kathal", "phanas"],
  sapota: ["chikoo", "chiku"],
  "custard apple": ["sitaphal"],
  coconut: ["nariyal", "naral"],
  apple: ["seb", "safarchand"],
  pear: ["nashpati", "nashpati"],
  strawberry: ["strawberi"],
  litchi: ["lichi"],
  fig: ["anjeer", "anjir"],
  pineapple: ["ananas", "ananas"],
  jaggery: ["gur", "gud", "gul"],
  milk: ["doodh", "dudh"],
  curd: ["dahi"],
  buttermilk: ["chaas", "taak"],
  ghee: ["tup"],
  "sweet potato": ["shakarkand", "ratale"],
  oil: ["tel"],
  flour: ["atta", "peeth"],
  pickle: ["achar", "lonche"],
  sweet: ["mithai"],
  sugarcane: ["ganna", "us"],
  cotton: ["kapas", "kapus"],
  fodder: ["chara"],
  plant: ["paudha", "rop"],
  sapling: ["paudha", "rop"],
  seedling: ["rop", "paudha"],
  vegetables: ["sabzi", "bhaji", "bhajipala"],
  fruits: ["phal", "fale"],
  thali: ["meal"],
  chicken: ["murgi", "kombdi"],
  mutton: ["gosht", "mutton"],
  fish: ["machhi", "mach", "masa"],
  egg: ["anda", "ande"],
  rotti: ["roti", "bhakri"],
  biryani: ["biriyani", "briyani"],
  paratha: ["parantha", "parotha"],
  halwa: ["halva"],
  laddu: ["ladoo", "ladu"],
  barfi: ["burfi", "barfee"],
  chutney: ["chatni"],
  samosa: ["samosa"],
  dosa: ["dosai", "dose"],
  idli: ["idly"],
  vada: ["wada", "vade"],
  pakora: ["pakoda", "bhajiya", "bhaji"],
  kheer: ["payasam", "payas"],
  poha: ["pohe", "aval"],
};
const seedWords = ["seed", "beej", "biyane"];

const catalog = JSON.parse(await readFile(`${dir}catalog.v1.json`, "utf8")) as {
  products: {
    productCode: string;
    names: { en: string; hi: string; mr: string };
  }[];
};
const clean = (value: string) =>
  value.toLowerCase().replace(/\s+/g, " ").trim();
const lines: string[] = [
  "# Generated by scripts/generate-catalog-aliases.mts from the product names. Do not edit by hand.",
];
let total = 0;
let products = 0;
for (const { productCode, names } of catalog.products) {
  const en = clean(names.en);
  const found = new Set<string>();
  const add = (value: string) => {
    const alias = clean(value)
      .replace(/[^\p{L}\p{N} ]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    const deduped = alias.replace(/\b(\S+)( \1\b)+/g, "$1");
    if (deduped && deduped !== en && deduped.length <= 100) found.add(deduped);
  };
  // Latin spellings of the native names, then the long-vowel spelling.
  // Names with a release code (GNG 663) keep only the English-letter code.
  if (!/\d/.test(names.en))
    for (const [language, name] of [
      ["hi", names.hi],
      ["mr", names.mr],
    ] as const) {
      add(latinName(name, language));
      add(latinName(name, language, true));
    }
  // Seed products: seed, beej, biyane in place of "seeds".
  const seeds = /\bseeds$/.test(en);
  const stem = seeds ? en.replace(/\s*seeds$/, "") : en;
  if (seeds) for (const word of seedWords) add(`${stem} ${word}`);
  // Everyday names in place of the English crop word.
  const padded = ` ${stem} `;
  let swaps = 0;
  for (const [word, others] of Object.entries(synonyms)) {
    if (!padded.includes(` ${word} `)) continue;
    for (const other of others.slice(0, 3)) {
      if (padded.includes(` ${other} `)) continue;
      add(padded.replace(` ${word} `, ` ${other} `));
      if (seeds)
        add(
          `${padded.replace(` ${word} `, ` ${other} `).trim()} ${seedWords[1]}`,
        );
      if (seeds)
        add(
          `${padded.replace(` ${word} `, ` ${other} `).trim()} ${seedWords[2]}`,
        );
    }
    if (++swaps >= 2) break;
  }
  // Release codes without spaces: hd 2967 -> hd2967.
  const code = stem.match(/^([a-z]{1,6}) ?-?(\d{1,5}[a-z]?)\b/);
  if (code) add(`${code[1]}${code[2]}`);
  const list = [...found].slice(0, MAX_ALIASES);
  if (list.length) {
    lines.push(`@alias|${productCode}|${list.join(",")}`);
    total += list.length;
    products++;
  }
}
await writeFile(
  `${dir}source/58-generated-aliases.txt`,
  `${lines.join("\n")}\n`,
);
console.log(JSON.stringify({ products, aliases: total }));
