import assert from "node:assert/strict";
import test from "node:test";
import {
  PROVIDER_KINDS,
  PROVIDER_MAIN_TYPES,
  PROVIDER_OTHER_TYPES,
  ProviderType,
  PROVIDER_MASTER_GROUPS,
} from "@gaavli/constants";
import {
  addContact,
  contactErrors,
  contactsPayload,
  draftsFromServer,
  emptyContact,
  removeContact,
} from "../src/data/contactNumbers";

test("contacts: max five, primary can't be removed, duplicates flagged", () => {
  let list = [emptyContact("primary")];
  list[0].mobile = "9876543210";
  for (let i = 0; i < 8; i++) list = addContact(list);
  assert.equal(list.length, 5);
  assert.equal(removeContact(list, 0).length, 5);
  assert.equal(removeContact(list, 2).length, 4);
  list[1].mobile = "9876543210";
  assert.equal(contactErrors(list)[1], "duplicate");
  list[1].mobile = "1234567890";
  assert.equal(contactErrors(list)[1], "invalid");
});

test("contacts: payload drops blank alternates and strips +91", () => {
  const list = [emptyContact("primary"), emptyContact()];
  list[0].mobile = "+91 98765 43210";
  assert.deepEqual(
    contactsPayload(list).map((row) => row.mobile),
    ["9876543210"],
  );
  assert.equal(draftsFromServer([]).length, 1);
});

test("provider forms: every master select has an admin-managed list", () => {
  const all = [...PROVIDER_MAIN_TYPES, ...PROVIDER_OTHER_TYPES];
  assert.equal(new Set(all).size, Object.keys(ProviderType).length);
  for (const type of all) {
    const kind = PROVIDER_KINDS[type];
    assert.ok(kind.title.en && kind.title.mr && kind.title.hi);
    for (const field of kind.fields)
      if (field.kind === "master")
        assert.ok(
          (PROVIDER_MASTER_GROUPS[type] as readonly string[]).includes(
            field.master,
          ),
          `${type}.${field.key}`,
        );
  }
});
