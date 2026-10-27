import { test } from "node:test";
import assert from "node:assert/strict";
import type { MobileSession } from "@gaavli/types";
import {
  initialRoute,
  postAuthHref,
  restorePreferences,
} from "../src/storage/preferences";
import { limitIndianMobileInput } from "../src/data/mobileInput";
import { parseOtpRequest } from "../src/data/otpRequest";
import {
  clearSessionForGuest,
  persistSession,
  type SessionStorage,
} from "../src/storage/session";
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
  const browsingVillage = {
    id: "village",
    name: "Palaspe",
    nameMr: "पळस्पे",
    taluka: "Panvel",
    district: "Raigad",
    pinCode: null,
  };
  assert.equal(initialRoute(true, null, browsingVillage), "/home");
  assert.equal(postAuthHref(session.user, "a".repeat(24)), "/village");
  assert.equal(
    postAuthHref(
      { ...session.user, village: browsingVillage },
      "ab".repeat(12),
    ),
    `/product/${"ab".repeat(12)}`,
  );
  assert.equal(
    postAuthHref(
      { ...session.user, village: browsingVillage },
      "not-a-listing",
    ),
    "/home",
  );
  assert.equal(
    postAuthHref({ ...session.user, village: browsingVillage, isSeller: true }),
    "/my-listings",
  );
  assert.equal(
    initialRoute(true, {
      ...session.user,
      village: browsingVillage,
      isCoordinator: true,
    }),
    "/manage",
  );
});
test("registration preserves the selected product through session publication and cleanup", async () => {
  const previous = useAppStore.getState();
  const listingId = "ab".repeat(12);
  const village = {
    id: "village",
    name: "Palaspe",
    nameMr: "पळस्पे",
    taluka: "Panvel",
    district: "Raigad",
    pinCode: null,
  };
  const storage: SessionStorage = {
    read: async () => null,
    write: async () => undefined,
    clear: async () => undefined,
  };
  try {
    useAppStore.setState({ session: null, browsingVillage: village });
    useAppStore.getState().setAuthMode("register");
    useAppStore.getState().setContactReturn(listingId);
    await persistSession(storage, session, useAppStore.getState().setSession);
    assert.equal(useAppStore.getState().contactReturnListingId, listingId);
    assert.equal(postAuthHref(session.user, listingId), "/village");

    const confirmed = { ...session, user: { ...session.user, village } };
    await persistSession(storage, confirmed, useAppStore.getState().setSession);
    useAppStore.getState().clearRegistration();
    const state = useAppStore.getState();
    assert.equal(state.contactReturnListingId, listingId);
    for (const role of [{}, { isSeller: true }, { isCoordinator: true }])
      assert.equal(
        postAuthHref(
          { ...state.session!.user, ...role },
          state.contactReturnListingId,
        ),
        `/product/${listingId}`,
      );
  } finally {
    useAppStore.setState(previous);
  }
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

test("mobile entry keeps at most 10 digits", () => {
  assert.equal(limitIndianMobileInput("98765"), "98765");
  assert.equal(limitIndianMobileInput("98765432109"), "9876543210");
  assert.equal(limitIndianMobileInput("+91 98765-43210"), "9876543210");
  assert.equal(limitIndianMobileInput("91987654321099"), "9876543210");
});
test("create account sends both names and sign-in sends only the mobile number", () => {
  const draft = { firstName: "Riya", lastName: "More", mobile: "9876543210" };
  const created = parseOtpRequest("register", draft, "mr");
  assert.equal(created.success, true);
  if (!created.success) return;
  assert.equal(JSON.stringify(created.data).includes("Riya"), true);
  assert.equal(JSON.stringify(created.data).includes("More"), true);
  const signedIn = parseOtpRequest("login", draft, "en");
  assert.equal(signedIn.success, true);
  if (!signedIn.success) return;
  assert.equal(JSON.stringify(signedIn.data).includes("Riya"), false);
  assert.equal(
    parseOtpRequest("register", { ...draft, firstName: "" }, "mr").success,
    false,
  );
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

test("login history never overrides village onboarding or selected guest browsing", async () => {
  const { restorePreferences, confirmLanguage } =
    await import("../src/storage/preferences");
  let flag: string | null = null;
  const storage = {
    readHasAuthenticated: async () => flag,
    writeHasAuthenticated: async () => {
      flag = "true";
    },
    readLanguage: async () => "mr",
    writeLanguage: async () => undefined,
    readGuestVillage: async () => null,
    readBrowsingVillage: async () => null,
    writeBrowsingVillage: async () => undefined,
    clearGuestBrowsing: async () => undefined,
  };
  assert.equal((await restorePreferences(storage)).hasAuthenticated, false);
  assert.equal(initialRoute(false, null, null, false), "/language");
  await storage.writeHasAuthenticated();
  const preferences = await confirmLanguage(storage, "mr");
  assert.equal(preferences.hasAuthenticated, true);
  assert.equal(
    initialRoute(true, null, null, preferences.hasAuthenticated),
    "/language",
  );
  useAppStore.getState().restore(preferences);
  useAppStore.getState().clearRegistration();
  assert.equal(useAppStore.getState().hasAuthenticated, true);
  assert.equal(useAppStore.getState().authMode, "login");
  assert.equal(initialRoute(true, null, { id: "v" } as never, true), "/home");
  assert.equal(
    parseOtpRequest(
      "login",
      { firstName: "", lastName: "", mobile: "123" },
      "en",
    ).success,
    false,
  );
  assert.equal(
    errorMessage(new ApiError("REGISTRATION_REQUIRED"), "en"),
    "This mobile number is not registered. Please register first.",
  );
});

test("buyer and seller logout clears durable credentials, guest selections and auth state before guest navigation", async () => {
  const previous = useAppStore.getState();
  try {
    for (const isSeller of [false, true]) {
      const village = {
        id: "a".repeat(24),
        name: "Nere",
        nameMr: "नेरे",
        taluka: "Panvel",
        district: "Raigad",
        pinCode: null,
      };
      const registered = {
        ...session,
        user: { ...session.user, village, isSeller, coordinatorVillages: [] },
      };
      let saved: MobileSession | null = registered;
      let guest: string | null = JSON.stringify(village);
      let browse: string | null = guest;
      const storage: SessionStorage = {
        read: async () => saved,
        write: async (value) => {
          saved = value;
        },
        clear: async () => {
          saved = null;
        },
      };
      useAppStore.setState({
        session: registered,
        hasAuthenticated: true,
        confirmed: true,
        browsingVillage: village,
        draft: {
          firstName: "Private",
          lastName: "Draft",
          mobile: "9876543210",
        },
        challenge: { challengeId: "challenge" } as never,
        contactReturnListingId: "b".repeat(24),
      });
      await clearSessionForGuest(
        storage,
        async () => {
          guest = null;
          browse = null;
        },
        useAppStore.getState().clearAuthenticatedState,
      );
      const state = useAppStore.getState();
      assert.equal(await storage.read(), null);
      assert.equal(guest, null);
      assert.equal(browse, null);
      assert.equal(state.session, null);
      assert.equal(state.browsingVillage, null);
      assert.equal(state.challenge, null);
      assert.equal(state.contactReturnListingId, null);
      assert.deepEqual(state.draft, {
        firstName: "",
        lastName: "",
        mobile: "",
      });
      assert.equal(
        initialRoute(state.confirmed, null, state.browsingVillage, true),
        "/language",
      );
      assert.equal(
        initialRoute(true, (await storage.read())?.user, null, true),
        "/language",
      );
      const restarted = await restorePreferences({
        readHasAuthenticated: async () => "true",
        writeHasAuthenticated: async () => undefined,
        readLanguage: async () => "mr",
        writeLanguage: async () => undefined,
        readGuestVillage: async () => null,
        readBrowsingVillage: async () => guest,
        writeBrowsingVillage: async (value) => {
          guest = value;
        },
        clearGuestBrowsing: async () => {
          guest = null;
          browse = null;
        },
      });
      assert.equal(
        initialRoute(
          restarted.confirmed,
          null,
          restarted.browsingVillage,
          restarted.hasAuthenticated,
        ),
        "/language",
      );
      assert.equal(
        initialRoute(true, null, village, restarted.hasAuthenticated),
        "/home",
      );
      // A later login reuses the same profile and capabilities.
      await persistSession(storage, registered, state.setSession);
      assert.deepEqual(useAppStore.getState().session?.user, registered.user);
      assert.equal(
        initialRoute(true, registered.user),
        isSeller ? "/my-listings" : "/home",
      );
      assert.equal(registered.user.village, village);
    }
  } finally {
    useAppStore.setState(previous);
  }
});

test("logout storage failures do not claim that credentials were cleared", async () => {
  let committed = false;
  const storage: SessionStorage = {
    read: async () => session,
    write: async () => undefined,
    clear: async () => {
      throw new Error("secure storage unavailable");
    },
  };
  await assert.rejects(
    clearSessionForGuest(
      storage,
      async () => undefined,
      () => {
        committed = true;
      },
    ),
  );
  assert.equal(committed, false);
});
