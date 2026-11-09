import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CONTACT_LABELS, MAX_PROVIDER_CONTACTS } from "@gaavli/constants";
import { useAppStore } from "../store";
import { formatMessage, messages } from "../i18n";
import { theme } from "../theme";
import {
  ALTERNATE_LABELS,
  addContact,
  canAddContact,
  cleanMobile,
  contactErrors,
  removeContact,
  setContact,
  type ContactDraft,
} from "../data/contactNumbers";

// Up to five numbers, each with its own WhatsApp flag and "show publicly"
// switch. The first number is the primary one (verified by OTP).
export function ContactNumbersField({
  contacts,
  onChange,
  primaryLocked = false,
  showErrors = false,
  disabled = false,
  showOrderNote = false,
}: {
  contacts: readonly ContactDraft[];
  onChange: (next: ContactDraft[]) => void;
  // In provider forms the primary number is the account's verified one.
  primaryLocked?: boolean;
  showErrors?: boolean;
  disabled?: boolean;
  showOrderNote?: boolean;
}) {
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const errors = contactErrors(
    contacts.filter((row, index) => index === 0 || row.mobile.trim()),
  );
  const labelText = (id: string) =>
    CONTACT_LABELS.find((item) => item.id === id)?.[language] ?? id;
  const full = !canAddContact(contacts);
  return (
    <View style={s.root}>
      {contacts.map((row, index) => {
        const error = showErrors ? errors[index] : undefined;
        const locked = primaryLocked && index === 0;
        return (
          <View key={index} style={[s.card, !!error && s.cardError]}>
            <View style={s.head}>
              <Text style={s.title}>
                {formatMessage(t.regNumberTitle, {
                  n: String(index + 1),
                  label: index === 0 ? t.regMobileMobile : labelText(row.label),
                })}
              </Text>
              {index > 0 && (
                <Pressable
                  accessibilityRole="button"
                  disabled={disabled}
                  hitSlop={8}
                  onPress={() => onChange(removeContact(contacts, index))}
                >
                  <Text style={s.remove}>{t.regRemove}</Text>
                </Pressable>
              )}
            </View>
            {index === 0 && primaryLocked && (
              <Text style={s.note}>{t.regPrimaryNote}</Text>
            )}
            {index > 0 && (
              <View style={s.chips}>
                {ALTERNATE_LABELS.map((id) => (
                  <Pressable
                    key={id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: row.label === id }}
                    disabled={disabled}
                    onPress={() =>
                      onChange(setContact(contacts, index, { label: id }))
                    }
                    style={[s.chip, row.label === id && s.chipOn]}
                  >
                    <Text
                      style={[s.chipText, row.label === id && s.chipTextOn]}
                    >
                      {labelText(id)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            <View style={s.numberRow}>
              <View style={s.prefix}>
                <Text style={s.prefixText}>+91</Text>
              </View>
              <TextInput
                accessibilityLabel={formatMessage(t.regNumberTitle, {
                  n: String(index + 1),
                  label: t.regMobileMobile,
                })}
                value={row.mobile}
                editable={!disabled && !locked}
                onChangeText={(value) =>
                  onChange(
                    setContact(contacts, index, { mobile: cleanMobile(value) }),
                  )
                }
                placeholder={t.regMobilePlaceholder}
                placeholderTextColor={theme.colors.placeholder}
                keyboardType="number-pad"
                maxLength={10}
                style={[
                  s.input,
                  locked && s.inputLocked,
                  !!error && s.inputError,
                ]}
              />
            </View>
            {!!error && (
              <Text accessibilityLiveRegion="polite" style={s.error}>
                {error === "duplicate"
                  ? t.regNumberDuplicate
                  : t.regNumberInvalid}
              </Text>
            )}
            <View style={s.switches}>
              <Flag
                label={t.regHasWhatsApp}
                value={row.whatsapp}
                disabled={disabled}
                onChange={(value) =>
                  onChange(setContact(contacts, index, { whatsapp: value }))
                }
              />
              <Flag
                label={t.regShowPublicly}
                value={row.isPublic}
                disabled={disabled}
                onChange={(value) =>
                  onChange(setContact(contacts, index, { isPublic: value }))
                }
              />
            </View>
          </View>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: full || disabled }}
        disabled={full || disabled}
        onPress={() => onChange(addContact(contacts))}
        style={[s.add, (full || disabled) && s.addOff]}
      >
        <Ionicons
          accessible={false}
          name="add"
          size={18}
          color={theme.colors.steel}
        />
        <Text style={s.addText}>
          {full
            ? t.regMaxNumbers
            : contacts.length > 1
              ? t.regAddAnother
              : t.regAddAlternate}
        </Text>
      </Pressable>
      {showOrderNote && contacts.length > 1 && (
        <Text style={s.note}>{t.regOrderNote}</Text>
      )}
      <Text style={s.count}>
        {contacts.length}/{MAX_PROVIDER_CONTACTS}
      </Text>
    </View>
  );
}
function Flag({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <View style={s.flag}>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
      />
      <Text style={s.flagText}>{label}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  root: { gap: 12 },
  card: {
    gap: 10,
    padding: 14,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cardError: { borderColor: theme.colors.error },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { ...theme.type.label, color: theme.colors.heading },
  remove: { ...theme.type.label, color: theme.colors.error },
  note: { ...theme.type.caption, color: theme.colors.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    justifyContent: "center",
  },
  chipOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: { ...theme.type.micro, color: theme.colors.text },
  chipTextOn: { color: theme.colors.onPrimary },
  numberRow: { flexDirection: "row", gap: 8 },
  prefix: {
    minWidth: 56,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  prefixText: { ...theme.type.subheading, color: theme.colors.text },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    paddingHorizontal: 14,
    fontSize: 16,
    color: theme.colors.text,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  inputLocked: {
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.muted,
  },
  inputError: { borderColor: theme.colors.error },
  error: { ...theme.type.caption, color: theme.colors.error },
  switches: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  flag: { flexDirection: "row", alignItems: "center", gap: 8 },
  flagText: { ...theme.type.label, color: theme.colors.text },
  add: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: theme.radii.control,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.borderStrong,
  },
  addOff: { opacity: theme.interaction.disabledOpacity },
  addText: { ...theme.type.subheading, color: theme.colors.steel },
  count: { ...theme.type.micro, color: theme.colors.muted, textAlign: "right" },
});
