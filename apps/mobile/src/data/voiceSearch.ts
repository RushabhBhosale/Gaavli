import { productDisplayName, speechLocale } from "../locale";
import type { MasterProduct, MobileLanguage } from "@gaavli/types";
import { editDistance, maxEdits } from "@gaavli/utils";
import { PRODUCE_ALIASES } from "./produceAliases";

type ProductName = Pick<
  MasterProduct,
  "code" | "nameEn" | "nameMr" | "productGroup"
> & { nameHi?: string | null };
// Small fallback vocabulary when the existing reference cache is unavailable.
const basics: ProductName[] = [
  {
    code: "TOMATO",
    nameEn: "Tomato",
    nameMr: "टोमॅटो",
    nameHi: "टमाटर",
    productGroup: "vegetables",
  },
  {
    code: "ONION",
    nameEn: "Onion",
    nameMr: "कांदा",
    nameHi: "प्याज",
    productGroup: "vegetables",
  },
  {
    code: "POTATO",
    nameEn: "Potato",
    nameMr: "बटाटा",
    nameHi: "आलू",
    productGroup: "vegetables",
  },
  {
    code: "MANGO",
    nameEn: "Mango",
    nameMr: "आंबा",
    nameHi: "आम",
    productGroup: "fruits",
  },
];
function words(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function aliases(product: ProductName) {
  const en = words(product.nameEn);
  return [
    en,
    `${en}s`,
    `${en}es`,
    words(product.nameMr),
    ...(product.nameHi ? [words(product.nameHi)] : []),
  ];
}
const fillers = new Set([
  "show",
  "me",
  "find",
  "search",
  "for",
  "i",
  "want",
  "need",
  "some",
  "please",
  "buy",
  "मला",
  "पाहिजे",
  "पाहिजेत",
  "दाखवा",
  "हवे",
  "हवी",
  "हवेत",
  "आहे",
  "आहेत",
  "शोधा",
  "कृपया",
  "दिखाओ",
  "चाहिए",
  "ढूंढो",
  "है",
]);
export function voiceProductSearch(
  transcript: string,
  language: MobileLanguage,
  products: ProductName[] = [],
) {
  const phrase = words(transcript);
  if (!phrase) return { text: "", productGroup: null };
  const catalog = new Map(basics.map((product) => [product.code, product]));
  products.forEach((product) => catalog.set(product.code, product));
  const matches = [...catalog.values()]
    .flatMap((product) =>
      aliases(product).flatMap((alias) => {
        const index = ` ${phrase} `.indexOf(` ${alias} `);
        return index < 0 ? [] : [{ product, alias, index }];
      }),
    )
    .sort((a, b) => b.alias.length - a.alias.length || a.index - b.index);
  const match = matches[0];
  if (match)
    return {
      text: productDisplayName(language, {
        en: match.product.nameEn,
        mr: match.product.nameMr,
        hi: match.product.nameHi,
      }).slice(0, 100),
      productGroup: match.product.productGroup,
    };
  const content =
    phrase
      .split(" ")
      .filter((word) => !fillers.has(word))
      .join(" ") || phrase;
  const known = knownProduce(content);
  if (known)
    return {
      text: productDisplayName(language, {
        en: known.en,
        mr: known.mr,
        hi: known.hi,
      }).slice(0, 100),
      productGroup: known.productGroup,
    };
  return { text: content.slice(0, 100), productGroup: null };
}

// "kanda" is onion; a close spelling ("kaanda", "pyaaz") is too. Whole words
// only, so a sentence never matches by accident.
function knownProduce(content: string) {
  const padded = ` ${content} `;
  let best: { entry: (typeof PRODUCE_ALIASES)[number]; length: number } | null =
    null;
  for (const entry of PRODUCE_ALIASES)
    for (const alias of entry.aliases)
      if (padded.includes(` ${alias} `) && alias.length > (best?.length ?? 0))
        best = { entry, length: alias.length };
  if (best) return best.entry;
  const word = content;
  if (word.includes(" ") || Array.from(word).length < 4) return null;
  const allowed = Math.min(1, maxEdits(Array.from(word).length));
  if (!allowed) return null;
  return (
    PRODUCE_ALIASES.find((entry) =>
      entry.aliases.some(
        (alias) =>
          !alias.includes(" ") &&
          Array.from(alias).length >= 4 &&
          editDistance(word, alias, allowed) <= allowed,
      ),
    ) ?? null
  );
}

// Words the speech engine should listen for, in addition to product names.
export function produceVoiceHints() {
  return PRODUCE_ALIASES.flatMap((entry) => entry.aliases.slice(0, 2));
}

export type VoiceFailure =
  | "permission"
  | "unavailable"
  | "noSpeech"
  | "network"
  | "language"
  | "failed"
  | "build";
export function voiceFailure(code: string): VoiceFailure {
  if (code === "not-allowed") return "permission";
  if (["no-speech", "speech-timeout"].includes(code)) return "noSpeech";
  if (code === "network") return "network";
  if (code === "language-not-supported") return "language";
  if (code === "service-not-allowed") return "unavailable";
  return "failed";
}

export type VoiceStatus = "idle" | "requesting" | "listening" | "processing";
type SpeechHandlers = {
  result: (transcript: string, final: boolean) => void;
  error: (code: string) => void;
  end: () => void;
  nomatch: () => void;
};
export type SpeechDriver = {
  ready?: () => Promise<void>;
  available: () => boolean;
  requestPermissions: () => Promise<{ granted: boolean }>;
  subscribe: (handlers: SpeechHandlers) => () => void;
  start: (locale: string, hints: string[]) => void;
  stop: () => void;
  abort: () => Promise<void>;
};

// Independent of React/native APIs so permission, cancellation and late-event
// races can be verified without a microphone or a device speech service.
export class VoiceSearchSession {
  private generation = 0;
  private running = false;
  private unsubscribe?: () => void;
  private timer?: ReturnType<typeof setTimeout>;
  private drain = Promise.resolve();
  private foreground = true;
  private requestingPermission = false;
  private resume?: (foreground: boolean) => void;
  private resumeTimer?: ReturnType<typeof setTimeout>;
  private finishNow?: () => void;
  constructor(
    private driver: SpeechDriver | null,
    private callbacks: {
      status: (status: VoiceStatus) => void;
      result: (text: string) => void;
      error: (error: VoiceFailure) => void;
    },
  ) {}
  setForeground(foreground: boolean) {
    this.foreground = foreground;
    if (foreground) this.resume?.(true);
    // Android permission activities can temporarily background the app. No
    // recording exists yet; wait for permission and foreground before starting.
    else if (!this.requestingPermission) this.cancel();
  }
  // Stop listening now and use what was heard (press-and-hold release). Does
  // nothing before listening starts, so a quick release acts like a tap.
  finish() {
    this.finishNow?.();
  }
  cancel() {
    ++this.generation;
    this.finishNow = undefined;
    this.requestingPermission = false;
    this.resume?.(false);
    this.resume = undefined;
    clearTimeout(this.resumeTimer);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    clearTimeout(this.timer);
    if (this.running && this.driver) {
      this.running = false;
      this.drain = this.driver.abort().catch(() => undefined);
    }
    this.callbacks.status("idle");
  }
  async start(language: MobileLanguage, hints: string[] = []) {
    this.cancel();
    const generation = ++this.generation;
    const current = () => generation === this.generation;
    const fail = (error: VoiceFailure) => {
      if (!current()) return;
      this.cancel();
      this.callbacks.error(error);
    };
    this.callbacks.status("requesting");
    try {
      await this.drain;
      if (!current()) return;
      const driver = this.driver;
      if (!driver) return fail("build");
      await driver.ready?.();
      if (!current()) return;
      if (!driver.available()) return fail("unavailable");
      this.requestingPermission = true;
      let permission: { granted: boolean };
      try {
        permission = await driver.requestPermissions();
      } finally {
        if (current()) this.requestingPermission = false;
      }
      if (!current()) return;
      if (!permission.granted) return fail("permission");
      if (!this.foreground) {
        const resumed = await new Promise<boolean>((resolve) => {
          this.resume = resolve;
          this.resumeTimer = setTimeout(() => resolve(false), 5000);
        });
        if (!current()) return;
        this.resume = undefined;
        clearTimeout(this.resumeTimer);
        if (!resumed) return this.cancel();
      }
      this.unsubscribe = driver.subscribe({
        result: (text, final) => {
          if (!current() || !final) return;
          if (!text.trim()) return fail("noSpeech");
          this.cancel();
          this.callbacks.result(text.trim());
        },
        error: (code) => {
          if (code === "aborted") {
            if (current()) this.cancel();
          } else fail(voiceFailure(code));
        },
        end: () => fail("noSpeech"),
        nomatch: () => fail("noSpeech"),
      });
      this.running = true;
      this.callbacks.status("listening");
      driver.start(speechLocale(language), hints.slice(0, 100));
      // Bound recording and finalization, including devices that never emit end.
      if (!current()) return;
      const finish = () => {
        if (!current() || this.finishNow !== finish) return;
        this.finishNow = undefined;
        clearTimeout(this.timer);
        this.callbacks.status("processing");
        try {
          driver.stop();
        } catch {
          return fail("failed");
        }
        if (current()) this.timer = setTimeout(() => fail("noSpeech"), 5000);
      };
      this.finishNow = finish;
      this.timer = setTimeout(finish, 15000);
    } catch {
      fail("failed");
    }
  }
}

// Marketplace filters that a product group can open directly; others show All.
const MARKETPLACE_CATEGORIES = new Set([
  "vegetables",
  "fruits",
  "grain",
  "dairy",
  "homemade",
]);
export function marketplaceCategory(productGroup: string | null | undefined) {
  return productGroup && MARKETPLACE_CATEGORIES.has(productGroup)
    ? productGroup
    : "all";
}

// Opens the Marketplace already searching for what was typed or spoken
// elsewhere (Home search box, bottom-bar mic). "v" makes a repeat search for
// the same words apply again.
export function marketplaceSearchRoute(
  text: string,
  productGroup?: string | null,
) {
  return {
    pathname: "/marketplace" as const,
    params: {
      q: text.trim().slice(0, 100),
      category: marketplaceCategory(productGroup),
      v: String(Date.now()),
    },
  };
}
