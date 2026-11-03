import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deletionKeys,
  normalizeCatalogTerm,
  withinOneEdit,
  termWords,
  phoneticKey,
  skeletonKey,
  editDistance,
  swapVariants,
  prefixEditDistance,
  maxEdits,
  queryTokens,
} from "../src/server/catalog/search-text";

test("catalog normalization preserves Marathi and Hindi marks", () => {
  assert.equal(normalizeCatalogTerm("  टोमॅटो  "), "टोमॅटो");
  assert.equal(normalizeCatalogTerm("  TOMATO   Leaves "), "tomato leaves");
  assert.equal(normalizeCatalogTerm("टमाटर"), "टमाटर");
});
test("deletion keys retrieve a one-edit candidate and comparisons reject distant words", () => {
  for (const [a, b] of [
    ["tomato", "tomoto"],
    ["potato", "potat"],
    ["tomato", "tomatto"],
  ]) {
    const keys = new Set(deletionKeys(a));
    assert.ok(deletionKeys(b).some((key) => keys.has(key)));
    assert.equal(withinOneEdit(a, b), true);
  }
  assert.equal(withinOneEdit("tomato", "potato"), false);
  assert.deepEqual(deletionKeys("ab"), []);
  assert.deepEqual(deletionKeys("x".repeat(41)), []);
});

test("every word of a multi-word name is searchable on its own", () => {
  assert.deepEqual(termWords("mango pickle"), ["mango", "pickle"]);
  assert.deepEqual(termWords("आम का अचार"), ["आम", "का", "अचार"]);
  assert.deepEqual(termWords("tomato"), []);
  assert.deepEqual(termWords("vitamin a"), ["vitamin"]);
  assert.deepEqual(queryTokens("pickle  mango pickle"), ["pickle", "mango"]);
  assert.equal(queryTokens("a b c d e f").length, 4);
});

test("romanized and Devanagari spelling variants share a sounds-alike key", () => {
  for (const [a, b] of [
    ["kothimbir", "kothimbeer"],
    ["aloo", "alu"],
    ["tamatar", "tamaatar"],
    ["टोमॅटो", "टोमाटो"],
    ["कोथिंबीर", "कोथींबीर"],
    ["शेवगा", "सेवगा"],
  ])
    assert.equal(phoneticKey(a), phoneticKey(b), `${a} ${b}`);
  // Vowel differences meet through the consonant skeleton.
  assert.equal(skeletonKey("kothimbir"), skeletonKey("kothambir"));
  assert.equal(skeletonKey("kothimbir"), skeletonKey("kothmbir"));
  assert.notEqual(skeletonKey("tomato"), skeletonKey("potato"));
  assert.notEqual(phoneticKey("tomato"), phoneticKey("potato"));
  assert.equal(skeletonKey("a"), "");
});

test("typo tolerance grows with word length and counts a swap as one edit", () => {
  assert.deepEqual([3, 4, 6, 7, 12].map(maxEdits), [0, 1, 1, 2, 2]);
  assert.equal(editDistance("tomtao", "tomato", 2), 1);
  assert.equal(editDistance("tomoto", "tomato", 2), 1);
  assert.equal(editDistance("kothmbr", "kothimbir", 2), 2);
  assert.equal(editDistance("tomato", "potato", 1), 2);
  assert.ok(swapVariants("tomtao").includes("tomato"));
  assert.equal(prefixEditDistance("tomt", "tomato"), 1);
  assert.equal(prefixEditDistance("xyzt", "tomato"), 2);
  assert.equal(prefixEditDistance("tomato", "tomato"), 2);
});
