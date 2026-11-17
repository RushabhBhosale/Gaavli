import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  MAX_SHOP_PRODUCTS,
  SHOP_POPULAR_ITEMS,
  SHOP_PRODUCT_GROUPS,
  shopProductGroup,
} from "@gaavli/constants";
import { useAppStore } from "../../store";
import { formatMessage, messages } from "../../i18n";
import { theme } from "../../theme";
import { ErrorMessage } from "../ui";

type IconName = keyof typeof Ionicons.glyphMap;
const toggle = (list: readonly string[], id: string) =>
  list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

// "What do you sell?": one big chip per product group. Unticking a group also
// drops its popular items, so hidden ticks never reach the server.
export function ShopGroupsField({
  label,
  hint,
  value,
  products,
  error,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  value: readonly string[];
  products: readonly string[];
  error?: string;
  disabled: boolean;
  onChange: (groups: string[], products: string[]) => void;
}) {
  const language = useAppStore((state) => state.language);
  return (
    <View style={s.group}>
      <Text style={s.label}>{label}</Text>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
      <View style={s.grid}>
        {SHOP_PRODUCT_GROUPS.map((group) => {
          const on = value.includes(group.id);
          return (
            <Pressable
              key={group.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled }}
              accessibilityLabel={group[language]}
              disabled={disabled}
              onPress={() => {
                const groups = toggle(value, group.id);
                const allowed = new Set(
                  groups.flatMap((id) =>
                    (SHOP_POPULAR_ITEMS[id] ?? []).map((item) => item.code),
                  ),
                );
                onChange(
                  groups,
                  products.filter((code) => allowed.has(code)),
                );
              }}
              style={({ pressed }) => [
                s.tile,
                on && s.tileOn,
                pressed && s.pressed,
              ]}
            >
              <Ionicons
                accessible={false}
                name={(on ? "checkmark-circle" : group.icon) as IconName}
                size={22}
                color={on ? theme.colors.onPrimary : theme.colors.primary}
              />
              <Text style={[s.tileText, on && s.tileTextOn]}>
                {group[language]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!!error && <ErrorMessage message={error} />}
    </View>
  );
}

// Popular items under each ticked group: tap to tick, no typing.
export function ShopProductsField({
  label,
  hint,
  groups,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  groups: readonly string[];
  value: readonly string[];
  disabled: boolean;
  onChange: (products: string[]) => void;
}) {
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const full = value.length >= MAX_SHOP_PRODUCTS;
  const shown = SHOP_PRODUCT_GROUPS.filter(
    (group) =>
      groups.includes(group.id) && SHOP_POPULAR_ITEMS[group.id]?.length,
  );
  return (
    <View style={s.group}>
      <Text style={s.label}>{label}</Text>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
      {!shown.length && <Text style={s.hint}>{t.shopPickGroupsFirst}</Text>}
      {shown.map((group) => (
        <View key={group.id} style={s.section}>
          <Text style={s.sectionTitle}>
            {shopProductGroup(group.id)?.[language]}
          </Text>
          <View style={s.row}>
            {(SHOP_POPULAR_ITEMS[group.id] ?? []).map((item) => {
              const on = value.includes(item.code);
              const blocked = disabled || (!on && full);
              return (
                <Pressable
                  key={item.code}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: blocked }}
                  disabled={blocked}
                  onPress={() => onChange(toggle(value, item.code))}
                  style={({ pressed }) => [
                    s.chip,
                    on && s.chipOn,
                    blocked && !on && s.chipBlocked,
                    pressed && s.pressed,
                  ]}
                >
                  {on && (
                    <Ionicons
                      accessible={false}
                      name="checkmark"
                      size={16}
                      color={theme.colors.onPrimary}
                    />
                  )}
                  <Text style={[s.chipText, on && s.chipTextOn]}>
                    {item[language] || item.en}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      {!!shown.length && (
        <Text style={s.hint}>
          {full
            ? formatMessage(t.shopItemsLimit, { max: MAX_SHOP_PRODUCTS })
            : formatMessage(t.shopItemsCount, {
                count: value.length,
                max: MAX_SHOP_PRODUCTS,
              })}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  group: { gap: 8 },
  label: { ...theme.type.label, color: theme.colors.text },
  hint: { ...theme.type.caption, color: theme.colors.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    minHeight: 52,
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  tileOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tileText: { ...theme.type.label, color: theme.colors.text, flexShrink: 1 },
  tileTextOn: { color: theme.colors.onPrimary },
  section: { gap: 6, marginTop: 4 },
  sectionTitle: { ...theme.type.label, color: theme.colors.heading },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  chipOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipBlocked: { opacity: 0.5 },
  chipText: { ...theme.type.label, color: theme.colors.text },
  chipTextOn: { color: theme.colors.onPrimary },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
