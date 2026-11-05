import { test } from "node:test";
import assert from "node:assert/strict";
import { MOBILE_LANGUAGES } from "@gaavli/constants";
import { translations } from "../src/i18n";
import { coordinatorTranslations } from "../src/coordinator/i18n";
import { localName, numberLocale, productDisplayName } from "../src/locale";

const tomato = { en: "Tomato", mr: "टोमॅटो", hi: "टमाटर" };

test("product names follow the selected language with an English fallback", () => {
  assert.equal(productDisplayName("en", tomato), "Tomato");
  assert.equal(productDisplayName("mr", tomato), "टोमॅटो");
  assert.equal(productDisplayName("hi", tomato), "टमाटर");
  assert.equal(productDisplayName("hi", { ...tomato, hi: null }), "Tomato");
  assert.equal(productDisplayName("mr", { ...tomato, mr: "" }), "Tomato");
});

test("places keep Devanagari spelling for Hindi readers", () => {
  assert.equal(localName("hi", "Kalamb", "कळंब"), "कळंब");
  assert.equal(localName("en", "Kalamb", "कळंब"), "Kalamb");
  assert.equal(localName("hi", "Kalamb", null), "Kalamb");
  assert.equal(numberLocale("hi"), "hi-IN");
});

test("Hindi is a full app language with every message and placeholder", () => {
  assert.deepEqual([...MOBILE_LANGUAGES].sort(), ["en", "hi", "mr"]);
  const placeholders = (text: string) =>
    (text.match(/\{\w+\}/g) || []).sort().join();
  for (const dictionary of [translations, coordinatorTranslations]) {
    const en = dictionary.en as Record<string, string>;
    const hi = dictionary.hi as Record<string, string>;
    assert.deepEqual(Object.keys(hi).sort(), Object.keys(en).sort());
    for (const [key, text] of Object.entries(en)) {
      assert.ok(hi[key]?.trim(), key);
      assert.equal(placeholders(hi[key]), placeholders(text), key);
    }
  }
});
