import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  directoryGroupLabel,
  directoryGroupsFor,
  isCatchAllGroup,
  type DirectoryGroupId,
} from "@gaavli/constants";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { useDirectory, useDirectorySummary } from "../directory";
import { theme } from "../theme";
import { Button, ErrorMessage, Screen, SkeletonList } from "../components/ui";
import { AppHeader, HeaderSearch } from "../components/AppHeader";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { DirectoryListCard } from "../components/dashboard/DirectoryListCard";
import { d } from "../components/dashboard/primitives";
import { CategoryIcon } from "../components/dashboard/CategoryIcon";

// Services and Transport: a row of round category chips to scroll through,
// and below it the list of what is available (all of it, or the chosen
// category). Search filters the same list.
export default function DirectoryScreen({
  module: initialModule,
  asTab = false,
}: {
  module: "services" | "transport";
  // Opened from the bottom bar, where the bar itself is the way back.
  asTab?: boolean;
}) {
  const router = useRouter();
  // Transport is a kind of service, so one screen switches between the two
  // lists; each keeps its own categories and search.
  const [module, setModule] = useState(initialModule);
  const { language, offline } = useAppStore();
  const t = messages(language);
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<DirectoryGroupId | null>(null);
  // A search spoken on the bottom bar, or "View All" from the global search,
  // arrives here and applies once per request.
  const incoming = useLocalSearchParams<{ q?: string; v?: string }>();
  const [applied, setApplied] = useState<string | undefined>(undefined);
  if (incoming.v && incoming.v !== applied) {
    setApplied(incoming.v);
    const text = (incoming.q ?? "").trim();
    setInput(text);
    setSearch(text);
    setCategory(null);
  }
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);
  const summary = useDirectorySummary(module);
  const counts = new Map(summary.data?.groups.map((g) => [g.id, g.count]));
  const query = useDirectory(module, search, category);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [category]);
  const entries = Array.from(
    new Map(
      (query.data?.pages.flatMap((page) => page.entries) ?? []).map((entry) => [
        entry.id,
        entry,
      ]),
    ).values(),
  );
  const title =
    module === "services" ? t.dashboardServices : t.dashboardTransport;
  // Chips for every category, but the catch-all only when something is in it.
  // Categories with listings come first; within each group the order is set in
  // one place (emergency help, government offices and ambulances lead).
  const allTiles = directoryGroupsFor(module).filter(
    (group) => !isCatchAllGroup(group.id) || (counts.get(group.id) ?? 0) > 0,
  );
  const tiles = [
    ...allTiles.filter((group) => (counts.get(group.id) ?? 0) > 0),
    ...allTiles.filter((group) => !(counts.get(group.id) ?? 0)),
  ];
  const listTitle = category
    ? `${directoryGroupLabel(category, language)}${counts.has(category) ? ` (${counts.get(category)})` : ""}`
    : module === "services"
      ? t.directoryAvailableServices
      : t.directoryAvailableTransport;
  const tone = theme.modules[module];
  const switchTo = (next: "services" | "transport") => {
    if (next === module) return;
    setModule(next);
    setCategory(null);
    setInput("");
    setSearch("");
  };
  return (
    <ProtectedPage allowGuest>
      <Screen
        scrollRef={scrollRef}
        inTabs={asTab}
        header={
          <AppHeader
            title={title}
            tone={module}
            subtitle={
              module === "services" ? t.tileServicesHint : t.tileTransportHint
            }
            back={asTab ? undefined : "/home"}
            // Inside a category (or a search) the way back is up one level,
            // from the same fixed spot as everywhere else.
            onBack={
              category || input.trim()
                ? () => {
                    setCategory(null);
                    setInput("");
                    setSearch("");
                  }
                : undefined
            }
          >
            <View accessibilityRole="tablist" style={s.switch}>
              {(["services", "transport"] as const).map((kind) => {
                const on = kind === module;
                return (
                  <Pressable
                    key={kind}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    onPress={() => switchTo(kind)}
                    style={[s.segment, on && s.segmentOn]}
                  >
                    <Ionicons
                      accessible={false}
                      name={
                        kind === "services" ? "build-outline" : "car-outline"
                      }
                      size={18}
                      color={
                        on ? theme.modules[kind].color : theme.colors.heroText
                      }
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        s.segmentText,
                        on && { color: theme.modules[kind].color },
                      ]}
                    >
                      {kind === "services"
                        ? t.dashboardServices
                        : t.dashboardTransport}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <HeaderSearch
              label={t.search}
              placeholder={
                module === "services"
                  ? t.directorySearchServices
                  : t.directorySearchTransport
              }
              value={input}
              onChangeText={setInput}
            />
          </AppHeader>
        }
      >
        <Text accessibilityRole="header" style={s.sectionTitle}>
          {t.directoryBrowse}
        </Text>
        {summary.isError && !summary.data && !offline && (
          <>
            <ErrorMessage message={t.dashboardDirectoryFailed} />
            <Button secondary onPress={() => void summary.refetch()}>
              {t.retry}
            </Button>
          </>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipScroll}
          contentContainerStyle={s.chips}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !category }}
            onPress={() => setCategory(null)}
            style={s.chip}
          >
            <View
              style={[
                s.circle,
                s.allCircle,
                { backgroundColor: tone.tint },
                !category && { borderColor: tone.color, borderWidth: 2 },
              ]}
            >
              <Ionicons
                accessible={false}
                name="apps"
                size={24}
                color={tone.color}
              />
            </View>
            <Text
              numberOfLines={2}
              style={[s.chipLabel, !category && { color: tone.color }]}
            >
              {t.dirAllCategoriesChip}
            </Text>
          </Pressable>
          {tiles.map((group) => {
            const count = counts.get(group.id) ?? 0;
            const on = category === group.id;
            return (
              <Pressable
                key={group.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${group[language]}${count ? `, ${count}` : ""}`}
                onPress={() => setCategory(on ? null : group.id)}
                style={s.chip}
              >
                <View
                  style={[
                    s.circle,
                    s.allCircle,
                    { backgroundColor: tone.tint },
                    on && { borderColor: tone.color, borderWidth: 2 },
                    !count && s.dim,
                  ]}
                >
                  <CategoryIcon
                    name={group.icon ?? "apps-outline"}
                    size={24}
                    color={tone.color}
                  />
                </View>
                <Text
                  numberOfLines={2}
                  style={[s.chipLabel, on && { color: tone.color }]}
                >
                  {group[language]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text accessibilityRole="header" style={s.sectionTitle}>
          {listTitle}
        </Text>
        {offline && (
          <Text style={d.description}>
            {query.data ? t.listingsOffline : t.listingsOfflineEmpty}
          </Text>
        )}
        {!offline && query.isPending && (
          <SkeletonList rows={4} label={t.listingsLoading} />
        )}
        {query.isError && !offline && (
          <>
            <ErrorMessage message={t.dashboardDirectoryFailed} />
            <Button secondary onPress={() => void query.refetch()}>
              {t.retry}
            </Button>
          </>
        )}
        {!query.isPending && !query.isError && !entries.length && (
          <Text style={d.description}>{t.dashboardDirectoryEmpty}</Text>
        )}
        {entries.map((entry) => (
          <DirectoryListCard
            key={entry.id}
            entry={entry}
            language={language}
            onPress={() =>
              router.push({
                pathname: "/directory/[id]",
                params: { id: entry.id },
              })
            }
          />
        ))}
        {query.hasNextPage && (
          <Button
            secondary
            disabled={offline || query.isFetching}
            loading={query.isFetchingNextPage}
            onPress={() => void query.fetchNextPage()}
          >
            {t.marketplaceShowMore}
          </Button>
        )}
      </Screen>
    </ProtectedPage>
  );
}
const s = StyleSheet.create({
  // Services | Transport, on the dark header band.
  switch: {
    flexDirection: "row",
    padding: 3,
    gap: 3,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.heroSurface,
    borderWidth: 1,
    borderColor: theme.colors.heroBorder,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: theme.radii.control - 3,
  },
  segmentOn: { backgroundColor: theme.colors.surface },
  segmentText: { ...theme.type.label, color: theme.colors.heroText },
  sectionTitle: { ...theme.type.heading, color: theme.colors.heading },
  // Bleeds to the screen edges so the chips scroll under the margins.
  chipScroll: { marginHorizontal: -theme.layout.screenPadding, flexGrow: 0 },
  chips: {
    gap: 8,
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: 4,
  },
  // Same size as the Home quick actions.
  chip: { width: 68, alignItems: "center", gap: 6 },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: theme.colors.surfaceMuted,
  },
  allCircle: { alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.45 },
  chipLabel: {
    ...theme.type.micro,
    color: theme.colors.heading,
    textAlign: "center",
  },
});
