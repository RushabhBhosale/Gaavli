import { useEffect, useState } from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  directoryGroupLabel,
  directoryGroupsFor,
  isCatchAllGroup,
  type DirectoryGroupId,
} from "@gaavli/constants";
import { useAppStore } from "../store";
import { formatMessage, messages } from "../i18n";
import { useDirectory, useDirectorySummary } from "../directory";
import { directoryPreview } from "../data/directory";
import { theme } from "../theme";
import { Button, ErrorMessage, Screen, SkeletonList } from "../components/ui";
import { AppHeader, HeaderSearch } from "../components/AppHeader";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { ProductCard } from "../components/dashboard/ProductCard";
import { d } from "../components/dashboard/primitives";
import {
  directoryGroupFallbacks,
  directoryGroupImages,
} from "../components/dashboard/directoryGroupImages";

// Services and Transport: category tiles first, so a villager sees what is
// on offer at a glance; tap a tile (or type in the search box) for the list.
const VISIBLE_TILES = 6;

export default function DirectoryScreen({
  module,
  asTab = false,
}: {
  module: "services" | "transport";
  // Opened from the bottom bar, where the bar itself is the way back.
  asTab?: boolean;
}) {
  const router = useRouter();
  const { language, offline } = useAppStore();
  const t = messages(language);
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
  // Only the first few tiles show until "See all" opens the rest in place.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);
  const summary = useDirectorySummary(module);
  const counts = new Map(summary.data?.groups.map((g) => [g.id, g.count]));
  const showTiles = !category && !input.trim();
  const query = useDirectory(module, search, category);
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
  // Tiles for every category, but the catch-all only when something is in it.
  const allTiles = directoryGroupsFor(module).filter(
    (group) => !isCatchAllGroup(group.id) || (counts.get(group.id) ?? 0) > 0,
  );
  // Categories with something in them come first; order is otherwise stable.
  const ordered = [
    ...allTiles.filter((group) => (counts.get(group.id) ?? 0) > 0),
    ...allTiles.filter((group) => !(counts.get(group.id) ?? 0)),
  ];
  const tiles = expanded ? ordered : ordered.slice(0, VISIBLE_TILES);
  return (
    <ProtectedPage allowGuest>
      <Screen
        header={
          <AppHeader
            title={title}
            tone={module}
            subtitle={
              module === "services" ? t.tileServicesHint : t.tileTransportHint
            }
            back={asTab ? undefined : "/home"}
          >
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
        {category && (
          <View style={s.crumb}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.directoryAllCategories}
              onPress={() => {
                setCategory(null);
              }}
              style={({ pressed }) => [s.crumbBack, pressed && s.pressed]}
            >
              <Ionicons
                accessible={false}
                name="chevron-back"
                size={18}
                color={theme.colors.steel}
              />
              <Text style={s.crumbBackText}>{t.directoryAllCategories}</Text>
            </Pressable>
            <Text accessibilityRole="header" style={s.crumbTitle}>
              {`${directoryGroupLabel(category, language)}${counts.has(category) ? ` (${counts.get(category)})` : ""}`}
            </Text>
          </View>
        )}
        {showTiles && (
          <>
            <Text accessibilityRole="header" style={s.sectionTitle}>
              {t.directoryBrowse}
            </Text>
            {summary.isPending && !offline && (
              <SkeletonList rows={3} label={t.listingsLoading} />
            )}
            {summary.isError && !summary.data && !offline && (
              <>
                <ErrorMessage message={t.dashboardDirectoryFailed} />
                <Button secondary onPress={() => void summary.refetch()}>
                  {t.retry}
                </Button>
              </>
            )}
            {offline && !summary.data && (
              <Text style={d.description}>{t.listingsOfflineEmpty}</Text>
            )}
            {summary.data && (
              <View style={s.grid}>
                {tiles.map((group) => {
                  const count = counts.get(group.id) ?? 0;
                  return (
                    <Pressable
                      key={group.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${group[language]}, ${count ? formatMessage(t.dashboardAvailableCount, { count: String(count) }) : t.directoryNoneYet}`}
                      onPress={() => setCategory(group.id)}
                      style={({ pressed }) => [s.tile, pressed && s.pressed]}
                    >
                      {directoryGroupImages[group.id] ? (
                        <ImageBackground
                          source={directoryGroupImages[group.id]!}
                          resizeMode="cover"
                          accessible={false}
                          style={s.tileImage}
                          imageStyle={!count ? s.tileImageEmpty : undefined}
                        >
                          <View style={s.tileBar}>
                            <Text numberOfLines={2} style={s.tileLabel}>
                              {group[language]}
                            </Text>
                            <View
                              style={[s.tileCount, !!count && s.tileCountOn]}
                            >
                              <Text style={s.tileCountText}>
                                {count
                                  ? formatMessage(t.dashboardAvailableCount, {
                                      count: String(count),
                                    })
                                  : t.directoryNoneYet}
                              </Text>
                            </View>
                          </View>
                        </ImageBackground>
                      ) : (
                        <View
                          accessible={false}
                          style={[
                            s.tileImage,
                            {
                              backgroundColor:
                                directoryGroupFallbacks[group.id]?.color ??
                                theme.colors.steel,
                            },
                          ]}
                        >
                          <Ionicons
                            accessible={false}
                            name={
                              (directoryGroupFallbacks[group.id]?.icon ??
                                "apps-outline") as never
                            }
                            size={56}
                            color="rgba(255,255,255,0.35)"
                            style={s.tileGlyph}
                          />
                          <View style={s.tileBar}>
                            <Text numberOfLines={2} style={s.tileLabel}>
                              {group[language]}
                            </Text>
                            <View
                              style={[s.tileCount, !!count && s.tileCountOn]}
                            >
                              <Text style={s.tileCountText}>
                                {count
                                  ? formatMessage(t.dashboardAvailableCount, {
                                      count: String(count),
                                    })
                                  : t.directoryNoneYet}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
            {summary.data && ordered.length > VISIBLE_TILES && (
              <Button secondary onPress={() => setExpanded(!expanded)}>
                {expanded
                  ? t.directoryShowFewer
                  : formatMessage(t.directorySeeAll, {
                      count: String(ordered.length - VISIBLE_TILES),
                    })}
              </Button>
            )}
          </>
        )}
        {!showTiles && (
          <>
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
              <ProductCard
                key={entry.id}
                listing={directoryPreview(entry)}
                language={language}
                compact
                wide
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
          </>
        )}
      </Screen>
    </ProtectedPage>
  );
}
const s = StyleSheet.create({
  sectionTitle: { ...theme.type.heading, color: theme.colors.heading },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  // Two picture tiles per row: the artwork shows what the category is, a
  // dark strip along the bottom carries its name and how many are listed.
  tile: {
    width: "48%",
    flexGrow: 1,
    aspectRatio: 1.2,
    borderRadius: theme.radii.card,
    overflow: "hidden",
    backgroundColor: theme.colors.steel,
  },
  tileImage: { flex: 1, justifyContent: "flex-end" },
  tileGlyph: { position: "absolute", top: 18, right: 18 },
  tileImageEmpty: { opacity: 0.9 },
  tileBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 4,
    backgroundColor: "rgba(22,34,45,0.64)",
  },
  tileLabel: { ...theme.type.subheading, color: theme.colors.onPrimary },
  tileCount: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: theme.radii.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  tileCountOn: { backgroundColor: theme.colors.primary },
  tileCountText: { ...theme.type.micro, color: theme.colors.onPrimary },
  crumb: { gap: 6 },
  crumbBack: {
    alignSelf: "flex-start",
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingRight: 8,
  },
  crumbBackText: { ...theme.type.label, color: theme.colors.steel },
  crumbTitle: { ...theme.type.heading, color: theme.colors.heading },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
