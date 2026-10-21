import type { MasterProduct, MobileLanguage } from "@gaavli/types";

type ProductName = Pick<
  MasterProduct,
  "code" | "nameEn" | "nameMr" | "productGroup"
>;
// Small fallback vocabulary when the existing reference cache is unavailable.
const basics: ProductName[] = [
  {
    code: "TOMATO",
    nameEn: "Tomato",
    nameMr: "टोमॅटो",
    productGroup: "vegetables",
  },
  {
    code: "ONION",
    nameEn: "Onion",
    nameMr: "कांदा",
    productGroup: "vegetables",
  },
  {
    code: "POTATO",
    nameEn: "Potato",
    nameMr: "बटाटा",
    productGroup: "vegetables",
  },
  { code: "MANGO", nameEn: "Mango", nameMr: "आंबा", productGroup: "fruits" },
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
  return [en, `${en}s`, `${en}es`, words(product.nameMr)];
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
      text: (language === "mr"
        ? match.product.nameMr
        : match.product.nameEn
      ).slice(0, 100),
      productGroup: match.product.productGroup,
    };
  return {
    text: (
      phrase
        .split(" ")
        .filter((word) => !fillers.has(word))
        .join(" ") || phrase
    ).slice(0, 100),
    productGroup: null,
  };
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
  constructor(
    private driver: SpeechDriver | null,
    private callbacks: {
      status: (status: VoiceStatus) => void;
      result: (text: string) => void;
      error: (error: VoiceFailure) => void;
    },
  ) {}
  cancel() {
    ++this.generation;
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
      const permission = await driver.requestPermissions();
      if (!current()) return;
      if (!permission.granted) return fail("permission");
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
      driver.start(language === "mr" ? "mr-IN" : "en-IN", hints.slice(0, 100));
      // Bound recording and finalization, including devices that never emit end.
      if (!current()) return;
      this.timer = setTimeout(() => {
        if (!current()) return;
        this.callbacks.status("processing");
        try {
          driver.stop();
        } catch {
          return fail("failed");
        }
        if (current()) this.timer = setTimeout(() => fail("noSpeech"), 5000);
      }, 15000);
    } catch {
      fail("failed");
    }
  }
}
