import { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MobileVillage } from "@gaavli/types";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { errorMessage } from "../errors";
import { theme } from "../theme";
import { Button, ErrorMessage, LoadingState, styles } from "./ui";

export function useVillageSearch() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const normalized = search.trim();
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(normalized), 300);
    return () => clearTimeout(timer);
  }, [normalized]);
  return {
    search,
    setSearch,
    debouncedSearch,
    searchPending: normalized !== debouncedSearch,
  };
}

type VillageQuery = {
  data?: { pages: { villages: MobileVillage[] }[] };
  isPending: boolean;
  isSuccess: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  error: unknown;
  refetch: () => unknown;
  fetchNextPage: () => unknown;
};

export function VillagePicker({
  open,
  selected,
  search,
  searchPending,
  query,
  hint,
  locationError,
  selectionError,
  saving = false,
  title,
  offlineHint,
  onSearch,
  onSelect,
  onClose,
}: {
  open: boolean;
  selected: MobileVillage | null;
  search: string;
  searchPending: boolean;
  query: VillageQuery;
  hint?: string;
  locationError?: string;
  selectionError?: string;
  saving?: boolean;
  title?: string;
  offlineHint?: string;
  onSearch: (value: string) => void;
  onSelect: (village: MobileVillage) => void;
  onClose: () => void;
}) {
  const language = useAppStore((state) => state.language);
  const offline = useAppStore((state) => state.offline);
  const t = messages(language);
  const villageName = (village: MobileVillage) =>
    language === "mr" ? village.nameMr : village.name;
  const villages = searchPending
    ? []
    : [
        ...new Map(
          query.data?.pages
            .flatMap((page) => page.villages)
            .map((village) => [village.id, village]),
        ).values(),
      ];
  const nameCounts = new Map<string, number>();
  for (const village of villages) {
    const name = villageName(village).trim().toLocaleLowerCase();
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  function loadMore() {
    if (
      !offline &&
      !saving &&
      !searchPending &&
      !query.isFetching &&
      !query.error &&
      query.hasNextPage
    )
      void query.fetchNextPage();
  }
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.close}
          disabled={saving}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <SafeAreaView
          edges={["bottom"]}
          style={s.sheet}
          accessibilityViewIsModal
        >
          <View style={s.header}>
            <Text accessibilityRole="header" style={s.title}>
              {title ?? t.villageTitle}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.close}
              disabled={saving}
              style={s.close}
              onPress={onClose}
            >
              <Text accessible={false} style={s.closeText}>
                ×
              </Text>
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel={t.searchVillage}
            placeholder={t.searchVillage}
            placeholderTextColor={theme.colors.placeholder}
            value={search}
            editable={!saving}
            onChangeText={onSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            maxLength={100}
            style={styles.input}
          />
          {hint && <Text style={s.hint}>{hint}</Text>}
          {locationError && <ErrorMessage message={locationError} />}
          {selectionError && <ErrorMessage message={selectionError} />}
          {saving && <LoadingState label={t.loading} />}
          {offline && (
            <Text style={s.hint}>{offlineHint ?? t.offlineAction}</Text>
          )}
          {(searchPending || query.isPending) && !offline && (
            <LoadingState label={t.loading} />
          )}
          {!!query.error && !searchPending && (
            <View style={s.retry}>
              <ErrorMessage message={errorMessage(query.error, language)} />
              <Button disabled={offline} onPress={() => void query.refetch()}>
                {t.retry}
              </Button>
            </View>
          )}
          <FlatList
            key={language + search.trim()}
            data={villages}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={s.options}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            renderItem={({ item }) => {
              const duplicate =
                (nameCounts.get(villageName(item).trim().toLocaleLowerCase()) ??
                  0) > 1;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: selected?.id === item.id,
                    disabled: saving,
                  }}
                  disabled={saving}
                  onPress={() => onSelect(item)}
                  style={[
                    s.option,
                    selected?.id === item.id && s.optionSelected,
                  ]}
                >
                  <View style={s.copy}>
                    <Text style={s.name}>{villageName(item)}</Text>
                    {duplicate && (
                      <Text style={s.detail}>
                        {[item.taluka, item.district]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    )}
                  </View>
                  {selected?.id === item.id && (
                    <Text accessibilityLabel={t.selected} style={s.check}>
                      ✓
                    </Text>
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              query.isSuccess && !searchPending ? (
                <Text style={s.hint}>
                  {search.trim() ? t.noVillageMatches : t.noVillages}
                </Text>
              ) : null
            }
            ListFooterComponent={
              query.isFetchingNextPage ? (
                <LoadingState label={t.loading} />
              ) : null
            }
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.sheet,
    borderTopRightRadius: theme.radii.sheet,
    height: "72%",
    paddingHorizontal: theme.spacing,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 22,
    lineHeight: 32,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  close: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 30, color: theme.colors.muted },
  hint: {
    fontSize: 15,
    lineHeight: 23,
    color: theme.colors.muted,
    paddingVertical: 12,
  },
  retry: { gap: 12, paddingVertical: 12 },
  options: { paddingVertical: 12 },
  option: {
    minHeight: theme.layout.touchTarget,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionSelected: { backgroundColor: theme.colors.tint },
  copy: { flex: 1, gap: 4 },
  name: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
    fontWeight: "600",
  },
  detail: { fontSize: 13, lineHeight: 20, color: theme.colors.muted },
  check: { color: theme.colors.primary, fontSize: 24 },
});
