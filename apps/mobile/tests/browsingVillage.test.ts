import { test } from "node:test";
import assert from "node:assert/strict";
import type { MobileSession, MobileVillage } from "@gaavli/types";
import {
  browsingVillageFor,
  browsingListingsQuery,
  clearBrowsingVillage,
  initialBrowsingVillage,
  restoreBrowsingVillage,
  selectBrowsingVillage,
  type BrowsingVillageStorage,
} from "../src/storage/browsingVillage";
import { useAppStore } from "../src/store";
import { messages } from "../src/i18n";
import {
  postAuthHref,
  restorePreferences,
  type PreferenceStorage,
} from "../src/storage/preferences";

const registered: MobileVillage = {
  id: "a".repeat(24),
  name: "Registered",
  nameMr: "नोंदणीकृत",
  taluka: "A",
  district: "Test",
  pinCode: null,
};
const browse: MobileVillage = {
  ...registered,
  id: "b".repeat(24),
  name: "Browse",
  nameMr: "दुसरे गाव",
};
const account: MobileSession = {
  accessToken: "a".repeat(64),
  refreshToken: "b".repeat(64),
  accessExpiresAt: "2030-01-01T00:00:00.000Z",
  user: {
    id: "user",
    name: "Registered User",
    firstName: "Registered",
    lastName: "User",
    language: "mr",
    village: registered,
    isCoordinator: true,
    coordinatorVillages: [registered],
  },
};

test("buyer and seller login preserve browsing selection, with registered village used only when none is selected", () => {
  const previous = useAppStore.getState();
  try {
    for (const isSeller of [false, true]) {
      const session = {
        ...account,
        user: {
          ...account.user,
          isSeller,
          isCoordinator: false,
          coordinatorVillages: [],
        },
      };
      useAppStore.setState({
        session: null,
        browsingVillage: browse,
      });
      const productId = "d".repeat(24);
      useAppStore.getState().setContactReturn(productId);
      useAppStore.getState().setSession(session);
      assert.equal(browsingVillageFor(useAppStore.getState()), browse);
      useAppStore.getState().clearRegistration();
      assert.equal(
        postAuthHref(
          session.user,
          useAppStore.getState().contactReturnListingId,
        ),
        `/product/${productId}`,
      );
      assert.equal(session.user.village?.id, registered.id);
      // Startup and token refresh preserve the same selection.
      useAppStore
        .getState()
        .setBrowsingVillage(initialBrowsingVillage(browse, session));
      assert.equal(browsingVillageFor(useAppStore.getState()), browse);
      useAppStore.getState().setBrowsingVillage(browse);
      assert.equal(browsingVillageFor(useAppStore.getState()), browse);
      useAppStore.getState().setSession({ ...session, accessToken: "renewed" });
      assert.equal(browsingVillageFor(useAppStore.getState()), browse);
      const differentAccount = {
        ...session,
        user: { ...session.user, id: "another-user" },
      };
      useAppStore.getState().setSession(differentAccount);
      assert.equal(browsingVillageFor(useAppStore.getState()), browse);
      useAppStore.getState().clearAuthenticatedState();
      useAppStore.getState().setSession(session);
      assert.equal(browsingVillageFor(useAppStore.getState()), registered);
    }
    assert.equal(initialBrowsingVillage(browse, null), browse);
    assert.equal(initialBrowsingVillage(browse, account), browse);
  } finally {
    useAppStore.setState(previous);
  }
});

test("feed queries always use the selected browsing village as source and exact filter", () => {
  const query = new URLSearchParams(
    browsingListingsQuery(browse.id, {
      search: "milk",
      page: "2",
      limit: "20",
      productGroup: "dairy",
    }),
  );
  assert.equal(query.get("sourceVillageId"), browse.id);
  assert.equal(query.get("villageId"), browse.id);
  assert.equal(query.get("search"), "milk");
  assert.equal(query.get("page"), "2");
  assert.equal(query.get("productGroup"), "dairy");
  assert.notEqual(query.get("villageId"), registered.id);
});

test("first-screen direct login discards guest browsing and product context, then uses the registered village and Home", async () => {
  const previous = useAppStore.getState();
  let saved: string | null = JSON.stringify(browse);
  try {
    for (const isSeller of [false, true]) {
      useAppStore.setState({
        session: null,
        browsingVillage: browse,
        contactReturnListingId: "d".repeat(24),
      });
      await clearBrowsingVillage({
        clearGuestBrowsing: async () => {
          saved = null;
        },
      });
      useAppStore.getState().clearAuthenticatedState();
      const session = {
        ...account,
        user: {
          ...account.user,
          isCoordinator: false,
          coordinatorVillages: [],
          isSeller,
        },
      };
      useAppStore.getState().setSession(session);
      assert.equal(saved, null);
      assert.equal(useAppStore.getState().contactReturnListingId, null);
      assert.equal(useAppStore.getState().browsingVillage?.id, registered.id);
      assert.equal(postAuthHref(session.user, null, true), "/home");
      assert.equal(
        postAuthHref(session.user, "d".repeat(24), true),
        `/product/${"d".repeat(24)}`,
      );
      useAppStore.getState().setBrowsingVillage(browse);
      assert.equal(useAppStore.getState().browsingVillage?.id, browse.id);
      assert.equal(
        useAppStore.getState().session?.user.village?.id,
        registered.id,
      );
    }
  } finally {
    useAppStore.setState(previous);
  }
});

test("startup restores one browsing choice, with legacy guest metadata used only as a migration fallback", async () => {
  let saved: string | null = JSON.stringify(browse);
  const storage: PreferenceStorage = {
    readHasAuthenticated: async () => "true",
    writeHasAuthenticated: async () => undefined,
    readLanguage: async () => "mr",
    writeLanguage: async () => undefined,
    readGuestVillage: async () => JSON.stringify(registered),
    readBrowsingVillage: async () => saved,
    writeBrowsingVillage: async (value) => {
      saved = value;
    },
    clearGuestBrowsing: async () => undefined,
  };
  assert.equal(
    (await restorePreferences(storage)).browsingVillage?.id,
    browse.id,
  );
  saved = null;
  assert.equal(
    (await restorePreferences(storage)).browsingVillage?.id,
    registered.id,
  );
});

test("browsing selection persists across restart without modifying registration or coordinator assignments", async () => {
  const previous = useAppStore.getState();
  let saved: string | null = null;
  const storage: BrowsingVillageStorage = {
    readBrowsingVillage: async () => saved,
    writeBrowsingVillage: async (value) => {
      saved = value;
    },
  };
  try {
    useAppStore.setState({
      session: null,
      browsingVillage: null,
    });
    useAppStore.getState().setSession(account);
    assert.equal(browsingVillageFor(useAppStore.getState()), registered);
    await selectBrowsingVillage(
      storage,
      browse,
      useAppStore.getState().setBrowsingVillage,
    );
    assert.equal(browsingVillageFor(useAppStore.getState())?.id, browse.id);
    assert.equal(useAppStore.getState().session, account);
    assert.deepEqual(account.user.coordinatorVillages, [registered]);
    useAppStore.getState().setBrowsingVillage(null);
    useAppStore
      .getState()
      .setBrowsingVillage(await restoreBrowsingVillage(storage));
    assert.equal(browsingVillageFor(useAppStore.getState())?.id, browse.id);
    useAppStore.getState().restore({
      language: "en",
      confirmed: true,
      hasAuthenticated: true,
      browsingVillage: registered,
    });
    assert.equal(useAppStore.getState().browsingVillage?.id, browse.id);
    // Profile village changes must not overwrite an explicit browsing choice.
    useAppStore.getState().setSession({
      ...account,
      user: {
        ...account.user,
        village: { ...registered, id: "c".repeat(24) },
      },
    });
    assert.equal(browsingVillageFor(useAppStore.getState())?.id, browse.id);
  } finally {
    useAppStore.setState(previous);
  }
});
test("failed selection keeps the current village and later writes recover", async () => {
  let committed = registered;
  let fail = true;
  const storage: BrowsingVillageStorage = {
    readBrowsingVillage: async () => null,
    writeBrowsingVillage: async () => {
      if (fail) throw new Error("full");
    },
  };
  await assert.rejects(
    selectBrowsingVillage(storage, browse, (value) => {
      committed = value;
    }),
  );
  assert.equal(committed, registered);
  fail = false;
  await selectBrowsingVillage(storage, browse, (value) => {
    committed = value;
  });
  assert.equal(committed.id, browse.id);
});
test("selections from both tabs are serialized and the latest choice survives restart", async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let saved: string | null = null;
  let count = 0;
  const commits: string[] = [];
  const storage: BrowsingVillageStorage = {
    readBrowsingVillage: async () => saved,
    writeBrowsingVillage: async (value) => {
      if (++count === 1) await blocked;
      saved = value;
    },
  };
  const first = selectBrowsingVillage(storage, registered, (value) =>
    commits.push(value.id),
  );
  const second = selectBrowsingVillage(storage, browse, (value) =>
    commits.push(value.id),
  );
  release();
  await Promise.all([first, second]);
  assert.deepEqual(commits, [registered.id, browse.id]);
  assert.equal((await restoreBrowsingVillage(storage))?.id, browse.id);
});
test("corrupt stored selections safely fall back and browsing labels are localized", async () => {
  for (const value of [null, "invalid-json", JSON.stringify({ id: "bad" })])
    assert.equal(
      await restoreBrowsingVillage({
        readBrowsingVillage: async () => value,
        writeBrowsingVillage: async () => undefined,
      }),
      null,
    );
  assert.equal(
    browsingVillageFor({
      browsingVillage: registered,
    }),
    registered,
  );
  for (const language of ["mr", "en"] as const) {
    assert.ok(messages(language).browsingVillage);
    assert.ok(messages(language).chooseBrowsingVillage);
  }
});

test("logout clears the village after pending selection writes finish", async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let saved: string | null = null;
  const storage = {
    readBrowsingVillage: async () => saved,
    writeBrowsingVillage: async (value: string) => {
      await blocked;
      saved = value;
    },
    clearGuestBrowsing: async () => {
      saved = null;
    },
  };
  const selection = selectBrowsingVillage(storage, browse, () => undefined);
  const logout = clearBrowsingVillage(storage);
  release();
  await Promise.all([selection, logout]);
  assert.equal(await restoreBrowsingVillage(storage), null);
});
