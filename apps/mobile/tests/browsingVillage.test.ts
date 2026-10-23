import { test } from "node:test";
import assert from "node:assert/strict";
import type { MobileSession, MobileVillage } from "@gaavli/types";
import {
  browsingVillageFor,
  restoreBrowsingVillage,
  selectBrowsingVillage,
  type BrowsingVillageStorage,
} from "../src/storage/browsingVillage";
import { useAppStore } from "../src/store";
import { messages } from "../src/i18n";

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
      session: account,
      guestVillage: registered,
      browsingVillage: null,
    });
    assert.equal(browsingVillageFor(useAppStore.getState()), registered);
    await selectBrowsingVillage(
      storage,
      browse,
      useAppStore.getState().setBrowsingVillage,
    );
    assert.equal(browsingVillageFor(useAppStore.getState())?.id, browse.id);
    assert.equal(useAppStore.getState().session, account);
    assert.equal(useAppStore.getState().guestVillage, registered);
    assert.deepEqual(account.user.coordinatorVillages, [registered]);
    useAppStore.getState().setBrowsingVillage(null);
    useAppStore
      .getState()
      .setBrowsingVillage(await restoreBrowsingVillage(storage));
    assert.equal(browsingVillageFor(useAppStore.getState())?.id, browse.id);
    useAppStore
      .getState()
      .restore({ language: "en", confirmed: true, guestVillage: registered });
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
      browsingVillage: null,
      session: null,
      guestVillage: registered,
    }),
    registered,
  );
  for (const language of ["mr", "en"] as const) {
    assert.ok(messages(language).browsingVillage);
    assert.ok(messages(language).chooseBrowsingVillage);
  }
});
