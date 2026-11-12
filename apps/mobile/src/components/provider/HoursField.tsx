import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import {
  DAY_NAMES,
  MAX_HOURS_SLOTS,
  WEEK_ORDER,
  defaultHours,
  formatTime,
  hoursProblem,
  parseHours,
  serializeHours,
  type Hours,
} from "../../data/operatingHours";
import { Button, ErrorMessage } from "../ui";

// Every half hour of the day.
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  return `${h}:${i % 2 ? "30" : "00"}`;
});

function TimeButton({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (next: string) => void;
}) {
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatTime(value, language)}`}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [s.time, pressed && s.pressed]}
      >
        <Text style={s.timeLabel}>{label}</Text>
        <View style={s.timeRow}>
          <Text style={s.timeValue}>{formatTime(value, language)}</Text>
          <Ionicons
            accessible={false}
            name="chevron-down"
            size={18}
            color={theme.colors.muted}
          />
        </View>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <View accessibilityViewIsModal style={s.sheet}>
            <Text accessibilityRole="header" style={s.sheetTitle}>
              {`${t.hoursPick} · ${label}`}
            </Text>
            <ScrollView
              style={s.list}
              contentOffset={{
                x: 0,
                y: Math.max(0, TIMES.indexOf(value) - 2) * 48,
              }}
            >
              {TIMES.map((time) => (
                <Pressable
                  key={time}
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(time);
                    setOpen(false);
                  }}
                  style={[s.option, time === value && s.optionOn]}
                >
                  <Text
                    style={[s.optionText, time === value && s.optionTextOn]}
                  >
                    {formatTime(time, language)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// Opening times without typing: slots (a lunch break is two slots) and the
// days the place is closed each week.
export function HoursField({
  label,
  value,
  required,
  error,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  required: boolean;
  error?: string;
  disabled: boolean;
  onChange: (next: string) => void;
}) {
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const hours = parseHours(value);
  const set = (next: Hours) => onChange(serializeHours(next));
  const names = DAY_NAMES[language];

  if (!value || !hours)
    return (
      <View style={s.group}>
        <Text style={s.label}>{label}</Text>
        {!!value && <Text style={s.legacy}>{value}</Text>}
        <Button
          secondary
          disabled={disabled}
          onPress={() => onChange(serializeHours(defaultHours()))}
        >
          {t.hoursSet}
        </Button>
        {!!error && <ErrorMessage message={error} />}
      </View>
    );
  const problem = hoursProblem(hours);
  const problemText =
    problem === "order"
      ? t.hoursErrOrder
      : problem === "overlap"
        ? t.hoursErrOverlap
        : problem === "none"
          ? t.hoursErrNone
          : "";
  return (
    <View style={s.group}>
      <Text style={s.label}>{label}</Text>
      <View style={s.card}>
        <View style={s.switchRow}>
          <Text style={s.switchLabel}>{t.hoursOpen24}</Text>
          <Switch
            accessibilityLabel={t.hoursOpen24}
            value={!!hours.allDay}
            disabled={disabled}
            onValueChange={(allDay) =>
              set({
                ...hours,
                allDay,
                slots: hours.slots.length ? hours.slots : defaultHours().slots,
              })
            }
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.surface}
          />
        </View>
        {!hours.allDay && (
          <>
            {hours.slots.map((slot, index) => (
              <View key={index} style={s.slot}>
                <TimeButton
                  label={t.hoursOpens}
                  value={slot.open}
                  disabled={disabled}
                  onChange={(open) =>
                    set({
                      ...hours,
                      slots: hours.slots.map((row, i) =>
                        i === index ? { ...row, open } : row,
                      ),
                    })
                  }
                />
                <TimeButton
                  label={t.hoursCloses}
                  value={slot.close}
                  disabled={disabled}
                  onChange={(close) =>
                    set({
                      ...hours,
                      slots: hours.slots.map((row, i) =>
                        i === index ? { ...row, close } : row,
                      ),
                    })
                  }
                />
                {hours.slots.length > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.hoursRemoveSlot}
                    disabled={disabled}
                    onPress={() =>
                      set({
                        ...hours,
                        slots: hours.slots.filter((_, i) => i !== index),
                      })
                    }
                    style={s.remove}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={theme.colors.error}
                    />
                  </Pressable>
                )}
              </View>
            ))}
            {hours.slots.length < MAX_HOURS_SLOTS && (
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={() =>
                  set({
                    ...hours,
                    slots: [...hours.slots, { open: "16:00", close: "20:00" }],
                  })
                }
                style={s.addSlot}
              >
                <Text style={s.addSlotText}>{t.hoursAddSlot}</Text>
              </Pressable>
            )}
          </>
        )}
        <Text style={s.sub}>{t.hoursWeeklyOff}</Text>
        <Text style={s.hint}>{t.hoursWeeklyOffHint}</Text>
        <View style={s.days}>
          {WEEK_ORDER.map((day) => {
            const off = hours.off.includes(day);
            return (
              <Pressable
                key={day}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: off }}
                accessibilityLabel={`${names[day]}: ${off ? t.hoursClosedOn : t.hoursOpenOn}`}
                disabled={disabled}
                onPress={() =>
                  set({
                    ...hours,
                    off: off
                      ? hours.off.filter((d) => d !== day)
                      : [...hours.off, day],
                  })
                }
                style={[s.day, off && s.dayOff]}
              >
                <Text style={[s.dayText, off && s.dayTextOff]}>
                  {names[day]}
                </Text>
                <Text style={[s.dayState, off && s.dayTextOff]}>
                  {off ? t.hoursClosedOn : t.hoursOpenOn}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {!!problemText && <ErrorMessage message={problemText} />}
      {!!error && !problemText && <ErrorMessage message={error} />}
      {!required && (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onChange("")}
          style={s.addSlot}
        >
          <Text style={s.clearText}>{t.hoursClear}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  group: { gap: 8 },
  label: { color: theme.colors.heading, fontSize: 16, fontWeight: "700" },
  legacy: { color: theme.colors.muted, fontSize: 15, lineHeight: 22 },
  card: {
    gap: 12,
    padding: 14,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchLabel: { flex: 1, color: theme.colors.heading, fontSize: 16 },
  slot: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  time: {
    flex: 1,
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    gap: 2,
  },
  timeLabel: { color: theme.colors.muted, fontSize: 12 },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeValue: { color: theme.colors.heading, fontSize: 16, fontWeight: "600" },
  remove: {
    width: 44,
    height: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  addSlot: { minHeight: 40, justifyContent: "center" },
  addSlotText: { color: theme.colors.primary, fontSize: 15, fontWeight: "700" },
  clearText: { color: theme.colors.muted, fontSize: 14 },
  sub: { color: theme.colors.heading, fontSize: 15, fontWeight: "700" },
  hint: { color: theme.colors.muted, fontSize: 13 },
  days: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  day: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  dayOff: {
    backgroundColor: theme.colors.errorBackground,
    borderColor: theme.colors.error,
  },
  dayText: { color: theme.colors.heading, fontSize: 15, fontWeight: "700" },
  dayState: { color: theme.colors.muted, fontSize: 12 },
  dayTextOff: { color: theme.colors.error },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    maxHeight: "70%",
    padding: 16,
    gap: 8,
    borderRadius: theme.radii.sheet,
    backgroundColor: theme.colors.surface,
  },
  sheetTitle: { color: theme.colors.heading, fontSize: 17, fontWeight: "700" },
  list: { flexGrow: 0 },
  option: {
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: theme.radii.control,
  },
  optionOn: { backgroundColor: theme.colors.tint },
  optionText: { color: theme.colors.heading, fontSize: 16 },
  optionTextOn: { color: theme.colors.primary, fontWeight: "700" },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
