import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { toHomeListing } from "../data/listings";
import { useMarketplaceListings } from "../listings";
import { useListingClock } from "../hooks/useListingClock";
import { theme } from "../theme";
import { Button, ErrorMessage, OfflineBanner } from "../components/ui";
import { MarketplaceListingCard } from "../components/dashboard/MarketplaceListingCard";
import { d } from "../components/dashboard/primitives";

export default function MarketplaceScreen() {
  const router = useRouter();
  const { language, offline, session } = useAppStore();
  const t = messages(language);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [focused, setFocused] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const result = useMarketplaceListings(search, category);
  const now = useListingClock();
  const page = result.data?.pages[0];
  const categories = [
    { id: "all", label: t.allCategories },
    { id: "vegetables", label: t.vegetables },
    { id: "fruits", label: t.fruits },
    { id: "grain", label: t.grains },
    { id: "dairy", label: t.dairy },
  ];
  const listings = Array.from(
    new Map(
      (result.data?.pages.flatMap((item) => item.listings) || [])
        .filter(
          (listing) =>
            listing.expiresAt === null || Date.parse(listing.expiresAt) > now,
        )
        .map((listing) => [listing.id, toHomeListing(listing, now)]),
    ).values(),
  );
  const village = session?.user.village;
  const villageName = village
    ? language === "mr"
      ? village.nameMr
      : village.name
    : t.villageLabel;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.safe}>
      {offline && (
        <OfflineBanner
          message={page ? t.listingsOffline : t.listingsOfflineEmpty}
        />
      )}
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshing={result.isRefetching}
        onRefresh={() => {
          if (!offline) void result.refetch();
        }}
        ListHeaderComponent={
          <View style={s.header}>
            <View style={s.titleRow}>
              <Text accessibilityRole="header" style={d.sectionTitle}>
                {t.marketplace}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${villageName}. ${t.changeVillage}`}
                onPress={() => router.push("/village")}
                style={({ pressed }) => [s.village, pressed && d.pressed]}
              >
                <Ionicons
                  name="location"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={s.villageText}>{villageName}</Text>
              </Pressable>
            </View>
            <View style={[s.search, focused && s.searchFocused]}>
              <Ionicons
                name="search-outline"
                size={20}
                color={theme.colors.muted}
              />
              <TextInput
                value={query}
                maxLength={100}
                onChangeText={setQuery}
                placeholder={t.cropSearch}
                placeholderTextColor={theme.colors.placeholder}
                accessibilityLabel={t.cropSearch}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="search"
                style={s.searchInput}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.voiceSearch}
                accessibilityHint={t.voiceSearchUnavailable}
                onPress={() =>
                  Alert.alert(t.voiceSearch, t.voiceSearchUnavailable)
                }
                style={({ pressed }) => [s.voiceSearch, pressed && d.pressed]}
              >
                <Ionicons
                  name="mic-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.categories}
            >
              {categories.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: category === item.id }}
                  onPress={() => setCategory(item.id)}
                  style={({ pressed }) => [
                    s.chip,
                    category === item.id && s.selectedChip,
                    pressed && d.pressed,
                  ]}
                >
                  <Text
                    style={[
                      s.chipText,
                      category === item.id && s.selectedChipText,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {result.isError && !offline && (
              <>
                <ErrorMessage message={t.listingsFailed} />
                <Button secondary onPress={() => void result.refetch()}>
                  {t.retry}
                </Button>
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text accessibilityLiveRegion="polite" style={s.empty}>
            {offline
              ? t.listingsOfflineEmpty
              : result.isPending
                ? t.listingsLoading
                : result.isError
                  ? ""
                  : search || category !== "all"
                    ? t.noListingMatches
                    : t.noListings}
          </Text>
        }
        ItemSeparatorComponent={() => <View style={s.separator} />}
        ListFooterComponent={
          result.hasNextPage && !result.isError ? (
            <View style={{ paddingTop: 14 }}>
              <Button
                secondary
                disabled={offline || result.isFetchingNextPage}
                loading={result.isFetchingNextPage}
                onPress={() => void result.fetchNextPage()}
              >
                {t.loadMore}
              </Button>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <MarketplaceListingCard
            listing={item}
            language={language}
            onPress={() =>
              router.push({
                pathname: "/product/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { ...d.content, gap: 0 },
  header: { gap: 14, paddingBottom: 16 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  village: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: theme.layout.touchTarget,
    maxWidth: "60%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.tint,
    borderRadius: theme.radii.pill,
  },
  villageText: {
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surface,
  },
  searchFocused: { borderColor: theme.colors.focusBorder },
  searchInput: {
    flex: 1,
    minHeight: theme.layout.touchTarget,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 16,
  },
  categories: { gap: 8 },
  voiceSearch: {
    minHeight: theme.layout.touchTarget,
    minWidth: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    minHeight: theme.layout.touchTarget,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.tint,
  },
  selectedChip: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.softGreen,
  },
  chipText: { color: theme.colors.muted, fontSize: 14, lineHeight: 22 },
  selectedChipText: { color: theme.colors.text, fontWeight: "600" },
  separator: { height: 14 },
  empty: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    paddingVertical: 24,
  },
});
