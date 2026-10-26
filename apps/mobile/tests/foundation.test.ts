import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { MOBILE_LANGUAGES } from "@gaavli/constants";
import { healthStatusSchema } from "@gaavli/validation";
import { translations } from "../src/i18n";
import {
  restorePreferences,
  confirmLanguage,
  initialRoute,
  type PreferenceStorage,
} from "../src/storage/preferences";
import { ApiError, createApiClient } from "../src/api/client";

test("both languages have complete, non-empty translations", () => {
  for (const language of MOBILE_LANGUAGES) {
    assert.deepEqual(
      Object.keys(translations[language]).sort(),
      Object.keys(translations.en).sort(),
    );
    assert.ok(
      Object.values(translations[language]).every(
        (value) => value.trim().length > 0,
      ),
    );
  }
});
test("first launch is Marathi; a saved language still opens village selection", async () => {
  let saved: string | null = null;
  let village: string | null = null;
  const storage: PreferenceStorage = {
    readHasAuthenticated: async () => null,
    writeHasAuthenticated: async () => undefined,
    clearGuestBrowsing: async () => {
      village = null;
    },
    readLanguage: async () => saved,
    writeLanguage: async (value) => {
      saved = value;
    },
    readGuestVillage: async () => village,
    writeGuestVillage: async (value) => {
      village = value;
    },
  };
  assert.deepEqual(await restorePreferences(storage), {
    language: "mr",
    confirmed: false,
    guestVillage: null,
    hasAuthenticated: false,
  });
  assert.equal(initialRoute(false), "/language");
  await confirmLanguage(storage, "en");
  const restarted = await restorePreferences(storage);
  assert.equal(restarted.language, "en");
  assert.equal(initialRoute(restarted.confirmed), "/language");
  saved = "invalid-language";
  assert.deepEqual(await restorePreferences(storage), {
    language: "mr",
    confirmed: false,
    guestVillage: null,
    hasAuthenticated: false,
  });
});
test("storage failures do not report confirmation and recovery can be retried", async () => {
  let broken = true;
  let saved: string | null = null;
  const storage: PreferenceStorage = {
    readHasAuthenticated: async () => null,
    writeHasAuthenticated: async () => undefined,
    clearGuestBrowsing: async () => undefined,
    readLanguage: async () => {
      if (broken) throw new Error("unavailable");
      return saved;
    },
    writeLanguage: async (value) => {
      if (broken) throw new Error("full");
      saved = value;
    },
    readGuestVillage: async () => null,
    writeGuestVillage: async () => undefined,
  };
  await assert.rejects(restorePreferences(storage));
  await assert.rejects(confirmLanguage(storage, "en"));
  assert.equal(saved, null);
  broken = false;
  await confirmLanguage(storage, "mr");
  assert.deepEqual(await restorePreferences(storage), {
    language: "mr",
    confirmed: true,
    guestVillage: null,
    hasAuthenticated: false,
  });
});
const baseUrl = "https://example.test/api/v1";
function responseClient(payload: unknown, status = 200) {
  return createApiClient({
    baseUrl,
    development: false,
    fetcher: async () => new Response(JSON.stringify(payload), { status }),
  });
}
test("photo upload sends a real file part with bytes; legacy URI-only objects fail before networking", async () => {
  const { photoUploadBody } = await import("../src/data/photoUploadBody");
  const bytes = new Uint8Array([255, 216, 255, 0, 1, 2]);
  const form = photoUploadBody(
    new Blob([bytes], { type: "image/jpeg" }),
    "phone.jpg",
  );
  const request = new Request("https://example.com/photos", {
    method: "POST",
    body: form,
  });
  const parsed = (await request.formData()) as unknown as {
    get(name: string): Blob | string | null;
  };
  const file = parsed.get("photo");
  assert.ok(file instanceof Blob);
  assert.equal(file.type, "image/jpeg");
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), bytes);
  assert.throws(
    () =>
      photoUploadBody(
        {
          uri: "file:///phone.jpg",
          name: "phone.jpg",
          type: "image/jpeg",
        } as unknown as Blob,
        "phone.jpg",
      ),
    /PHOTO_FILE_REQUIRED/,
  );
});

test("photo multipart requests preserve native boundary generation and omit cookies", async () => {
  const photo = new FormData();
  photo.append(
    "photo",
    new Blob(["test"], { type: "image/jpeg" }),
    "photo.jpg",
  );
  const client = createApiClient({
    baseUrl,
    development: false,
    fetcher: async (_url, init) => {
      assert.equal(init?.body, photo);
      assert.equal(new Headers(init?.headers).has("Content-Type"), false);
      assert.equal(init?.credentials, "omit");
      return new Response(
        JSON.stringify({ success: true, data: { status: "ok" } }),
      );
    },
  });
  await client(
    "/listings/photos",
    healthStatusSchema,
    { method: "POST", body: photo },
    60000,
  );
});

test("API validates success and failures without leaking response bodies", async () => {
  assert.deepEqual(
    await responseClient({ success: true, data: { status: "ok" } })(
      "/health",
      healthStatusSchema,
    ),
    { status: "ok" },
  );
  await assert.rejects(
    responseClient({ success: true, data: { status: "broken" } })(
      "/health",
      healthStatusSchema,
    ),
    (error: unknown) =>
      error instanceof ApiError && error.code === "INVALID_RESPONSE",
  );
  await assert.rejects(
    responseClient(
      {
        success: false,
        error: { code: "AUTH_REQUIRED", message: "private server message" },
        requestId: "test-request",
      },
      401,
    )("/health", healthStatusSchema),
    (error: unknown) =>
      error instanceof ApiError &&
      error.code === "AUTH_REQUIRED" &&
      error.status === 401 &&
      error.requestId === "test-request" &&
      !error.message.includes("private"),
  );
  await assert.rejects(
    responseClient({ unexpected: true }, 500)("/health", healthStatusSchema),
    (error: unknown) =>
      error instanceof ApiError && error.code === "HTTP_ERROR",
  );
  const malformed = createApiClient({
    baseUrl,
    development: false,
    fetcher: async () => new Response("<html>error</html>"),
  });
  await assert.rejects(
    malformed("/health", healthStatusSchema),
    (error: unknown) =>
      error instanceof ApiError && error.code === "INVALID_RESPONSE",
  );
});
test("API rejects unsafe configuration before fetching and omits browser cookies", async () => {
  let called = false;
  const fetcher: typeof fetch = async (_url, init) => {
    called = true;
    assert.equal(init?.credentials, "omit");
    return new Response(
      JSON.stringify({ success: true, data: { status: "ok" } }),
    );
  };
  for (const value of [
    undefined,
    "http://example.test/api/v1",
    "https://secret:password@example.test/api/v1",
    "https://example.test/api",
    "https://example.test/api/v1?key=secret",
  ]) {
    await assert.rejects(
      createApiClient({ baseUrl: value, development: false, fetcher })(
        "/health",
        healthStatusSchema,
      ),
    );
  }
  assert.equal(called, false);
  await createApiClient({
    baseUrl: "http://10.0.2.2:3000/api/v1",
    development: true,
    fetcher,
  })("/health", healthStatusSchema);
  assert.equal(called, true);
});
test("API distinguishes timeout, cancellation and network failure", async () => {
  const hanging: typeof fetch = async (_url, init) =>
    new Promise((_resolve, reject) => {
      if (init?.signal?.aborted) {
        reject(new Error("cancelled"));
        return;
      }
      init?.signal?.addEventListener(
        "abort",
        () => reject(new Error("cancelled")),
        { once: true },
      );
    });
  const client = createApiClient({
    baseUrl,
    development: false,
    fetcher: hanging,
    timeoutMs: 15,
  });
  await assert.rejects(
    client("/health", z.unknown()),
    (error: unknown) => error instanceof ApiError && error.code === "TIMEOUT",
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    client("/health", z.unknown(), { signal: controller.signal }),
    (error: unknown) => error instanceof ApiError && error.code === "ABORTED",
  );
  const unavailable = createApiClient({
    baseUrl,
    development: false,
    fetcher: async () => {
      throw new Error("network unavailable");
    },
  });
  await assert.rejects(
    unavailable("/health", healthStatusSchema),
    (error: unknown) =>
      error instanceof ApiError && error.code === "NETWORK_ERROR",
  );
});
