import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import {
  persistQueryCache,
  restoreQueryCache,
  QUERY_CACHE_MAX_AGE_MS,
} from "../src/storage/queryCache";

function storage() {
  const box = { value: null as string | null };
  return {
    box,
    read: async () => box.value,
    write: async (value: string) => {
      box.value = value;
    },
  };
}

test("listings seen online are restored for offline use", async () => {
  const store = storage();
  const online = new QueryClient();
  const stop = persistQueryCache(online, store, 0);
  online.setQueryData(["home-listings", "guest", "v1"], { listings: [1] });
  online.setQueryData(["marketplace-listings", "available"], { pages: [] });
  await new Promise((resolve) => setTimeout(resolve, 20));
  stop();
  const offline = new QueryClient();
  assert.equal(await restoreQueryCache(offline, store), true);
  assert.deepEqual(offline.getQueryData(["home-listings", "guest", "v1"]), {
    listings: [1],
  });
  assert.ok(offline.getQueryData(["marketplace-listings", "available"]));
});

test("contact details and other private data are never saved", async () => {
  const store = storage();
  const client = new QueryClient();
  const stop = persistQueryCache(client, store, 0);
  client.setQueryData(["seller-contact", "u1", "v1", "l1"], { mobile: "+91" });
  client.setQueryData(["notifications", "u1"], { items: [] });
  client.setQueryData(["listing", "guest", "v1", "l1"], { id: "l1" });
  await new Promise((resolve) => setTimeout(resolve, 20));
  stop();
  assert.ok(store.box.value);
  assert.ok(!store.box.value.includes("seller-contact"));
  assert.ok(!store.box.value.includes("notifications"));
  assert.ok(store.box.value.includes('"listing"'));
});

test("an old or damaged cache is ignored", async () => {
  const store = storage();
  const client = new QueryClient();
  store.box.value = "not json";
  assert.equal(await restoreQueryCache(client, store), false);
  store.box.value = JSON.stringify({
    version: 1,
    savedAt: 1000,
    state: { queries: [], mutations: [] },
  });
  assert.equal(
    await restoreQueryCache(client, store, 1000 + QUERY_CACHE_MAX_AGE_MS + 1),
    false,
  );
});

test("categories are kept and searched lists are not", async () => {
  const store = storage();
  const client = new QueryClient();
  const stop = persistQueryCache(client, store, 0);
  client.setQueryData(["listing-categories", "u1"], { categories: [1] });
  client.setQueryData(
    ["marketplace-listings", "available", "guest", "v1", "", "all"],
    { pages: [] },
  );
  client.setQueryData(
    ["marketplace-listings", "available", "guest", "v1", "onion", "all"],
    { pages: [] },
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  stop();
  assert.ok(store.box.value?.includes("listing-categories"));
  assert.ok(!store.box.value?.includes("onion"));
  assert.ok(store.box.value?.includes('"all"'));
});

test("a full cache drops the oldest lists instead of saving nothing", async () => {
  const store = storage();
  const client = new QueryClient();
  const stop = persistQueryCache(client, store, 0);
  const big = "x".repeat(900_000);
  client.setQueryData(
    ["listing", "guest", "v1", "old"],
    { big },
    { updatedAt: 1000 },
  );
  client.setQueryData(
    ["listing", "guest", "v1", "mid"],
    { big },
    { updatedAt: 2000 },
  );
  client.setQueryData(
    ["listing", "guest", "v1", "new"],
    { big },
    { updatedAt: 3000 },
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  stop();
  assert.ok(store.box.value);
  assert.ok(store.box.value.includes('"new"'));
  assert.ok(store.box.value.includes('"mid"'));
  assert.ok(!store.box.value.includes('"old"'));
});
