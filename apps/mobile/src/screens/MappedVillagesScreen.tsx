import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { theme } from "../theme";
import { browsingVillageFor } from "../storage/browsingVillage";
import { useMappedVillages } from "../mappedVillages";
import { ApiError } from "../api/client";
import { Button, ErrorMessage, Screen, SkeletonList } from "../components/ui";
import { AppHeader } from "../components/AppHeader";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { d } from "../components/dashboard/primitives";

// The villages mapped with yours, so people know whose listings they also see.
export default function MappedVillagesScreen() {
  const language = useAppStore((state) => state.language);
  const session = useAppStore((state) => state.session);
  const browsing = useAppStore(browsingVillageFor);
  const t = messages(language);
  const home = session?.user.village ?? browsing;
  const query = useMappedVillages(home?.id);
  const name = (v: { name: string; nameMr: string }) =>
    language !== "en" ? v.nameMr || v.name : v.name;
  return (
    <ProtectedPage allowGuest>
      <Screen
        header={
          <AppHeader
            title={t.mappedTitle}
            subtitle={home ? name(home) : undefined}
            back="/home"
          />
        }
      >
        <Text style={d.description}>{t.mappedIntro}</Text>
        {query.isPending && <SkeletonList rows={3} label={t.listingsLoading} />}
        {query.isError && (
          <>
            <ErrorMessage
              message={
                query.error instanceof ApiError && query.error.status === 404
                  ? t.mappedNotReady
                  : t.dashboardDirectoryFailed
              }
            />
            <Button secondary onPress={() => void query.refetch()}>
              {t.retry}
            </Button>
          </>
        )}
        {query.data && !query.data.villages.length && (
          <Text style={d.description}>{t.mappedEmpty}</Text>
        )}
        {query.data?.villages.map((village) => (
          <View key={village.id} style={s.row}>
            <View style={s.icon}>
              <Ionicons
                accessible={false}
                name="location"
                size={20}
                color={theme.colors.primary}
              />
            </View>
            <View style={s.copy}>
              <Text style={s.name}>{name(village)}</Text>
              <Text style={s.place}>
                {[village.taluka, village.district].filter(Boolean).join(", ")}
              </Text>
            </View>
          </View>
        ))}
      </Screen>
    </ProtectedPage>
  );
}
const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.tint,
  },
  copy: { flex: 1, gap: 2 },
  name: { color: theme.colors.heading, fontSize: 17, fontWeight: "700" },
  place: { color: theme.colors.muted, fontSize: 14 },
});
