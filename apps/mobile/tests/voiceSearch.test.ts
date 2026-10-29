import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { productMasterImportSchema } from "@gaavli/validation";
import { messages } from "../src/i18n";
import {
  voiceProductSearch,
  voiceFailure,
  VoiceSearchSession,
  type SpeechDriver,
  type VoiceStatus,
  type VoiceFailure,
} from "../src/data/voiceSearch";

test("spoken English/Marathi phrases and plurals resolve through the real Product Master", async () => {
  const products = productMasterImportSchema.parse(
    JSON.parse(
      await readFile(
        new URL("../../web/data/gaavli_product_master.json", import.meta.url),
        "utf8",
      ),
    ),
  );
  for (const [phrase, name, group] of [
    ["मला टोमॅटो पाहिजे", "टोमॅटो", "vegetables"],
    ["कांदा", "कांदा", "vegetables"],
    ["बटाटा", "बटाटा", "vegetables"],
    ["आंबा", "आंबा", "fruits"],
    ["Show me onions!", "कांदा", "vegetables"],
    ["Please find potatoes", "बटाटा", "vegetables"],
    ["Tomatoes", "टोमॅटो", "vegetables"],
    ["I want mangoes", "आंबा", "fruits"],
  ]) {
    assert.deepEqual(voiceProductSearch(phrase, "mr", products), {
      text: name,
      productGroup: group,
    });
  }
  assert.equal(
    voiceProductSearch("Show me onions", "en", products).text,
    "Onion",
  );
  assert.equal(
    voiceProductSearch("मला टोमॅटो पाहिजे", "en", products).text,
    "Tomato",
  );
  assert.equal(
    voiceProductSearch("sweet potatoes", "en", products).text,
    "Sweet Potato",
  );
  assert.deepEqual(voiceProductSearch("Please show me dragonfruit", "en", []), {
    text: "dragonfruit",
    productGroup: null,
  });
  assert.equal(voiceProductSearch("कांदा", "mr").text, "कांदा");
  assert.equal(voiceProductSearch("   ", "mr").text, "");
  assert.equal(voiceProductSearch("x".repeat(180), "en").text.length, 100);
});

function fixture(overrides: Partial<SpeechDriver> = {}) {
  let handlers: Parameters<SpeechDriver["subscribe"]>[0] | undefined;
  const starts: string[] = [],
    results: string[] = [],
    errors: VoiceFailure[] = [],
    statuses: VoiceStatus[] = [];
  let removed = 0,
    aborted = 0;
  const driver: SpeechDriver = {
    available: () => true,
    requestPermissions: async () => ({ granted: true }),
    subscribe: (value) => {
      handlers = value;
      return () => {
        ++removed;
      };
    },
    start: (locale) => {
      starts.push(locale);
    },
    stop: () => {},
    abort: async () => {
      ++aborted;
    },
    ...overrides,
  };
  const session = new VoiceSearchSession(driver, {
    status: (value) => statuses.push(value),
    result: (value) => results.push(value),
    error: (value) => errors.push(value),
  });
  return {
    session,
    starts,
    results,
    errors,
    statuses,
    events: () => handlers!,
    removed: () => removed,
    aborted: () => aborted,
  };
}

test("recognition uses selected locale, ignores interim results and submits a final result once", async () => {
  const f = fixture();
  await f.session.start("mr");
  assert.deepEqual(f.starts, ["mr-IN"]);
  assert.equal(f.statuses.at(-1), "listening");
  const events = f.events();
  events.result("टोमॅटो", false);
  assert.equal(f.results.length, 0);
  events.result("मला टोमॅटो पाहिजे", true);
  events.result("duplicate", true);
  events.end();
  assert.deepEqual(f.results, ["मला टोमॅटो पाहिजे"]);
  assert.deepEqual(f.errors, []);
  assert.equal(f.removed(), 1);
  assert.equal(f.aborted(), 1);
  assert.equal(f.statuses.at(-1), "idle");
  await f.session.start("en");
  assert.equal(f.starts.at(-1), "en-IN");
  f.session.cancel();
});

test("denied permission, unavailable service and a missing native build never start a recording", async () => {
  const denied = fixture({
    requestPermissions: async () => ({ granted: false }),
  });
  await denied.session.start("en");
  assert.deepEqual(denied.starts, []);
  assert.deepEqual(denied.errors, ["permission"]);
  const unavailable = fixture({ available: () => false });
  await unavailable.session.start("mr");
  assert.deepEqual(unavailable.starts, []);
  assert.deepEqual(unavailable.errors, ["unavailable"]);
  const failures: VoiceFailure[] = [];
  await new VoiceSearchSession(null, {
    status: () => {},
    result: () => assert.fail(),
    error: (error) => failures.push(error),
  }).start("en");
  assert.deepEqual(failures, ["build"]);
});

test("cancel during permission request prevents recording even if permission is later granted", async () => {
  let grant!: (value: { granted: boolean }) => void;
  let requested!: () => void;
  const requesting = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const f = fixture({
    requestPermissions: () =>
      new Promise((resolve) => {
        grant = resolve;
        requested();
      }),
  });
  const start = f.session.start("mr");
  await requesting;
  f.session.cancel();
  grant({ granted: true });
  await start;
  assert.deepEqual(f.starts, []);
  assert.deepEqual(f.errors, []);
});

test("recording and finalization timeouts stop the microphone and clean up a silent recognizer", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let stopped = 0;
  const f = fixture({
    stop: () => {
      ++stopped;
    },
  });
  await f.session.start("en");
  t.mock.timers.tick(15000);
  assert.equal(stopped, 1);
  assert.equal(f.statuses.at(-1), "processing");
  t.mock.timers.tick(5000);
  assert.deepEqual(f.errors, ["noSpeech"]);
  assert.equal(f.statuses.at(-1), "idle");
  assert.equal(f.removed(), 1);
});

test("Android permission backgrounding waits for foreground before recording", async () => {
  let grant!: (permission: { granted: boolean }) => void;
  let requested!: () => void;
  const requesting = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const f = fixture({
    requestPermissions: () =>
      new Promise((resolve) => {
        grant = resolve;
        requested();
      }),
  });
  const start = f.session.start("en");
  await requesting;
  f.session.setForeground(false);
  grant({ granted: true });
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(f.starts, []);
  assert.equal(f.statuses.at(-1), "requesting");
  f.session.setForeground(true);
  await start;
  assert.deepEqual(f.starts, ["en-IN"]);
  f.events().result("onion", true);
  assert.deepEqual(f.results, ["onion"]);
  assert.deepEqual(f.errors, []);
});

test("permission handoff never starts after cancellation or prolonged backgrounding", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const cancel of [true, false]) {
    let grant!: (permission: { granted: boolean }) => void;
    let requested!: () => void;
    const requesting = new Promise<void>((resolve) => {
      requested = resolve;
    });
    const f = fixture({
      requestPermissions: () =>
        new Promise((resolve) => {
          grant = resolve;
          requested();
        }),
    });
    const start = f.session.start("mr");
    await requesting;
    f.session.setForeground(false);
    grant({ granted: true });
    await Promise.resolve();
    await Promise.resolve();
    if (cancel) f.session.cancel();
    else t.mock.timers.tick(5000);
    await start;
    f.session.setForeground(true);
    assert.deepEqual(f.starts, []);
    assert.equal(f.statuses.at(-1), "idle");
  }
});

test("backgrounding during recording still aborts and rejects late recognition", async () => {
  const f = fixture();
  await f.session.start("en");
  const events = f.events();
  f.session.setForeground(false);
  events.result("onion", true);
  f.session.setForeground(true);
  assert.equal(f.aborted(), 1);
  assert.equal(f.statuses.at(-1), "idle");
  assert.deepEqual(f.results, []);
});

test("blur, background or manual cancellation ignores late speech events and removes listeners", async () => {
  const f = fixture();
  await f.session.start("en");
  const events = f.events();
  f.session.cancel();
  events.result("onion", true);
  events.error("no-speech");
  events.end();
  assert.deepEqual(f.results, []);
  assert.deepEqual(f.errors, []);
  assert.equal(f.removed(), 1);
  assert.equal(f.aborted(), 1);
});

test("a new request waits for the previous native recognition session to finish aborting", async () => {
  let finish!: () => void;
  const f = fixture({
    abort: () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  });
  await f.session.start("en");
  const previous = f.events();
  const next = f.session.start("mr");
  previous.result("old text", true);
  await Promise.resolve();
  assert.deepEqual(f.starts, ["en-IN"]);
  finish();
  await next;
  assert.deepEqual(f.starts, ["en-IN", "mr-IN"]);
  assert.deepEqual(f.results, []);
  f.session.cancel();
  finish();
});

test("empty/final/no-match/end and native errors have localized user-facing states", async () => {
  for (const event of [
    "empty",
    "nomatch",
    "end",
    "no-speech",
    "not-allowed",
    "network",
    "language-not-supported",
    "service-not-allowed",
    "audio-capture",
    "busy",
    "interrupted",
  ]) {
    const f = fixture();
    await f.session.start("mr");
    if (event === "empty") f.events().result(" ", true);
    else if (event === "nomatch") f.events().nomatch();
    else if (event === "end") f.events().end();
    else f.events().error(event);
    assert.equal(
      f.errors[0],
      ["empty", "nomatch", "end"].includes(event)
        ? "noSpeech"
        : voiceFailure(event),
    );
    assert.equal(f.statuses.at(-1), "idle");
  }
  for (const language of ["mr", "en"] as const) {
    const copy = messages(language);
    for (const key of [
      "voiceListening",
      "voicePermission",
      "voiceService",
      "voiceNetwork",
      "voiceNoSpeech",
      "voiceLanguage",
      "voiceFailed",
      "voiceBuild",
      "voiceCancel",
      "noListingMatches",
    ] as const)
      assert.ok(copy[key].trim());
  }
});

test("native start exceptions clean up listeners and return to idle", async () => {
  const f = fixture({
    start: () => {
      throw new Error("native failure");
    },
  });
  await f.session.start("mr");
  assert.deepEqual(f.errors, ["failed"]);
  assert.equal(f.removed(), 1);
  assert.equal(f.statuses.at(-1), "idle");
});
