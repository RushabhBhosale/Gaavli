import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { useDirectory } from "../directory";
import { directoryPreview } from "../data/directory";
import {
  BackButton,
  Button,
  ErrorMessage,
  Input,
  Screen,
} from "../components/ui";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { ProductCard } from "../components/dashboard/ProductCard";
import { SectionHeader, d } from "../components/dashboard/primitives";

export default function DirectoryScreen({
  module,
}: {
  module: "services" | "transport";
}) {
  const router = useRouter();
  const { language, offline } = useAppStore();
  const t = messages(language);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);
  const query = useDirectory(module, search);
  const entries = Array.from(
    new Map(
      (query.data?.pages.flatMap((page) => page.entries) ?? []).map((entry) => [
        entry.id,
        entry,
      ]),
    ).values(),
  );
  return (
    <ProtectedPage allowGuest>
      <Screen>
        <BackButton
          label={t.back}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/home")
          }
        />
        <SectionHeader
          title={
            module === "services" ? t.dashboardServices : t.dashboardTransport
          }
        />
        <Input
          label={t.search}
          placeholder={t.directorySearch}
          value={input}
          maxLength={100}
          onChangeText={setInput}
        />
        {offline && (
          <Text style={d.description}>
            {query.data ? t.listingsOffline : t.listingsOfflineEmpty}
          </Text>
        )}
        {!offline && query.isPending && (
          <Text style={d.description}>{t.listingsLoading}</Text>
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
        <Button
          secondary
          disabled={offline || query.isFetching}
          onPress={() => void query.refetch()}
        >
          {t.refreshRequests}
        </Button>
      </Screen>
    </ProtectedPage>
  );
}
