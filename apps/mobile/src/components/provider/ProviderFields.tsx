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
import {
  PROVIDER_KINDS,
  type ProviderField,
  type ProviderType,
} from "@gaavli/constants";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { useProviderMasters } from "../../providerProfiles";
import { Button, DropdownField, ErrorMessage, Input } from "../ui";

export type DetailValue = string | boolean;
export type Details = Record<string, DetailValue>;

export function emptyDetails(type: ProviderType): Details {
  const out: Details = {};
  for (const field of PROVIDER_KINDS[type].fields)
    out[field.key] = field.kind === "bool" ? false : "";
  return out;
}

// Draws the category-specific fields of one provider type. Selects list the
// options an admin manages; everything else is plain inputs.
export function ProviderFields({
  type,
  skip = [],
  values,
  onChange,
  errors,
  disabled,
}: {
  type: ProviderType;
  skip?: readonly string[];
  values: Details;
  onChange: (key: string, value: DetailValue) => void;
  errors: Record<string, string>;
  disabled: boolean;
}) {
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  return (
    <>
      {PROVIDER_KINDS[type].fields
        .filter((field) => !skip.includes(field.key))
        .map((field) => {
          const label = `${field.label[language]}${field.required ? " *" : ""}`;
          const error = errors[field.key];
          if (field.kind === "master")
            return (
              <MasterSelect
                key={field.key}
                type={type}
                field={field}
                label={label}
                value={String(values[field.key] ?? "")}
                error={error}
                disabled={disabled}
                onChange={(value) => onChange(field.key, value)}
              />
            );
          if (field.kind === "choice")
            return (
              <View key={field.key} style={s.group}>
                <Text style={s.label}>{label}</Text>
                <View style={s.row}>
                  {field.options.map((option) => {
                    const on = values[field.key] === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        disabled={disabled}
                        onPress={() => onChange(field.key, option.id)}
                        style={[s.choice, on && s.choiceOn]}
                      >
                        <Text style={[s.choiceText, on && s.choiceTextOn]}>
                          {option[language]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!!error && <ErrorMessage message={error} />}
              </View>
            );
          if (field.kind === "bool")
            return (
              <View key={field.key} style={s.switchRow}>
                <Text style={s.switchLabel}>{field.label[language]}</Text>
                <View style={s.row}>
                  <Text style={s.yesNo}>
                    {values[field.key] ? t.provYes : t.provNo}
                  </Text>
                  <Switch
                    accessibilityLabel={field.label[language]}
                    value={!!values[field.key]}
                    disabled={disabled}
                    onValueChange={(value) => onChange(field.key, value)}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primary,
                    }}
                    thumbColor={theme.colors.surface}
                  />
                </View>
              </View>
            );
          return (
            <Input
              key={field.key}
              label={label}
              value={String(values[field.key] ?? "")}
              onChangeText={(value) => onChange(field.key, value)}
              error={error}
              editable={!disabled}
              multiline={field.multiline}
              keyboardType={
                field.keyboard === "numeric"
                  ? "number-pad"
                  : field.keyboard === "url"
                    ? "url"
                    : "default"
              }
              autoCapitalize={field.keyboard === "url" ? "none" : "sentences"}
              maxLength={field.multiline ? 1500 : 300}
              style={
                field.multiline
                  ? { minHeight: 96, textAlignVertical: "top" }
                  : undefined
              }
            />
          );
        })}
    </>
  );
}

function MasterSelect({
  type,
  field,
  label,
  value,
  error,
  disabled,
  onChange,
}: {
  type: ProviderType;
  field: Extract<ProviderField, { kind: "master" }>;
  label: string;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (code: string) => void;
}) {
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const [open, setOpen] = useState(false);
  const query = useProviderMasters(type, field.master);
  const options = query.data?.records ?? [];
  const selected = options.find((option) => option.code === value);
  return (
    <>
      <DropdownField
        label={label}
        value={selected ? selected.name[language] : undefined}
        placeholder={t.provSelect}
        expanded={open}
        disabled={disabled}
        error={error}
        onPress={() => setOpen(true)}
      />
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={s.overlay}
          onPress={() => setOpen(false)}
          accessibilityLabel={t.cancel}
        >
          <Pressable accessibilityViewIsModal style={s.sheet}>
            <View style={s.handle} />
            <Text accessibilityRole="header" style={s.sheetTitle}>
              {field.label[language]}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {query.isPending && (
                <Text style={s.empty}>{t.listingsLoading}</Text>
              )}
              {query.isError && (
                <>
                  <ErrorMessage message={t.genericError} />
                  <Button secondary onPress={() => void query.refetch()}>
                    {t.retry}
                  </Button>
                </>
              )}
              {query.isSuccess && !options.length && (
                <Text style={s.empty}>{t.provSearchEmpty}</Text>
              )}
              {options.map((option) => {
                const on = option.code === value;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => {
                      onChange(option.code);
                      setOpen(false);
                    }}
                    style={[s.option, on && s.optionOn]}
                  >
                    <Text style={[s.optionText, on && s.optionTextOn]}>
                      {option.name[language]}
                    </Text>
                    {on && (
                      <Ionicons
                        accessible={false}
                        name="checkmark"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button ghost onPress={() => setOpen(false)}>
              {t.cancel}
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  group: { gap: 8 },
  label: { ...theme.type.label, color: theme.colors.text },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  choice: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
  },
  choiceOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  choiceText: { ...theme.type.label, color: theme.colors.text },
  choiceTextOn: { color: theme.colors.onPrimary },
  switchRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchLabel: { ...theme.type.label, color: theme.colors.text, flex: 1 },
  yesNo: { ...theme.type.label, color: theme.colors.muted },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "75%",
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radii.sheet,
    borderTopRightRadius: theme.radii.sheet,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 8,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    marginBottom: 6,
  },
  sheetTitle: { ...theme.type.heading, color: theme.colors.heading },
  empty: { ...theme.type.body, color: theme.colors.muted, paddingVertical: 12 },
  option: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: theme.radii.control,
  },
  optionOn: { backgroundColor: theme.colors.tint },
  optionText: { ...theme.type.body, color: theme.colors.text, flex: 1 },
  optionTextOn: { color: theme.colors.saffronText, fontWeight: "700" },
});
