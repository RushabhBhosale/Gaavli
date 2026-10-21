import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coordinatorBuyerSchema,
  coordinatorUserEditSchema,
  coordinatorQuerySchema,
  coordinatorReportActionSchema,
} from "@gaavli/validation";
import {
  sendCoordinatorOperation,
  addVillageConnections,
  pendingCoordinatorSchema,
  type PendingCoordinator,
} from "../src/data/coordinator";
import { coordinatorTranslations } from "../src/coordinator/i18n";

test("multi-village addition stops on uncertain results and confirms only completed selections", async () => {
  const sent: string[] = [];
  const confirmed: string[] = [];
  const complete = await addVillageConnections(
    ["a", "a", "b", "c"],
    async (id) => {
      sent.push(id);
      return id === "b" ? null : { id, confirmed: true };
    },
    (id) => confirmed.push(id),
  );
  assert.equal(complete, false);
  assert.deepEqual(sent, ["a", "b"]);
  assert.deepEqual(confirmed, ["a"]);
  assert.equal(
    await addVillageConnections(
      ["b", "c"],
      async (id) => ({ id, confirmed: true }),
      (id) => confirmed.push(id),
    ),
    true,
  );
  assert.deepEqual(confirmed, ["a", "b", "c"]);
  assert.equal(coordinatorQuerySchema.parse({ area: "taluka" }).area, "taluka");
  assert.equal(
    coordinatorQuerySchema.parse({ area: "other_talukas" }).area,
    "other_talukas",
  );
  assert.equal(
    coordinatorQuerySchema.safeParse({ area: "other" }).success,
    false,
  );
});

test("coordinator inputs normalize mobile numbers and reject scope, role and product-field injection", () => {
  const buyer = {
    firstName: "Rahul",
    lastName: "More",
    mobile: "+91 98765 43210",
  };
  assert.equal(coordinatorBuyerSchema.parse(buyer).mobile, "9876543210");
  assert.equal(
    coordinatorBuyerSchema.parse({ ...buyer, targetVillageId: "b".repeat(24) })
      .targetVillageId,
    "b".repeat(24),
  );
  assert.equal(
    coordinatorBuyerSchema.safeParse({ ...buyer, targetVillageId: "invalid" })
      .success,
    false,
  );
  for (const bad of [
    { ...buyer, roles: ["coordinator"] },
    { ...buyer, villageId: "a".repeat(24) },
    { ...buyer, firstName: "" },
    { ...buyer, mobile: "12345" },
  ])
    assert.equal(coordinatorBuyerSchema.safeParse(bad).success, false);
  assert.equal(
    coordinatorUserEditSchema.safeParse({
      firstName: "A",
      lastName: "B",
      version: 1,
      mobile: "9876543210",
    }).success,
    false,
  );
  assert.equal(
    coordinatorReportActionSchema.safeParse({
      action: "hide",
      version: 0,
      price: 0,
    }).success,
    false,
  );
  assert.equal(
    coordinatorQuerySchema.safeParse({ from: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    coordinatorQuerySchema.safeParse({ from: "2026-10-19", to: "2026-10-01" })
      .success,
    false,
  );
  assert.equal(coordinatorQuerySchema.safeParse({ limit: 51 }).success, false);
  assert.equal(
    coordinatorQuerySchema.safeParse({ latitude: 18 }).success,
    false,
  );
});
test("coordinator operations stage before networking and preserve exact keys/payloads across restart", async () => {
  const rows = new Map<string, string>();
  let failWrite = false,
    loseResponse = true,
    cleanupFails = false;
  const storage = {
    read: async (key: string) => rows.get(key) || null,
    write: async (key: string, value: string) => {
      if (failWrite) throw new Error("storage unavailable");
      rows.set(key, value);
    },
    remove: async (key: string) => {
      if (cleanupFails) throw new Error("cleanup failed");
      rows.delete(key);
    },
  };
  const sent: PendingCoordinator[] = [];
  const operation = {
    path: `/coordinator/buyers?villageId=${"a".repeat(24)}`,
    method: "POST" as const,
    body: { firstName: "Rahul", lastName: "More", mobile: "9876543210" },
  };
  const result = { id: "b".repeat(24), confirmed: true as const };
  const send = async (value: PendingCoordinator) => {
    sent.push(value);
    if (loseResponse) throw new Error("response lost");
    return result;
  };
  const input = {
    storage,
    storageKey: "account-village",
    operation,
    send,
    isCurrent: () => true,
  };
  failWrite = true;
  await assert.rejects(sendCoordinatorOperation(input));
  assert.equal(sent.length, 0);
  failWrite = false;
  await assert.rejects(sendCoordinatorOperation(input));
  assert.equal(sent.length, 1);
  const saved = pendingCoordinatorSchema.parse(
    JSON.parse(rows.get(input.storageKey)!),
  );
  assert.deepEqual(saved.body, operation.body);
  await assert.rejects(
    sendCoordinatorOperation({
      ...input,
      operation: {
        ...operation,
        body: { ...operation.body, firstName: "Changed" },
      },
    }),
    /COORDINATOR_PENDING/,
  );
  assert.equal(sent.length, 1);
  loseResponse = false;
  cleanupFails = true;
  assert.deepEqual(
    await sendCoordinatorOperation({ ...input, operation: undefined }),
    result,
  );
  assert.deepEqual(sent[1], sent[0]);
  assert.ok(rows.get(input.storageKey));
  cleanupFails = false;
  assert.deepEqual(
    await sendCoordinatorOperation({ ...input, operation: undefined }),
    result,
  );
  assert.deepEqual(sent[2], sent[0]);
  assert.equal(rows.get(input.storageKey), undefined);
  assert.equal(
    await sendCoordinatorOperation({ ...input, operation: undefined }),
    null,
  );
});
test("account or assignment changes stop request and UI side effects", async () => {
  let raw: string | null = null,
    calls = 0;
  const storage = {
    read: async () => raw,
    write: async (_key: string, value: string) => {
      raw = value;
    },
    remove: async () => {
      raw = null;
    },
  };
  const result = await sendCoordinatorOperation({
    storage,
    storageKey: "a",
    isCurrent: () => false,
    operation: { path: "/coordinator/buyers", method: "POST", body: {} },
    send: async () => {
      calls++;
      return { id: "a".repeat(24), confirmed: true };
    },
  });
  assert.equal(result, null);
  assert.equal(calls, 0);
  assert.ok(raw);
});
test("coordinator Marathi and English copy is complete and nonempty", () => {
  assert.deepEqual(
    Object.keys(coordinatorTranslations.en).sort(),
    Object.keys(coordinatorTranslations.mr).sort(),
  );
  for (const values of Object.values(coordinatorTranslations))
    for (const value of Object.values(values)) assert.ok(value.trim());
});
test("concurrent coordinator screens cannot replace an unresolved staged operation", async () => {
  let raw: string | null = null,
    release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const sent: PendingCoordinator[] = [];
  const storage = {
    read: async () => raw,
    write: async (_key: string, value: string) => {
      await gate;
      raw = value;
    },
    remove: async () => {
      raw = null;
    },
  };
  const first = {
    path: "/coordinator/buyers",
    method: "POST" as const,
    body: { firstName: "Rahul" },
  };
  const input = {
    storage,
    storageKey: "same-account-village",
    isCurrent: () => true,
    send: async (
      value: PendingCoordinator,
    ): Promise<{ id: string; confirmed: true }> => {
      sent.push(value);
      throw new Error("uncertain response");
    },
  };
  const one = sendCoordinatorOperation({ ...input, operation: first });
  const two = sendCoordinatorOperation({
    ...input,
    operation: { ...first, body: { firstName: "Other" } },
  });
  const results = Promise.allSettled([one, two]);
  release();
  const settled = await results;
  assert.equal(settled[0].status, "rejected");
  assert.equal(settled[1].status, "rejected");
  assert.equal(
    settled[1].status === "rejected" ? settled[1].reason.message : "",
    "COORDINATOR_PENDING",
  );
  assert.equal(sent.length, 1);
  assert.equal(
    pendingCoordinatorSchema.parse(JSON.parse(raw!)).body.firstName,
    "Rahul",
  );
});
