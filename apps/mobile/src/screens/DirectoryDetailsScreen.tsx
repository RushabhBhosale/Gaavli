import { Linking, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { useDirectoryEntry } from "../directory";
import { directoryPreview } from "../data/directory";
import { Button, ErrorMessage, Screen } from "../components/ui";
import { AppHeader } from "../components/AppHeader";
import { ProviderImageGallery } from "../components/provider/ProviderImages";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { Panel, d } from "../components/dashboard/primitives";
import { listingRate } from "../components/dashboard/listingText";
import { ApiError } from "../api/client";
import { CONTACT_LABELS } from "@gaavli/constants";

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
            <ProviderImageGallery images={entry.images} />
            {entry.description && (
              <Text style={d.description}>{entry.description}</Text>
            )}
            {entry.contacts.map((contact) => (
              <Panel key={contact.mobile}>
                <Text style={d.description}>
                  {CONTACT_LABELS.find((item) => item.id === contact.label)?.[
                    language
                  ] ?? contact.label}
                </Text>
                <Text style={d.cardTitle}>{contact.mobile}</Text>
                <Button
                  onPress={() =>
                    void Linking.openURL(`tel:+91${contact.mobile}`)
                  }
                >
                  {t.dirCall}
                </Button>
                {contact.whatsapp && (
                  <Button
                    secondary
                    onPress={() =>
                      void Linking.openURL(`https://wa.me/91${contact.mobile}`)
                    }
                  >
                    {t.dirWhatsApp}
                  </Button>
                )}
              </Panel>
            ))}
            {entry.contacts.length === 0 && (
              <Text style={d.description}>{t.dirNoContact}</Text>
            )}
            {entry.contacts.length > 1 && (
              <Text style={d.description}>{t.dirTryNext}</Text>
            )}
            {(entry.providerType === "EMERGENCY_ASSISTANCE" ||
              entry.providerType === "POLITICAL_OFFICE") && (
              <Text style={d.description}>{t.dirEmergencyNote}</Text>
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
