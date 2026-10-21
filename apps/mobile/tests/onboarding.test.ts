import { test } from "node:test";
import assert from "node:assert/strict";
import type { MobileSession } from "@gaavli/types";
import { initialRoute } from "../src/storage/preferences";
import { persistSession, type SessionStorage } from "../src/storage/session";
import { useAppStore } from "../src/store";
import { errorMessage } from "../src/errors";
import { ApiError } from "../src/api/client";
import { messages } from "../src/i18n";
const session: MobileSession = {
  accessToken: "a".repeat(64),
  refreshToken: "b".repeat(64),
  accessExpiresAt: "2030-01-01T00:00:00.000Z",
  user: {
    id: "account",
    name: "Riya More",
    firstName: "Riya",
    lastName: "More",
    language: "mr",
    village: null,
  },
};
test("a restored verified session resumes village selection, then saved home", () => {
  assert.equal(initialRoute(true, session.user), "/village");
  assert.equal(initialRoute(false, session.user), "/village");
  assert.equal(
    initialRoute(true, {
      ...session.user,
      village: {
        id: "v",
        name: "Palaspe",
        nameMr: "पळस्पे",
        taluka: "Panvel",
        district: "Raigad",
        pinCode: null,
      },
    }),
    "/home",
  );
  assert.equal(initialRoute(false, null), "/language");
});
test("session storage failure never commits authenticated navigation; saving can be retried", async () => {
  let saved: MobileSession | null = null;
  let fail = true;
  let committed = false;
  const storage: SessionStorage = {
    read: async () => saved,
    clear: async () => {
      saved = null;
    },
    write: async (value) => {
      if (fail) throw new Error("storage full");
      saved = value;
    },
  };
  await assert.rejects(
    persistSession(storage, session, () => {
      committed = true;
    }),
  );
  assert.equal(committed, false);
  fail = false;
  await persistSession(storage, session, () => {
    committed = true;
  });
  assert.equal(committed, true);
  assert.equal(initialRoute(true, (await storage.read())?.user), "/village");
});
test("OTP back navigation retains registration details and explicit clear removes them", () => {
  const draft = { firstName: "Riya", lastName: "More", mobile: "9876543210" };
  useAppStore.getState().setDraft(draft);
  useAppStore.getState().setChallenge({
    challengeId: crypto.randomUUID(),
    expiresAt: "2030-01-01T00:00:00.000Z",
    resendAt: "2030-01-01T00:00:00.000Z",
  });
  useAppStore.getState().setChallenge(null);
  assert.deepEqual(useAppStore.getState().draft, draft);
  useAppStore.getState().clearRegistration();
  assert.equal(useAppStore.getState().draft.mobile, "");
});
test("OTP error states are translated without exposing server messages", () => {
  for (const language of ["mr", "en"] as const) {
    assert.equal(
      errorMessage(new ApiError("OTP_INVALID"), language),
      messages(language).otpInvalid,
    );
    assert.equal(
      errorMessage(new ApiError("OTP_EXPIRED"), language),
      messages(language).otpExpired,
    );
    assert.equal(
      errorMessage(new ApiError("RATE_LIMITED"), language),
      messages(language).rateLimited,
    );
  }
});

test("logout-cleared onboarding returns to mobile-only sign-in and mode changes discard old OTP challenges", () => {
  useAppStore.getState().setAuthMode("register");
  useAppStore
    .getState()
    .setDraft({ firstName: "Riya", lastName: "More", mobile: "9876543210" });
  useAppStore.getState().setChallenge({
    challengeId: "old",
    expiresAt: "2030-01-01T00:00:00.000Z",
    resendAt: "2030-01-01T00:00:00.000Z",
  });
  useAppStore.getState().clearRegistration();
  assert.equal(useAppStore.getState().authMode, "login");
  assert.equal(useAppStore.getState().challenge, null);
  assert.deepEqual(useAppStore.getState().draft, {
    firstName: "",
    lastName: "",
    mobile: "",
  });
  useAppStore.getState().setChallenge({
    challengeId: "another",
    expiresAt: "2030-01-01T00:00:00.000Z",
    resendAt: "2030-01-01T00:00:00.000Z",
  });
  useAppStore.getState().setAuthMode("register");
  assert.equal(useAppStore.getState().challenge, null);
  assert.equal(
    errorMessage(new ApiError("REGISTRATION_REQUIRED"), "mr"),
    messages("mr").registrationRequired,
  );
  useAppStore.getState().clearRegistration();
});

test("seller capability is securely persisted and restored without changing identity", async () => {
  let saved: MobileSession | null = null;
  const storage: SessionStorage = {
    read: async () => saved,
    write: async (value) => {
      saved = value;
    },
    clear: async () => {
      saved = null;
    },
  };
  const activated = {
    ...session,
    user: { ...session.user, isSeller: true, coordinatorVillages: [] },
  };
  await persistSession(storage, activated, useAppStore.getState().setSession);
  assert.equal(useAppStore.getState().session?.user.isSeller, true);
  useAppStore.getState().setSession(null);
  useAppStore.getState().setSession(await storage.read());
  assert.deepEqual(useAppStore.getState().session, activated);
  await persistSession(storage, session, useAppStore.getState().setSession);
  assert.equal(useAppStore.getState().session?.user.isSeller, false);
  useAppStore.getState().setSession(null);
});
