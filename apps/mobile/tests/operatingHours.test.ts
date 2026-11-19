import { test } from "node:test";
import assert from "node:assert/strict";
import { ProviderType } from "@gaavli/constants";
import { activityStatus, providerActivity } from "../src/data/activities";
import {
  defaultHours,
  hoursProblem,
  hoursSummary,
  hoursText,
  openState,
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

test("open state follows the hours, days off and the owner's closed switch", () => {
  const hours = serializeHours({
    slots: [
      { open: "09:00", close: "13:00" },
      { open: "16:00", close: "20:00" },
    ],
    off: [0],
  });
  // 2026-11-18 is a Wednesday; 2026-11-22 a Sunday.
  const at = (day: number, time: string) => {
    const [h, m] = time.split(":").map(Number);
    return new Date(2026, 10, day, h, m);
  };
  assert.equal(openState(hours, false, at(18, "10:30")), "open");
  assert.equal(openState(hours, false, at(18, "13:00")), "closed");
  assert.equal(openState(hours, false, at(18, "17:00")), "open");
  assert.equal(openState(hours, false, at(18, "21:00")), "closed");
  assert.equal(openState(hours, false, at(22, "10:30")), "closed");
  assert.equal(openState(hours, true, at(18, "10:30")), "closed");
  const allDay = serializeHours({ slots: [], off: [], allDay: true });
  assert.equal(openState(allDay, false, at(18, "03:00")), "open");
  assert.equal(openState("Mon-Sat 9 to 6", false, at(18, "10:00")), null);
  assert.equal(openState(null, false, at(18, "10:00")), null);
});

test("My Activities uses each provider's saved hours and owner closure", () => {
  const hours = serializeHours({
    slots: [{ open: "09:00", close: "18:00" }],
    off: [0],
  });
  const now = new Date(2026, 10, 19, 10, 30);
  const profile = {
    id: "a".repeat(24),
    name: "Village Shop",
    providerType: ProviderType.SHOP_BUSINESS,
    status: "ACTIVE" as const,
    details: { businessHours: hours },
  };
  const card = providerActivity(profile);
  assert.equal(activityStatus(card, now), "open");
  assert.equal(activityStatus(card, new Date(2026, 10, 19, 19)), "closed");
  assert.equal(activityStatus(card, new Date(2026, 10, 22, 10)), "closed");
  assert.equal(
    activityStatus(
      providerActivity({
        ...profile,
        details: { ...profile.details, closedNow: true },
      }),
      now,
    ),
    "closed",
  );
  for (const [providerType, key] of [
    [ProviderType.HEALTHCARE_PROFESSIONAL, "consultationHours"],
    [ProviderType.MEDICAL_FACILITY, "operatingHours"],
  ] as const) {
    assert.equal(
      activityStatus(
        providerActivity({
          ...profile,
          providerType,
          details: { [key]: hours },
        }),
        now,
      ),
      "open",
    );
  }
});

test("My Activities keeps inactive profiles distinct and never assumes unknown hours are open", () => {
  const profile = {
    id: "a".repeat(24),
    name: "Village Shop",
    providerType: ProviderType.SHOP_BUSINESS,
    status: "ACTIVE" as const,
    details: {},
  };
  assert.equal(activityStatus(providerActivity(profile)), null);
  assert.equal(
    activityStatus(
      providerActivity({ ...profile, details: { businessHours: "9 to 5" } }),
    ),
    null,
  );
  assert.equal(
    activityStatus(
      providerActivity({ ...profile, details: { closedNow: true } }),
    ),
    "closed",
  );
  assert.equal(
    activityStatus(providerActivity({ ...profile, status: "INACTIVE" })),
    "inactive",
  );
  assert.equal(
    activityStatus({ id: "products", title: "My Products", kind: "products" }),
    null,
  );
});
