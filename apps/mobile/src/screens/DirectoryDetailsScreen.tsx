import { Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { useDirectoryEntry } from "../directory";
import { directoryPreview } from "../data/directory";
import { BackButton, Button, ErrorMessage, Screen } from "../components/ui";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { Panel, SectionHeader, d } from "../components/dashboard/primitives";
import { listingRate } from "../components/dashboard/listingText";
import { ApiError } from "../api/client";

export default function DirectoryDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { language, offline } = useAppStore();
  const t = messages(language);
  const query = useDirectoryEntry(id);
  const denied =
    query.error instanceof ApiError &&
    [401, 403, 404, 422].includes(query.error.status ?? 0);
  const entry = denied ? undefined : query.data;
  const invalid = !/^[a-f0-9]{24}$/i.test(id ?? "");
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
            entry?.module === "transport"
              ? t.dashboardTransport
              : t.dashboardServices
          }
        />
        {offline && (
          <Text style={d.description}>
            {entry ? t.listingsOffline : t.listingsOfflineEmpty}
          </Text>
        )}
        {!offline && query.isPending && !invalid && (
          <Text style={d.description}>{t.listingsLoading}</Text>
        )}
        {invalid && <Text style={d.description}>{t.productUnavailable}</Text>}
        {query.isError && !offline && (
          <>
            <ErrorMessage message={t.productUnavailable} />
            <Button secondary onPress={() => void query.refetch()}>
              {t.retry}
            </Button>
          </>
        )}
        {entry && (
          <>
            <Panel>
              <Text accessibilityRole="header" style={d.cardTitle}>
                {language === "mr" ? entry.nameMr || entry.name : entry.name}
              </Text>
              <Text style={d.cardTitle}>
                {listingRate(directoryPreview(entry), language)}
              </Text>
              <Text style={d.description}>
                {language === "mr"
                  ? entry.village.nameMr || entry.village.name
                  : entry.village.name}
              </Text>
            </Panel>
            {entry.description && (
              <Text style={d.description}>{entry.description}</Text>
            )}
            <Text
              style={entry.category === "Medical" ? d.cardTitle : d.description}
            >
              {entry.category === "Medical"
                ? t.directoryMedicalDisclaimer
                : t.directoryDisclaimer}
            </Text>
          </>
        )}
      </Screen>
    </ProtectedPage>
  );
}
