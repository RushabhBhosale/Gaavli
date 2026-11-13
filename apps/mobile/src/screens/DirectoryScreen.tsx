import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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
import { directoryPreview } from "../data/directory";
import { theme } from "../theme";
import { Button, ErrorMessage, Screen, SkeletonList } from "../components/ui";
import { AppHeader, HeaderSearch } from "../components/AppHeader";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { ProductCard } from "../components/dashboard/ProductCard";
import { d } from "../components/dashboard/primitives";
import { DirectoryCategoryGrid } from "../components/dashboard/DirectoryCategoryGrid";

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
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);
  const summary = useDirectorySummary(module);
  const counts = new Map(summary.data?.groups.map((g) => [g.id, g.count]));
  const showTiles = !category && !input.trim();
  const searchPending = input.trim() !== search;
  const query = useDirectory(module, search, category);
  useEffect(() => {
    if (
      !showTiles &&
      !searchPending &&
      !offline &&
      !query.isFetching &&
      !query.isError &&
      query.hasNextPage
    )
      void query.fetchNextPage();
  }, [
    offline,
    query.fetchNextPage,
    query.hasNextPage,
    query.isError,
    query.isFetching,
    searchPending,
    showTiles,
  ]);
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
  // Emergency help, government offices and ambulances lead; the order is set
  // in one place, so it is the same for everyone.
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
            <Text accessibilityRole="header" style={s.crumbTitle}>
              {`${directoryGroupLabel(category, language)}${counts.has(category) ? ` (${counts.get(category)})` : ""}`}
            </Text>
          </View>
        )}
        {showTiles && (
          <>
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
              <DirectoryCategoryGrid
                groups={allTiles}
                counts={counts}
                language={language}
                module={module}
                onSelect={setCategory}
              />
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
          </>
        )}
      </Screen>
    </ProtectedPage>
  );
}
const s = StyleSheet.create({
  crumb: { gap: 6 },
  crumbTitle: { ...theme.type.heading, color: theme.colors.heading },
});
