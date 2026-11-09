import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../store";
import { formatMessage, messages } from "../i18n";
import { useDashboardDirectory } from "../directory";
import { theme } from "../theme";
import { Button, ErrorMessage, Screen, SkeletonList } from "../components/ui";
import { AppHeader } from "../components/AppHeader";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { d } from "../components/dashboard/primitives";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("");

// One page for the person to call when the app is not enough: who they are,
// a big Call button, and what to ask them.
export default function VillageCoordinatorScreen() {
  const { language, offline } = useAppStore();
  const t = messages(language);
  const query = useDashboardDirectory();
  const coordinator = query.data?.coordinator ?? null;
  const village = coordinator
    ? language !== "en"
      ? coordinator.village.nameMr
      : coordinator.village.name
    : "";
  const phone = coordinator?.publicContactPhone ?? null;
  function call() {
    if (phone && /^\+91[6-9]\d{9}$/.test(phone))
      void Linking.openURL(`tel:${phone}`).catch(() =>
        Alert.alert(t.callError),
      );
  }
  const help = [
    ["person-add-outline", t.coordinatorHelp1],
    ["construct-outline", t.coordinatorHelp2],
    ["flag-outline", t.coordinatorHelp3],
  ] as const;
  return (
    <ProtectedPage allowGuest>
      <Screen
        header={<AppHeader title={t.villageCoordinator} back="/home" />}
        footer={
          coordinator ? (
            <Button
              disabled={!phone}
              onPress={call}
              icon={
                <Ionicons
                  accessible={false}
                  name="call"
                  size={20}
                  color={theme.colors.onPrimary}
                />
              }
            >
              {phone
                ? formatMessage(t.coordinatorCallNow, {
                    name: coordinator.name,
                  })
                : t.coordinatorNoPhone}
            </Button>
          ) : undefined
        }
      >
        {!query.data && !query.isError && (
          <SkeletonList rows={2} label={t.listingsLoading} />
        )}
        {query.isError && !query.data && (
          <>
            <ErrorMessage message={t.dashboardDirectoryFailed} />
            <Button
              secondary
              disabled={offline}
              onPress={() => void query.refetch()}
            >
              {t.retry}
            </Button>
          </>
        )}
        {query.data && !coordinator && (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons
                accessible={false}
                name="people-outline"
                size={30}
                color={theme.colors.steel}
              />
            </View>
            <Text style={d.description}>{t.coordinatorNone}</Text>
          </View>
        )}
        {coordinator && (
          <>
            <View style={s.profile}>
              <View accessible={false} style={s.avatar}>
                <Text style={s.initials}>{initials(coordinator.name)}</Text>
              </View>
              <Text style={s.name}>{coordinator.name}</Text>
              {!!village && (
                <View style={s.village}>
                  <Ionicons
                    accessible={false}
                    name="location-outline"
                    size={16}
                    color={theme.colors.muted}
                  />
                  <Text style={s.villageText}>{village}</Text>
                </View>
              )}
              <Text style={s.intro}>{t.coordinatorIntro}</Text>
            </View>
            <View style={s.card}>
              <Text accessibilityRole="header" style={s.cardTitle}>
                {t.coordinatorHelpTitle}
              </Text>
              {help.map(([icon, label]) => (
                <View key={label} style={s.row}>
                  <View style={s.rowIcon}>
                    <Ionicons
                      accessible={false}
                      name={icon}
                      size={20}
                      color={theme.colors.steel}
                    />
                  </View>
                  <Text style={s.rowText}>{label}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Screen>
    </ProtectedPage>
  );
}
const s = StyleSheet.create({
  profile: {
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.colors.steelTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  initials: {
    fontSize: 30,
    lineHeight: 42,
    fontWeight: "700",
    color: theme.colors.steel,
  },
  name: {
    ...theme.type.title,
    color: theme.colors.heading,
    textAlign: "center",
  },
  village: { flexDirection: "row", alignItems: "center", gap: 4 },
  villageText: { ...theme.type.body, color: theme.colors.muted },
  intro: {
    ...theme.type.body,
    color: theme.colors.text,
    textAlign: "center",
    marginTop: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: { ...theme.type.heading, color: theme.colors.heading },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.steelTint,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { ...theme.type.body, color: theme.colors.text, flex: 1 },
  empty: { alignItems: "center", gap: 12, padding: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.steelTint,
    alignItems: "center",
    justifyContent: "center",
  },
});
