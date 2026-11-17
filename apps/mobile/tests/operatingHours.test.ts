import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultHours,
  hoursProblem,
  hoursSummary,
  hoursText,
  parseHours,
  serializeHours,
} from "../src/data/operatingHours";

test("hours round trip and older plain text still reads", () => {
  const hours = {
    slots: [
      { open: "09:00", close: "13:00" },
      { open: "16:00", close: "20:00" },
    ],
    off: [0],
  };
  assert.deepEqual(parseHours(serializeHours(hours)), {
    ...hours,
    allDay: false,
  });
  assert.equal(parseHours("9 to 5"), null);
  assert.deepEqual(hoursText("9 to 5", "en"), { raw: "9 to 5" });
  assert.equal(hoursText("", "en"), null);
});

test("hours are described as ranges, slots and the weekly off", () => {
  const value = serializeHours({
    slots: [
      { open: "09:00", close: "13:00" },
      { open: "16:00", close: "20:30" },
    ],
    off: [0],
  });
  assert.equal(
    hoursSummary(value, "en"),
    "Mon–Sat · 9:00 AM – 1:00 PM, 4:00 PM – 8:30 PM",
  );
  const parts = hoursText(value, "en");
  assert.ok(parts && !("raw" in parts));
  assert.equal(parts.closed, "Sun");
  const all = hoursText(
    serializeHours({ slots: [], off: [], allDay: true }),
    "en",
  );
  assert.ok(all && !("raw" in all));
  assert.equal(all.allDay, true);
  assert.equal(all.openDays, "Mon–Sun");
});

test("hours checks: order, overlap and nothing open", () => {
  assert.equal(hoursProblem(defaultHours()), null);
  assert.equal(
    hoursProblem({ slots: [{ open: "13:00", close: "09:00" }], off: [] }),
    "order",
  );
  assert.equal(
    hoursProblem({
      slots: [
        { open: "09:00", close: "13:00" },
        { open: "12:00", close: "15:00" },
      ],
      off: [],
    }),
    "overlap",
  );
  assert.equal(hoursProblem({ slots: [], off: [] }), "none");
  assert.equal(hoursProblem({ slots: [], off: [], allDay: true }), null);
});
