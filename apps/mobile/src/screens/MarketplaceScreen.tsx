import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
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
import { MarketplaceHeader } from "../components/dashboard/MarketplaceHeader";
import { d } from "../components/dashboard/primitives";
import { useQuery } from "@tanstack/react-query";
import { productMasterPageSchema } from "@gaavli/validation";
import { loadMasterProducts } from "../data/productMaster";
import { voiceProductSearch } from "../data/voiceSearch";
import { productMasterCache } from "../storage/sqlite";
import { api } from "../api";
import { authenticatedApi } from "../session";
import { useVoiceSearch } from "../hooks/useVoiceSearch";
import { browsingVillageFor } from "../storage/browsingVillage";

export default function MarketplaceScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { language, offline, session, guestVillage } = useAppStore();
  const cardWidth =
    (Math.min(windowWidth, theme.layout.contentWidth) - 20 * 2 - 12) / 2;
  const t = messages(language);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("vegetables");
  const [focused, setFocused] = useState(false);
  const [search, setSearch] = useState("");
  const [villageFilter, setVillageFilter] = useState<{
    scope: string;
    id: string;
  } | null>(null);
  const browsingVillage = useAppStore(browsingVillageFor);
  const sourceId = browsingVillage?.id;
  const scope = `${session?.user.id ?? "guest"}:${sourceId}`;
  const selectedVillageId =
    villageFilter?.scope === scope ? villageFilter.id : undefined;
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const result = useMarketplaceListings(search, category, selectedVillageId);
  const products = useQuery({
    queryKey: ["product-master", session?.user.id ?? "guest", offline],
    enabled: session ? !!session.user.village : !!guestVillage,
    queryFn: () =>
      loadMasterProducts({
        storage: productMasterCache,
        offline,
        fetch: () =>
          (session ? authenticatedApi : api)(
            "/product-master",
            productMasterPageSchema,
          ),
      }),
    networkMode: "always",
    retry: false,
  });
  const voice = useVoiceSearch({
    language,
    scope,
    hints:
      products.data?.products.map((product) =>
        language === "mr" ? product.nameMr : product.nameEn,
      ) || [],
    onResult: (transcript) => {
      const normalized = voiceProductSearch(
        transcript,
        language,
        products.data?.products,
      );
      if (!normalized.text) return;
      setQuery(normalized.text);
      setSearch(normalized.text);
      if (normalized.productGroup) {
        setCategory(
          ["vegetables", "fruits", "grain", "dairy", "homemade"].includes(
            normalized.productGroup,
          )
            ? normalized.productGroup
            : "all",
        );
      }
    },
  });
  const voiceBusy = voice.status !== "idle";
  const voiceError = voice.error
    ? {
        permission: t.voicePermission,
        unavailable: t.voiceService,
        noSpeech: t.voiceNoSpeech,
        network: t.voiceNetwork,
        language: t.voiceLanguage,
        failed: t.voiceFailed,
        build: t.voiceBuild,
      }[voice.error]
    : null;
  const now = useListingClock();
  const page = result.data?.pages[0];
  const villageCounts = page?.villageCounts || [];
  const allVillageCount = page
    ? villageCounts.length
      ? villageCounts.reduce((sum, village) => sum + village.count, 0)
      : page.total
    : undefined;
  const number = new Intl.NumberFormat(
    language === "mr" ? "mr-IN-u-nu-deva" : "en-IN",
  );
  const categories = [
    {
      id: "vegetables",
      label: t.vegetables,
      icon: "🍅",
      background: "#E9F4E7",
    },
    { id: "fruits", label: t.fruits, icon: "🍎", background: "#FFF3DF" },
    { id: "grain", label: t.grains, icon: "🌾", background: "#FFF5DD" },
    { id: "dairy", label: t.dairy, icon: "🥛", background: "#EAF2FF" },
    { id: "homemade", label: t.homemade, icon: "🍯", background: "#FFF1D8" },
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
  function submitSearch() {
    voice.cancel();
    const value = query.trim();
    setSearch(value);
    if (value === search && !offline) void result.refetch();
  }

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
        numColumns={2}
        columnWrapperStyle={listings.length ? s.gridRow : undefined}
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
            <MarketplaceHeader language={language}>
              <View style={[s.search, focused && s.searchFocused]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.search}
                  onPress={submitSearch}
                  style={({ pressed }) => [s.voiceSearch, pressed && d.pressed]}
                >
                  <Ionicons
                    name="search-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                </Pressable>
                <TextInput
                  multiline={false}
                  value={query}
                  maxLength={100}
                  onChangeText={(value) => {
                    voice.cancel();
                    voice.clearError();
                    setQuery(value);
                  }}
                  placeholder={t.marketplaceSearchPlaceholder}
                  placeholderTextColor={theme.colors.placeholder}
                  accessibilityLabel={t.marketplaceSearchPlaceholder}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  returnKeyType="search"
                  onSubmitEditing={submitSearch}
                  style={s.searchInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={voiceBusy ? t.voiceCancel : t.voiceSearch}
                  accessibilityState={{ selected: voiceBusy }}
                  onPress={voiceBusy ? voice.cancel : voice.start}
                  style={({ pressed }) => [
                    s.voiceSearch,
                    voiceBusy && s.voiceActive,
                    pressed && d.pressed,
                  ]}
                >
                  <Ionicons
                    name={voiceBusy ? "stop-circle-outline" : "mic-outline"}
                    size={22}
                    color={theme.colors.primary}
                  />
                </Pressable>
              </View>
              {voiceBusy && (
                <View style={s.voiceStatus}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primaryDark}
                  />
                  <Text
                    accessibilityLiveRegion="polite"
                    style={s.voiceStatusText}
                  >
                    {voice.status === "requesting"
                      ? t.voiceRequesting
                      : voice.status === "processing"
                        ? t.voiceProcessing
                        : t.voiceListening}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.voiceCancel}
                    onPress={voice.cancel}
                    style={s.voiceSearch}
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={theme.colors.heading}
                    />
                  </Pressable>
                </View>
              )}
              {voiceError && <ErrorMessage message={voiceError} />}
              {voice.error === "permission" && (
                <Button
                  secondary
                  onPress={() => {
                    void Linking.openSettings().catch(() => undefined);
                  }}
                >
                  {t.voiceSettings}
                </Button>
              )}
            </MarketplaceHeader>
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
                  style={({ pressed }) => [s.category, pressed && d.pressed]}
                >
                  <View
                    style={[
                      s.categoryIcon,
                      { backgroundColor: item.background },
                      category === item.id && s.selectedCategory,
                    ]}
                  >
                    <Text accessible={false} style={s.categoryEmoji}>
                      {item.icon}
                    </Text>
                  </View>
                  <Text
                    style={[
                      s.categoryText,
                      category === item.id && s.selectedCategoryText,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.villageFilters}
            >
              {[
                {
                  id: "all",
                  name: t.allCategories,
                  nameMr: t.allCategories,
                  count: allVillageCount,
                },
                ...villageCounts,
              ].map((village) => {
                const selected =
                  village.id === "all"
                    ? !selectedVillageId
                    : village.id === selectedVillageId;
                const label = language === "mr" ? village.nameMr : village.name;
                return (
                  <Pressable
                    key={village.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${label} (${village.count === undefined ? "—" : number.format(village.count)})`}
                    accessibilityState={{ selected }}
                    onPress={() =>
                      setVillageFilter(
                        village.id === "all" ? null : { scope, id: village.id },
                      )
                    }
                    style={({ pressed }) => [
                      s.villageFilter,
                      selected && s.selectedVillageFilter,
                      pressed && d.pressed,
                    ]}
                  >
                    <Text style={s.villageFilterText}>
                      {label} (
                      {village.count === undefined
                        ? "—"
                        : number.format(village.count)}
                      )
                    </Text>
                  </Pressable>
                );
              })}
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
            width={cardWidth}
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
  content: { ...d.content, gap: 12 },
  gridRow: { gap: 12, alignItems: "flex-start" },
  header: { gap: 14, paddingBottom: 4 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surface,
  },
  searchFocused: { borderColor: theme.colors.focusBorder },
  voiceActive: {
    backgroundColor: theme.colors.tint,
    borderRadius: theme.radii.pill,
  },
  voiceStatus: { flexDirection: "row", alignItems: "center", gap: 8 },
  voiceStatusText: { ...d.description, flex: 1 },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: theme.layout.touchTarget,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 16,
  },
  categories: { gap: 8, paddingVertical: 4 },
  villageFilters: { gap: 8, paddingVertical: 2 },
  villageFilter: {
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.control,
  },
  selectedVillageFilter: {
    backgroundColor: theme.colors.tint,
    borderColor: theme.colors.primary,
  },
  villageFilterText: {
    ...d.description,
    color: theme.colors.text,
    fontWeight: "600",
  },
  voiceSearch: {
    minHeight: theme.layout.touchTarget,
    minWidth: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  category: {
    minHeight: theme.layout.touchTarget,
    width: 88,
    alignItems: "center",
    gap: 6,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCategory: { borderColor: theme.colors.primaryDark },
  categoryEmoji: { fontSize: 26, lineHeight: 34 },
  categoryText: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  selectedCategoryText: { color: theme.colors.text, fontWeight: "600" },
  empty: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    paddingVertical: 24,
  },
});
