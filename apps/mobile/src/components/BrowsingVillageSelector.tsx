import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { MobileVillage } from "@gaavli/types";
import { villagePageSchema } from "@gaavli/validation";
import { api } from "../api";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { theme } from "../theme";
import {
  browsingVillageFor,
  selectBrowsingVillage,
} from "../storage/browsingVillage";
import { preferenceStorage } from "../storage/sqlite";
import { VillagePicker, useVillageSearch } from "./VillagePicker";

export function BrowsingVillageSelector({
  onDark = false,
}: {
  onDark?: boolean;
}) {
  const selected = useAppStore(browsingVillageFor);
  const language = useAppStore((state) => state.language);
  const offline = useAppStore((state) => state.offline);
  const t = messages(language);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const submitting = useRef(false);
  const { search, setSearch, debouncedSearch, searchPending } =
    useVillageSearch();
  const query = useInfiniteQuery({
    queryKey: ["browse-villages", debouncedSearch],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api(
        `/villages?page=${pageParam}&limit=20&search=${encodeURIComponent(debouncedSearch)}`,
        villagePageSchema,
        { signal },
      ),
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    enabled: open && !offline,
  });
  async function choose(village: MobileVillage) {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setFailure("");
    try {
      await selectBrowsingVillage(
        preferenceStorage,
        village,
        useAppStore.getState().setBrowsingVillage,
      );
      setOpen(false);
    } catch {
      setFailure(t.storageError);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  const name = selected
    ? language !== "en"
      ? selected.nameMr
      : selected.name
    : t.villageTitle;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t.browsingVillage}: ${name}. ${t.chooseBrowsingVillage}`}
        accessibilityState={{ expanded: open, disabled: saving }}
        disabled={saving}
        onPress={() => {
          setSearch("");
          setFailure("");
          setOpen(true);
        }}
        style={({ pressed }) => [
          s.control,
          onDark && s.controlDark,
          pressed && s.pressed,
        ]}
      >
        <Ionicons
          accessible={false}
          name="location"
          size={18}
          color={onDark ? theme.colors.heroText : theme.colors.primary}
        />
        <Text numberOfLines={1} style={[s.name, onDark && s.nameDark]}>
          {name}
        </Text>
        {saving ? (
          <ActivityIndicator size="small" color={theme.colors.primaryDark} />
        ) : (
          <Ionicons
            accessible={false}
            name="chevron-down"
            size={16}
            color={onDark ? theme.colors.heroMuted : theme.colors.muted}
          />
        )}
      </Pressable>
      <VillagePicker
        open={open}
        selected={selected}
        search={search}
        searchPending={searchPending}
        query={query}
        saving={saving}
        selectionError={failure}
        title={t.chooseBrowsingVillage}
        offlineHint={t.browsingVillageOffline}
        onSearch={setSearch}
        onClose={() => {
          if (!submitting.current) setOpen(false);
        }}
        onSelect={(village) => void choose(village)}
      />
    </>
  );
}
const s = StyleSheet.create({
  control: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 1,
    maxWidth: "100%",
  },
  controlDark: {
    backgroundColor: theme.colors.heroSurface,
    borderColor: theme.colors.heroBorder,
  },
  name: { ...theme.type.label, color: theme.colors.text, flexShrink: 1 },
  nameDark: { color: theme.colors.heroText },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
