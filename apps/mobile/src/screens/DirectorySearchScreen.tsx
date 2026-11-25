import { useEffect, useRef, useState } from "react";
import { Pressable, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { useDirectory } from "../directory";
import { theme } from "../theme";
import { Button, ErrorMessage, Screen, SkeletonList } from "../components/ui";
import { AppHeader, HeaderSearch } from "../components/AppHeader";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { DirectoryListCard } from "../components/dashboard/DirectoryListCard";
import { d } from "../components/dashboard/primitives";
import type { TextInput } from "react-native";

// The one place to search Services or Transport. Results show right here,
// only for the section it was opened from.
export default function DirectorySearchScreen({
  module,
}: {
  module: "services" | "transport";
}) {
  const router = useRouter();
  const { language, offline } = useAppStore();
  const t = messages(language);
  const input = useRef<TextInput>(null);
  const incoming = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState((incoming.q ?? "").trim());
  const [search, setSearch] = useState(text);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const query = useDirectory(module, search, null);
  const entries = search
    ? Array.from(
        new Map(
          (query.data?.pages.flatMap((page) => page.entries) ?? []).map(
            (entry) => [entry.id, entry],
          ),
        ).values(),
      )
    : [];
  const title =
    module === "services" ? t.dashboardServices : t.dashboardTransport;
  const placeholder =
    module === "services"
      ? t.directorySearchServices
      : t.directorySearchTransport;
  function close() {
    if (router.canGoBack()) router.back();
    else router.replace(`/${module}`);
  }
  return (
    <ProtectedPage allowGuest>
      <Screen
        header={
          <AppHeader
            title={title}
            tone={module}
            onBack={close}
            back={`/${module}`}
          >
            <HeaderSearch
              inputRef={input}
              autoFocus
              label={t.search}
              placeholder={placeholder}
              value={text}
              onChangeText={setText}
              right={
                text ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.searchClear}
                    hitSlop={8}
                    onPress={() => {
                      setText("");
                      input.current?.focus();
                    }}
                  >
                    <Ionicons
                      accessible={false}
                      name="close-circle"
                      size={20}
                      color={theme.colors.inactive}
                    />
                  </Pressable>
                ) : undefined
              }
            />
          </AppHeader>
        }
      >
        {!search && <Text style={d.description}>{placeholder}</Text>}
        {!!search && offline && (
          <Text style={d.description}>
            {query.data ? t.listingsOffline : t.listingsOfflineEmpty}
          </Text>
        )}
        {!!search && !offline && query.isPending && (
          <SkeletonList rows={4} label={t.listingsLoading} />
        )}
        {!!search && query.isError && !offline && (
          <>
            <ErrorMessage message={t.dashboardDirectoryFailed} />
            <Button secondary onPress={() => void query.refetch()}>
              {t.retry}
            </Button>
          </>
        )}
        {!!search && !query.isPending && !query.isError && !entries.length && (
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
        {!!search && query.hasNextPage && (
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
