import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
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
import {
  BackButton,
  Button,
  ErrorMessage,
  Input,
  Screen,
  SkeletonList,
} from "../components/ui";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { ProductCard } from "../components/dashboard/ProductCard";
import { d } from "../components/dashboard/primitives";
import { directoryGroupIcons } from "../components/dashboard/directoryGroupIcons";

// Services and Transport: category tiles first, so a villager sees what is
// on offer at a glance; tap a tile (or type in the search box) for the list.
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
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);
  const summary = useDirectorySummary(module);
  const counts = new Map(summary.data?.groups.map((g) => [g.id, g.count]));
  const showTiles = !category && !showAll && !input.trim();
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
  const tiles = directoryGroupsFor(module).filter(
    (group) => !isCatchAllGroup(group.id) || (counts.get(group.id) ?? 0) > 0,
  );
  const total = summary.data?.total;
  return (
    <ProtectedPage allowGuest>
      <Screen>
        <View style={s.header}>
          {!asTab && (
            <BackButton
              label={t.back}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/home")
              }
            />
          )}
          <Text accessibilityRole="header" style={s.title}>
            {title}
          </Text>
        </View>
        <Input
          label={t.search}
          placeholder={t.directorySearch}
          value={input}
          maxLength={100}
          onChangeText={setInput}
        />
        {(category || showAll) && (
          <View style={s.crumb}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.directoryAllCategories}
              onPress={() => {
                setCategory(null);
                setShowAll(false);
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
              {category
                ? `${directoryGroupLabel(category, language)}${counts.has(category) ? ` (${counts.get(category)})` : ""}`
                : `${title}${total !== undefined ? ` (${total})` : ""}`}
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
                      style={({ pressed }) => [
                        s.tile,
                        !count && s.tileEmpty,
                        pressed && s.pressed,
                      ]}
                    >
                      <View style={[s.tileIcon, !count && s.tileIconEmpty]}>
                        <Ionicons
                          accessible={false}
                          name={directoryGroupIcons[group.id]}
                          size={26}
                          color={
                            count ? theme.colors.primary : theme.colors.inactive
                          }
                        />
                      </View>
                      <Text numberOfLines={2} style={s.tileLabel}>
                        {group[language]}
                      </Text>
                      <Text style={[s.tileCount, !!count && s.tileCountOn]}>
                        {count
                          ? formatMessage(t.dashboardAvailableCount, {
                              count: String(count),
                            })
                          : t.directoryNoneYet}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {!!total && (
              <Button secondary onPress={() => setShowAll(true)}>
                {formatMessage(t.directoryAllCount, { count: String(total) })}
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
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { ...theme.type.title, color: theme.colors.heading, flex: 1 },
  sectionTitle: { ...theme.type.heading, color: theme.colors.heading },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  // Two white tiles per row: icon, name, how many.
  tile: {
    width: "48%",
    flexGrow: 1,
    minHeight: 132,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 6,
  },
  tileEmpty: { backgroundColor: theme.colors.surfaceMuted },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  tileIconEmpty: { backgroundColor: theme.colors.surface },
  tileLabel: { ...theme.type.subheading, color: theme.colors.heading },
  tileCount: { ...theme.type.caption, color: theme.colors.muted },
  tileCountOn: { color: theme.colors.saffronText, fontWeight: "600" },
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
