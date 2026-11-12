import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DIRECTORY_GROUPS,
  directoryGroupsFor,
  directoryGroupsOf,
  isCatchAllGroup,
} from "@gaavli/constants";

test("each module has exactly one catch-all and every group has a label in three languages", () => {
  for (const kind of ["services", "transport"] as const) {
    const groups = directoryGroupsFor(kind);
    assert.equal(groups.filter((g) => isCatchAllGroup(g.id)).length, 1, kind);
  }
  assert.equal(
    new Set(DIRECTORY_GROUPS.map((g) => g.id)).size,
    DIRECTORY_GROUPS.length,
  );
  for (const g of DIRECTORY_GROUPS) assert.ok(g.en && g.mr && g.hi, g.id);
});

test("services land in tiles by provider code, old category or name, in English or Marathi", () => {
  const of = (e: Parameters<typeof directoryGroupsOf>[1]) =>
    directoryGroupsOf("services", e);
  assert.deepEqual(of({ professionCode: "ELECTRICIAN" }), ["repairs"]);
  assert.deepEqual(of({ profession: "Irrigation pump repair" }), [
    "repairs",
    "farm",
  ]);
  assert.deepEqual(of({ profession: "Tailoring", serviceCategory: "Other" }), [
    "personal",
  ]);
  assert.deepEqual(of({ profession: "शिलाई काम" }), ["personal"]);
  assert.deepEqual(
    of({ profession: "Dr. Patil", serviceCategory: "Medical" }),
    ["health"],
  );
  assert.deepEqual(of({ profession: "Village Grocery" }), ["shops"]);
  assert.deepEqual(of({ profession: "Pandit ji" }), ["events"]);
  // Unrecognised entries still show up, under the catch-all.
  assert.deepEqual(of({ profession: "Astrologer", serviceCategory: "Other" }), [
    "other",
  ]);
  // "labour" must not read as a lab, nor "cargo" as a car.
  assert.ok(!of({ profession: "Farm labour" }).includes("health"));
});

test("vehicles land in tiles by type or name", () => {
  const of = (e: Parameters<typeof directoryGroupsOf>[1]) =>
    directoryGroupsOf("transport", e);
  assert.deepEqual(of({ profession: "Tractor with trolley" }), ["tractor"]);
  assert.deepEqual(of({ profession: "Local goods vehicle" }), ["goods"]);
  assert.deepEqual(of({ professionCode: "AUTO" }), ["auto"]);
  assert.deepEqual(of({ profession: "Cargo carrier" }), ["other_transport"]);
  assert.deepEqual(of({ profession: "Maruti Van" }), ["taxi"]);
  assert.deepEqual(of({ professionMr: "बस" }), ["bus"]);
  assert.deepEqual(of({ professionMr: "रुग्णवाहिका" }), ["ambulance"]);
});

test("urgent help leads each module and the catch-all stays last", () => {
  const services = directoryGroupsFor("services").map((g) => g.id);
  assert.deepEqual(services.slice(0, 3), ["emergency", "public", "community"]);
  assert.equal(services[services.length - 1], "other");
  const transport = directoryGroupsFor("transport").map((g) => g.id);
  assert.equal(transport[0], "ambulance");
  assert.equal(transport[transport.length - 1], "other_transport");
  assert.equal(new Set(services).size, services.length);
});
