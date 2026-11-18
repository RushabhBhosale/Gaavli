import { useState } from "react";
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

// Items shown per group before "more".
const ITEMS_SHOWN = 6;

// "Show 5 more" / "Show fewer" under a short list.
function MoreButton({
  hidden,
  open,
  onPress,
}: {
  hidden: number;
  open: boolean;
  onPress: () => void;
}) {
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  if (!hidden && !open) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.more, pressed && s.pressed]}
    >
      <Text style={s.moreText}>
        {open
          ? t.shopShowFewer
          : formatMessage(t.shopShowMore, { count: hidden })}
      </Text>
      <Ionicons
        accessible={false}
        name={open ? "chevron-up" : "chevron-down"}
        size={16}
        color={theme.colors.primary}
      />
    </Pressable>
  );
}

// Every popular item of the given groups, in list order.
export const itemsOfGroups = (groups: readonly string[]) =>
  groups.flatMap((id) => (SHOP_POPULAR_ITEMS[id] ?? []).map((i) => i.code));

// "What do you sell?": one big chip per product group; ticking one ticks all
// its popular items. The groups usual for
// the shop type (and any ticked) show first; the rest wait behind "more".
// Unticking a group also drops its popular items, so hidden ticks never
// reach the server.
export function ShopGroupsField({
  label,
  hint,
  value,
  suggested,
  products,
  error,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  value: readonly string[];
  suggested: readonly string[];
  products: readonly string[];
  error?: string;
  disabled: boolean;
  onChange: (groups: string[], products: string[]) => void;
}) {
  const language = useAppStore((state) => state.language);
  const [open, setOpen] = useState(false);
  const main = new Set([...suggested, ...value]);
  // Nothing to suggest yet (no shop type, or "Other"): show them all.
  const all = open || !main.size;
  const rows = SHOP_PRODUCT_GROUPS.filter((group) => all || main.has(group.id));
  return (
    <View style={s.group}>
      <Text style={s.label}>{label}</Text>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
      <View style={s.grid}>
        {rows.map((group) => {
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
                const allowed = new Set(itemsOfGroups(groups));
                const kept = products.filter((code) => allowed.has(code));
                // Ticking a group ticks all its items; untick any not sold.
                onChange(
                  groups,
                  on
                    ? kept
                    : [
                        ...kept,
                        ...itemsOfGroups([group.id]).filter(
                          (code) => !kept.includes(code),
                        ),
                      ],
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
      {!!main.size && (
        <MoreButton
          hidden={SHOP_PRODUCT_GROUPS.length - rows.length}
          open={open}
          onPress={() => setOpen(!open)}
        />
      )}
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
  // Groups whose full item list is open.
  const [open, setOpen] = useState<readonly string[]>([]);
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
      {shown.map((group) => {
        const items = SHOP_POPULAR_ITEMS[group.id] ?? [];
        const isOpen = open.includes(group.id);
        // The first few items; the rest (ticked or not) behind "more", so a
        // group's full list never makes the form long.
        const visible = isOpen ? items : items.slice(0, ITEMS_SHOWN);
        return (
          <View key={group.id} style={s.section}>
            <Text style={s.sectionTitle}>
              {shopProductGroup(group.id)?.[language]}
            </Text>
            <View style={s.row}>
              {visible.map((item) => {
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
            <MoreButton
              hidden={items.length - visible.length}
              open={isOpen}
              onPress={() => setOpen(toggle(open, group.id))}
            />
          </View>
        );
      })}
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
  more: {
    alignSelf: "flex-start",
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  moreText: { ...theme.type.label, color: theme.colors.primary },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
