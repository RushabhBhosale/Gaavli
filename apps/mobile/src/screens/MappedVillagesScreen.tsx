import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { mobileUserSchema } from "@gaavli/validation";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../store";
import { formatMessage, messages } from "../i18n";
import { authenticatedApi, saveSession } from "../session";
import { theme } from "../theme";
import { browsingVillageFor } from "../storage/browsingVillage";
import { useMappedVillages } from "../mappedVillages";
import { ApiError } from "../api/client";
import { errorMessage } from "../errors";
import { VillageField } from "../components/VillageField";
import {
  useChangeUserMappedVillage,
  useUserMappedVillages,
} from "../userMappedVillages";
import {
  Button,
  Chip,
  ErrorMessage,
  Screen,
  SkeletonList,
} from "../components/ui";
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
  const [radiusKm, setRadiusKm] = useState(
    session?.user.discoveryRadiusKm ?? 50,
  );
  const query = useMappedVillages(home?.id, radiusKm);
  const own = useUserMappedVillages();
  const change = useChangeUserMappedVillage();
  // Signed-in users keep the chosen range for their listings feed too.
  async function chooseRadius(km: number) {
    setRadiusKm(km);
    if (!session?.user.village) return;
    try {
      const user = await authenticatedApi("/users/me", mobileUserSchema, {
        method: "PATCH",
        body: JSON.stringify({
          villageId: session.user.village.id,
          discoveryRadiusKm: km,
        }),
      });
      const current = useAppStore.getState().session;
      if (current && current.user.id === session.user.id)
        await saveSession({ ...current, user });
    } catch {
      // The list still follows the chosen range; saving is retried on the next change.
    }
  }
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
        <Text style={s.section}>{t.listingRadius}</Text>
        <View style={s.chips}>
          {[10, 20, 50, 100, 0].map((km) => (
            <Chip
              key={km}
              label={km ? formatMessage(t.radiusKm, { km }) : t.radiusOff}
              selected={radiusKm === km}
              onPress={() => void chooseRadius(km)}
            />
          ))}
        </View>
        {!!session?.user.village && (
          <View style={s.group}>
            <Text style={s.section}>{t.myMappedTitle}</Text>
            <Text style={s.help}>{t.myMappedHelp}</Text>
            <VillageField
              label={t.myMappedAdd}
              value={null}
              disabled={change.isPending}
              onChange={(village) =>
                change.mutate({ id: village.id, remove: false })
              }
            />
            {change.isError && (
              <ErrorMessage message={errorMessage(change.error, language)} />
            )}
            {own.data && !own.data.villages.length && (
              <Text style={d.description}>{t.myMappedEmpty}</Text>
            )}
            {own.data?.villages.map((village) => (
              <View key={village.id} style={[s.row, s.rowMapped]}>
                <View style={s.copy}>
                  <Text style={s.name}>{name(village)}</Text>
                  <Text style={s.place}>
                    {[village.taluka, village.district]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
                <Button
                  secondary
                  disabled={change.isPending}
                  onPress={() =>
                    change.mutate({ id: village.id, remove: true })
                  }
                >
                  {t.myMappedRemove}
                </Button>
              </View>
            ))}
          </View>
        )}
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
        {!!query.data && (
          <View style={s.group}>
            <Text style={s.section}>{t.mappedGroupTitle}</Text>
            <Text style={s.help}>{t.mappedGroupHelp}</Text>
          </View>
        )}
        {query.data && !query.data.villages.length && (
          <Text style={d.description}>{t.mappedEmpty}</Text>
        )}
        {query.data?.villages.map((village) => (
          <View key={village.id} style={[s.row, s.rowMapped]}>
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
            <Text style={s.tagMapped}>{t.mappedTag}</Text>
          </View>
        ))}
        {!!query.data && radiusKm > 0 && (
          <>
            <View style={s.group}>
              <Text style={s.section}>{t.nearbyTitle}</Text>
              <Text style={s.help}>
                {formatMessage(t.nearbyGroupHelp, { km: radiusKm })}
              </Text>
            </View>
            {!query.data.nearby.length && (
              <Text style={d.description}>{t.nearbyEmpty}</Text>
            )}
            {query.data.nearby.map((village) => (
              <View key={village.id} style={s.row}>
                <View style={[s.icon, s.iconNearby]}>
                  <Ionicons
                    accessible={false}
                    name="navigate"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={s.copy}>
                  <Text style={s.name}>{name(village)}</Text>
                  <Text style={s.place}>
                    {[village.taluka, village.district]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
                {village.distanceKm !== undefined && (
                  <Text style={s.tagNearby}>
                    {formatMessage(t.nearbyAway, {
                      distance: village.distanceKm,
                    })}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}
      </Screen>
    </ProtectedPage>
  );
}
const s = StyleSheet.create({
  group: { gap: 2, marginTop: 8 },
  help: { color: theme.colors.muted, fontSize: 14 },
  rowMapped: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  iconNearby: { backgroundColor: theme.colors.surface },
  tagMapped: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: theme.colors.tint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  tagNearby: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  section: { color: theme.colors.heading, fontSize: 16, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
