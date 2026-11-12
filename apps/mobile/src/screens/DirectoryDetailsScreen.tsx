import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import {
  CONTACT_LABELS,
  PROVIDER_KINDS,
  type ProviderType,
} from "@gaavli/constants";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { theme } from "../theme";
import { useDirectoryEntry } from "../directory";
import { directoryPreview } from "../data/directory";
import { hoursText } from "../data/operatingHours";
import { Button, ErrorMessage, Screen } from "../components/ui";
import { AppHeader } from "../components/AppHeader";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { d } from "../components/dashboard/primitives";
import { listingRate } from "../components/dashboard/listingText";
import { ProviderImageGallery } from "../components/provider/ProviderImages";
import { ApiError } from "../api/client";

// A shop, service or vehicle: who it is, photos, when it is open and how to
// reach it. The call button stays at the bottom while the page scrolls.
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
  const transport = entry?.module === "transport";
  const tone = transport ? "transport" : "services";
  const module = theme.modules[tone];
  const kind = entry?.providerType
    ? PROVIDER_KINDS[entry.providerType as ProviderType]?.title[language]
    : undefined;
  const name = entry
    ? language !== "en"
      ? entry.nameMr || entry.name
      : entry.name
    : "";
  const village = entry
    ? language !== "en"
      ? entry.village.nameMr || entry.village.name
      : entry.village.name
    : "";
  const rate =
    entry && entry.price !== null
      ? listingRate(directoryPreview(entry), language)
      : "";
  const hours = hoursText(entry?.hours, language);
  const first = entry?.contacts[0];
  const icon: React.ComponentProps<typeof Ionicons>["name"] = transport
    ? "car-outline"
    : entry?.category === "Medical"
      ? "medkit-outline"
      : entry?.category === "Shop"
        ? "storefront-outline"
        : "construct-outline";
  return (
    <ProtectedPage allowGuest>
      <Screen
        header={
          <AppHeader
            title={transport ? t.dashboardTransport : t.dashboardServices}
            tone={tone}
            back="/home"
          />
        }
        footer={
          first ? (
            <Button
              icon={<Ionicons name="call" size={20} color="#fff" />}
              onPress={() => void Linking.openURL(`tel:+91${first.mobile}`)}
            >
              {t.detCallNow}
            </Button>
          ) : undefined
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
            <View style={s.hero}>
              <View style={[s.heroIcon, { backgroundColor: module.tint }]}>
                <Ionicons
                  accessible={false}
                  name={icon}
                  size={34}
                  color={module.color}
                />
              </View>
              <Text accessibilityRole="header" style={s.name}>
                {name}
              </Text>
              <View style={s.chips}>
                {!!kind && (
                  <View style={[s.chip, { backgroundColor: module.tint }]}>
                    <Text style={[s.chipText, { color: module.color }]}>
                      {kind}
                    </Text>
                  </View>
                )}
                {entry.mine && (
                  <View style={[s.chip, s.chipMine]}>
                    <Text style={[s.chipText, { color: theme.colors.primary }]}>
                      {t.detYours}
                    </Text>
                  </View>
                )}
              </View>
              <View style={s.where}>
                <Ionicons
                  accessible={false}
                  name="location-outline"
                  size={18}
                  color={theme.colors.muted}
                />
                <Text style={s.whereText}>{village}</Text>
              </View>
              {!!rate && (
                <Text style={[s.rate, { color: module.color }]}>{rate}</Text>
              )}
            </View>

            {(entry.images?.length ?? 0) > 0 && (
              <View style={s.section}>
                <Text accessibilityRole="header" style={s.sectionTitle}>
                  {t.detPhotos}
                </Text>
                <ProviderImageGallery images={entry.images ?? []} />
              </View>
            )}

            {!!entry.description && (
              <View style={s.section}>
                <Text accessibilityRole="header" style={s.sectionTitle}>
                  {t.detAbout}
                </Text>
                <Text style={s.body}>{entry.description}</Text>
              </View>
            )}

            {hours && (
              <View style={s.section}>
                <Text accessibilityRole="header" style={s.sectionTitle}>
                  {t.hoursTitle}
                </Text>
                <View style={s.card}>
                  {"raw" in hours ? (
                    <Text style={s.body}>{hours.raw}</Text>
                  ) : (
                    <>
                      <View style={s.hoursRow}>
                        <Ionicons
                          accessible={false}
                          name="time-outline"
                          size={20}
                          color={module.color}
                        />
                        <View style={s.hoursCopy}>
                          <Text style={s.hoursDays}>
                            {hours.openDays || t.hoursAllDay}
                          </Text>
                          {hours.allDay ? (
                            <Text style={s.body}>{t.hoursOpen24}</Text>
                          ) : (
                            hours.times.map((time) => (
                              <Text key={time} style={s.body}>
                                {time}
                              </Text>
                            ))
                          )}
                        </View>
                      </View>
                      {!!hours.closed && (
                        <View style={s.hoursRow}>
                          <Ionicons
                            accessible={false}
                            name="moon-outline"
                            size={20}
                            color={theme.colors.error}
                          />
                          <Text style={s.hoursClosed}>
                            {`${t.hoursClosedOn}: ${hours.closed}`}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            )}

            <View style={s.section}>
              <Text accessibilityRole="header" style={s.sectionTitle}>
                {t.detContact}
              </Text>
              {entry.contacts.length === 0 && (
                <Text style={s.body}>{t.dirNoContact}</Text>
              )}
              {entry.contacts.map((contact) => (
                <View key={contact.mobile} style={[s.card, s.contact]}>
                  <View style={s.contactCopy}>
                    <Text style={s.contactLabel}>
                      {CONTACT_LABELS.find(
                        (item) => item.id === contact.label,
                      )?.[language] ?? contact.label}
                    </Text>
                    <Text
                      style={s.contactNumber}
                    >{`+91 ${contact.mobile}`}</Text>
                  </View>
                  {contact.whatsapp && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t.dirWhatsApp}
                      onPress={() =>
                        void Linking.openURL(
                          `https://wa.me/91${contact.mobile}`,
                        )
                      }
                      style={[s.round, { backgroundColor: "#25D366" }]}
                    >
                      <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t.dirCall} ${contact.mobile}`}
                    onPress={() =>
                      void Linking.openURL(`tel:+91${contact.mobile}`)
                    }
                    style={[s.round, { backgroundColor: theme.colors.primary }]}
                  >
                    <Ionicons name="call" size={22} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {entry.contacts.length > 1 && (
                <Text style={s.note}>{t.dirTryNext}</Text>
              )}
            </View>

            <View style={s.noteBox}>
              <Ionicons
                accessible={false}
                name="information-circle-outline"
                size={20}
                color={theme.colors.muted}
              />
              <View style={s.noteCopy}>
                {(entry.providerType === "EMERGENCY_ASSISTANCE" ||
                  entry.providerType === "POLITICAL_OFFICE") && (
                  <Text style={s.note}>{t.dirEmergencyNote}</Text>
                )}
                <Text
                  style={entry.category === "Medical" ? s.noteStrong : s.note}
                >
                  {entry.category === "Medical"
                    ? t.directoryMedicalDisclaimer
                    : t.directoryDisclaimer}
                </Text>
              </View>
            </View>
          </>
        )}
      </Screen>
    </ProtectedPage>
  );
}

const s = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: 8,
    padding: 20,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    ...theme.type.heading,
    color: theme.colors.heading,
    textAlign: "center",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
  },
  chipMine: { backgroundColor: theme.colors.tint },
  chipText: { fontSize: 13, fontWeight: "700" },
  where: { flexDirection: "row", alignItems: "center", gap: 4 },
  whereText: { color: theme.colors.muted, fontSize: 15 },
  rate: { fontSize: 20, fontWeight: "800" },
  section: { gap: 8 },
  sectionTitle: { ...theme.type.subheading, color: theme.colors.heading },
  body: { color: theme.colors.text, fontSize: 16, lineHeight: 24 },
  card: {
    gap: 12,
    padding: 14,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  hoursRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  hoursCopy: { flex: 1, gap: 2 },
  hoursDays: { color: theme.colors.heading, fontSize: 16, fontWeight: "700" },
  hoursClosed: { flex: 1, color: theme.colors.error, fontSize: 15 },
  contact: { flexDirection: "row", alignItems: "center", gap: 10 },
  contactCopy: { flex: 1, gap: 2 },
  contactLabel: { color: theme.colors.muted, fontSize: 13 },
  contactNumber: {
    color: theme.colors.heading,
    fontSize: 18,
    fontWeight: "700",
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  noteBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surfaceMuted,
  },
  noteCopy: { flex: 1, gap: 6 },
  note: { color: theme.colors.muted, fontSize: 14, lineHeight: 20 },
  noteStrong: {
    color: theme.colors.heading,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
});
