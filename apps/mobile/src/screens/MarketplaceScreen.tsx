import { productDisplayName, numberLocale } from "../locale";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  SectionList,
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
import { MARKETPLACE_PAGE_SIZE, useMarketplaceListings } from "../listings";
import { useListingClock } from "../hooks/useListingClock";
import { theme } from "../theme";
import {
  Button,
  Chip,
  ErrorMessage,
  OfflineBanner,
  StateMessage,
} from "../components/ui";
import { MarketplaceListingCard } from "../components/dashboard/MarketplaceListingCard";
import { MarketplaceHeader } from "../components/dashboard/MarketplaceHeader";
import { d } from "../components/dashboard/primitives";
import { useQuery } from "@tanstack/react-query";
import { productMasterPageSchema } from "@gaavli/validation";
import { loadMasterProducts } from "../data/productMaster";
import { produceVoiceHints, voiceProductSearch } from "../data/voiceSearch";
import { productMasterCache } from "../storage/sqlite";
import { api } from "../api";
import { authenticatedApi } from "../session";
import { useVoiceSearch } from "../hooks/useVoiceSearch";
import { browsingVillageFor } from "../storage/browsingVillage";

export default function MarketplaceScreen() {
  const router = useRouter();
  const { language, offline, session } = useAppStore();
  const t = messages(language);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [focused, setFocused] = useState(false);
  const [search, setSearch] = useState("");
  const browsingVillage = useAppStore(browsingVillageFor);
  const sourceId = browsingVillage?.id;
  const scope = `${session?.user.id ?? "guest"}:${sourceId}`;
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 200);
    return () => clearTimeout(timer);
  }, [query]);
  const result = useMarketplaceListings(search, category);
  const unavailableResult = useMarketplaceListings(
    search,
    category,
    "unavailable",
  );
  const filterKey = JSON.stringify([scope, search, category]);
  const [pagination, setPagination] = useState({
    key: filterKey,
    active: MARKETPLACE_PAGE_SIZE,
    unavailable: MARKETPLACE_PAGE_SIZE,
  });
  const counts =
    pagination.key === filterKey
      ? pagination
      : {
          key: filterKey,
          active: MARKETPLACE_PAGE_SIZE,
          unavailable: MARKETPLACE_PAGE_SIZE,
        };
  if (pagination.key !== filterKey) setPagination(counts);
  async function showMore(unavailable: boolean) {
    const feed = unavailable ? unavailableResult : result;
    const key = unavailable ? "unavailable" : "active";
    const next = counts[key] + MARKETPLACE_PAGE_SIZE;
    const loaded =
      feed.data?.pages.reduce((sum, page) => sum + page.listings.length, 0) ??
      0;
    if (loaded < next && feed.hasNextPage) {
      const response = await feed.fetchNextPage();
      if (response.isError) return;
    }
    setPagination((current) =>
      current.key === filterKey ? { ...current, [key]: next } : current,
    );
  }
  function refresh() {
    if (!offline) {
      void result.refetch();
      void unavailableResult.refetch();
    }
  }
  const products = useQuery({
    queryKey: ["product-master", session?.user.id ?? "guest", offline],
    enabled: !!sourceId && (!session || !!session.user.village),
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
    hints: [
      ...produceVoiceHints(),
      ...(products.data?.products.map((product) =>
        productDisplayName(language, {
          en: product.nameEn,
          mr: product.nameMr,
          hi: product.nameHi,
        }),
      ) || []),
    ],
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
  const number = new Intl.NumberFormat(numberLocale(language));
  function categoryCount(item: { id: string }) {
    const count =
      item.id === "all"
        ? page?.allProductCount
        : page?.productGroupCounts?.find((row) => row.productGroup === item.id)
            ?.count;
    return count ? number.format(count) : undefined;
  }
  const categories = [
    {
      id: "all",
      label: t.marketplaceAllProducts,
    },
    {
      id: "vegetables",
      label: t.vegetables,
    },
    { id: "fruits", label: t.fruits },
    { id: "grain", label: t.grains },
    { id: "dairy", label: t.dairy },
    { id: "homemade", label: t.homemade },
  ];
  const activeListings = Array.from(
    new Map(
      (result.data?.pages.flatMap((item) => item.listings) || [])
        .filter(
          (listing) =>
            listing.expiresAt === null || Date.parse(listing.expiresAt) > now,
        )
        .map((listing) => [listing.id, toHomeListing(listing, now)]),
    ).values(),
  );
  const activeIds = new Set(activeListings.map((listing) => listing.id));
  const unavailableListings = Array.from(
    new Map(
      (unavailableResult.data?.pages.flatMap((item) => item.listings) || [])
        .filter((listing) => !activeIds.has(listing.id))
        .map((listing) => [listing.id, toHomeListing(listing, now)]),
    ).values(),
  );
  const sections = [
    {
      key: "active",
      title: t.marketplaceActiveListings,
      data: activeListings.slice(0, counts.active),
      feed: result,
      unavailable: false,
      visible: counts.active,
    },
    {
      key: "unavailable",
      title: t.marketplaceUnavailableListings,
      data: unavailableListings.slice(0, counts.unavailable),
      feed: unavailableResult,
      unavailable: true,
      visible: counts.unavailable,
    },
  ];
  function submitSearch() {
    voice.cancel();
    const value = query.trim();
    setSearch(value);
    if (value === search) refresh();
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.safe}>
      {offline && (
        <OfflineBanner
          message={
            page || unavailableResult.data
              ? t.listingsOffline
              : t.listingsOfflineEmpty
          }
        />
      )}
      <SectionList
        sections={sections}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshing={
          (result.isRefetching && !result.isFetchingNextPage) ||
          (unavailableResult.isRefetching &&
            !unavailableResult.isFetchingNextPage)
        }
        onRefresh={refresh}
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
                <Chip
                  key={item.id}
                  label={item.label}
                  count={categoryCount(item)}
                  selected={category === item.id}
                  onPress={() => setCategory(item.id)}
                />
              ))}
            </ScrollView>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={s.sectionTitle}>
            {section.title}
          </Text>
        )}
        renderSectionFooter={({ section }) => {
          const feed = section.feed;
          const loaded = section.unavailable
            ? unavailableListings.length
            : activeListings.length;
          return (
            <View style={s.sectionFooter}>
              {feed.isError && !offline && (
                <>
                  <ErrorMessage message={t.listingsFailed} />
                  <Button secondary onPress={() => void feed.refetch()}>
                    {t.retry}
                  </Button>
                </>
              )}
              {!section.data.length && !(feed.isError && !offline) && (
                <View accessibilityLiveRegion="polite" style={s.empty}>
                  <StateMessage
                    icon={
                      offline
                        ? "cloud-offline-outline"
                        : feed.isPending
                          ? "hourglass-outline"
                          : "basket-outline"
                    }
                    title={
                      offline
                        ? t.listingsOfflineEmpty
                        : feed.isPending
                          ? t.listingsLoading
                          : section.unavailable
                            ? t.marketplaceNoUnavailable
                            : search || category !== "all"
                              ? t.noListingMatches
                              : t.noListings
                    }
                  />
                </View>
              )}
              {(loaded > section.visible || feed.hasNextPage) && (
                <Button
                  secondary
                  disabled={offline || feed.isFetching}
                  loading={feed.isFetchingNextPage}
                  onPress={() => void showMore(section.unavailable)}
                >
                  {t.marketplaceShowMore}
                </Button>
              )}
            </View>
          );
        }}
        renderItem={({ item, section }) => (
          <MarketplaceListingCard
            listing={item}
            language={language}
            unavailable={section.unavailable}
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
  content: { ...d.content, gap: 8 },
  sectionTitle: {
    color: theme.colors.heading,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionFooter: { gap: 10, paddingBottom: 12 },
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
  voiceSearch: {
    minHeight: theme.layout.touchTarget,
    minWidth: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { paddingVertical: 8 },
});
