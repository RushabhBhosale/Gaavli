import type { MobileLanguage } from "@gaavli/types";

// Opening times: one or more daily slots, applied to every open day, plus the
// weekly days off. Stored as a small JSON string in the provider's details, so
// older plain-text hours still display as they were typed.
export type HoursSlot = { open: string; close: string };
export type Hours = { slots: HoursSlot[]; off: number[]; allDay?: boolean };
export const MAX_HOURS_SLOTS = 3;

export const defaultHours = (): Hours => ({
  slots: [{ open: "09:00", close: "18:00" }],
  off: [],
});

export function parseHours(value: string | undefined | null): Hours | null {
  if (!value || !value.startsWith("{")) return null;
  try {
    const raw = JSON.parse(value) as Partial<Hours> & { v?: number };
    if (raw.v !== 1 || !Array.isArray(raw.slots)) return null;
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    const slots = raw.slots
      .filter(
        (slot): slot is HoursSlot =>
          !!slot && time.test(slot.open) && time.test(slot.close),
      )
      .slice(0, MAX_HOURS_SLOTS);
    const off = (Array.isArray(raw.off) ? raw.off : []).filter(
      (day): day is number => Number.isInteger(day) && day >= 0 && day <= 6,
    );
    return { slots, off: [...new Set(off)].sort(), allDay: !!raw.allDay };
  } catch {
    return null;
  }
}
export const serializeHours = (hours: Hours) =>
  JSON.stringify({
    v: 1,
    slots: hours.allDay ? [] : hours.slots,
    off: [...new Set(hours.off)].sort(),
    ...(hours.allDay ? { allDay: true } : {}),
  });

// What is wrong, if anything: nothing to show, a slot that ends before it
// starts, or two slots that overlap.
export function hoursProblem(
  hours: Hours,
): "none" | "order" | "overlap" | null {
  if (hours.allDay) return hours.off.length >= 7 ? "none" : null;
  if (!hours.slots.length || hours.off.length >= 7) return "none";
  const sorted = [...hours.slots].sort((a, b) => a.open.localeCompare(b.open));
  for (const slot of sorted) if (slot.close <= slot.open) return "order";
  for (let i = 1; i < sorted.length; i++)
    if (sorted[i].open < sorted[i - 1].close) return "overlap";
  return null;
}

export const DAY_NAMES: Record<MobileLanguage, readonly string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  mr: ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"],
  hi: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
};
// Weeks start on Monday here.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function formatTime(time: string, language: MobileLanguage) {
  const [h, m] = time.split(":").map(Number);
  const suffix =
    language === "en"
      ? h < 12
        ? "AM"
        : "PM"
      : h < 12
        ? "सकाळी"
        : h < 17
          ? "दुपारी"
          : "संध्याकाळी";
  const hour = h % 12 || 12;
  const clock = `${hour}:${String(m).padStart(2, "0")}`;
  return language === "en" ? `${clock} ${suffix}` : `${suffix} ${clock}`;
}

// "Mon–Sat" for a run of open days, otherwise the days listed.
export function describeDays(
  days: readonly number[],
  language: MobileLanguage,
) {
  const names = DAY_NAMES[language];
  const open = WEEK_ORDER.filter((day) => days.includes(day));
  const runs: number[][] = [];
  for (const day of open) {
    const last = runs[runs.length - 1];
    const previous = last?.[last.length - 1];
    if (
      last &&
      previous !== undefined &&
      WEEK_ORDER.indexOf(day as never) ===
        WEEK_ORDER.indexOf(previous as never) + 1
    )
      last.push(day);
    else runs.push([day]);
  }
  return runs
    .map((run) =>
      run.length >= 3
        ? `${names[run[0]]}–${names[run[run.length - 1]]}`
        : run.map((day) => names[day]).join(", "),
    )
    .join(", ");
}

export type HoursText = {
  openDays: string;
  times: string[];
  closed: string;
  allDay: boolean;
};
// Parts for display. Plain text (older entries) comes back as `raw`.
export function hoursText(
  value: string | undefined | null,
  language: MobileLanguage,
): HoursText | { raw: string } | null {
  const text = (value ?? "").trim();
  if (!text) return null;
  const hours = parseHours(text);
  if (!hours) return { raw: text };
  const openDays = WEEK_ORDER.filter((day) => !hours.off.includes(day));
  return {
    openDays: describeDays(openDays, language),
    times: hours.allDay
      ? []
      : hours.slots.map(
          (slot) =>
            `${formatTime(slot.open, language)} – ${formatTime(slot.close, language)}`,
        ),
    closed: describeDays(hours.off, language),
    allDay: !!hours.allDay,
  };
}
// One line, for places with little room.
export function hoursSummary(
  value: string | undefined | null,
  language: MobileLanguage,
) {
  const parts = hoursText(value, language);
  if (!parts) return "";
  if ("raw" in parts) return parts.raw;
  return [parts.openDays, parts.allDay ? "24h" : parts.times.join(", ")]
    .filter(Boolean)
    .join(" · ");
}
