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

export function BrowsingVillageSelector() {
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
    ? language === "mr"
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
        style={({ pressed }) => [s.control, pressed && s.pressed]}
      >
        <Ionicons
          accessible={false}
          name="location-outline"
          size={18}
          color={theme.colors.primaryDark}
        />
        <Text numberOfLines={1} style={s.name}>
          {name}
        </Text>
        {saving ? (
          <ActivityIndicator size="small" color={theme.colors.primaryDark} />
        ) : (
          <Ionicons
            accessible={false}
            name="chevron-down"
            size={16}
            color={theme.colors.primaryDark}
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
    minHeight: theme.layout.touchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.tint,
    flexShrink: 1,
    maxWidth: "100%",
  },
  name: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.text,
    fontWeight: "600",
    flexShrink: 1,
  },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
