import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { useDirectoryEntry } from "../directory";
import { directoryPreview } from "../data/directory";
import { Button, ErrorMessage, Screen } from "../components/ui";
import { AppHeader } from "../components/AppHeader";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { Panel, d } from "../components/dashboard/primitives";
import { listingRate } from "../components/dashboard/listingText";
import { ApiError } from "../api/client";

export default function DirectoryDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
      <Screen
        header={
          <AppHeader
            title={
              entry?.module === "transport"
                ? t.dashboardTransport
                : t.dashboardServices
            }
            back="/home"
          />
        }
      >
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
                {language !== "en" ? entry.nameMr || entry.name : entry.name}
              </Text>
              <Text style={d.cardTitle}>
                {listingRate(directoryPreview(entry), language)}
              </Text>
              <Text style={d.description}>
                {language !== "en"
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
