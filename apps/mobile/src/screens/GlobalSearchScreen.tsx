import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { theme } from "../theme";
import { toHomeListing } from "../data/listings";
import { directoryPreview } from "../data/directory";
import { useMarketplaceListings } from "../listings";
import { useDirectory } from "../directory";
import { listingName } from "../types/home";
import { useListingClock } from "../hooks/useListingClock";
import { AppHeader, HeaderSearch } from "../components/AppHeader";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { MarketplaceListingCard } from "../components/dashboard/MarketplaceListingCard";
import { SectionHeader } from "../components/dashboard/primitives";
import { StateMessage, SkeletonList, Screen } from "../components/ui";
import { VoiceMicButton, voiceErrorText } from "../components/VoiceMicButton";
import { useVoiceSearch } from "../hooks/useVoiceSearch";
import { produceVoiceHints, spokenSearch } from "../data/voiceSearch";
import { showToast } from "../toast";

const VOICE_HINTS = produceVoiceHints();
const SHOWN = 4;

// Search from the dashboard: one box, results from every part of the app.
// Each part shows its best few and a link to see them all, already searching.
export default function GlobalSearchScreen() {
  const router = useRouter();
  const { language, offline } = useAppStore();
  const t = messages(language);
  const incoming = useLocalSearchParams<{ q?: string; v?: string }>();
  const [applied, setApplied] = useState<string | undefined>(undefined);
  const [text, setText] = useState(incoming.q ?? "");
  const [search, setSearch] = useState((incoming.q ?? "").trim());
  if (incoming.v && incoming.v !== applied) {
    setApplied(incoming.v);
    setText(incoming.q ?? "");
    setSearch((incoming.q ?? "").trim());
  }
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text]);
  const now = useListingClock();
  const products = useMarketplaceListings(search, "all");
  const services = useDirectory("services", search);
  const transport = useDirectory("transport", search);
  const voice = useVoiceSearch({
    language,
    scope: "search-all",
    hints: VOICE_HINTS,
    onResult: (transcript) => {
      const spoken = spokenSearch(transcript, language, "all");
      if (spoken.text) setText(spoken.text);
    },
  });
  const failure = voiceErrorText(t, voice.error);
  useEffect(() => {
    if (!failure) return;
    showToast(failure, "error");
    voice.clearError();
  }, [failure, voice]);

  const productRows = Array.from(
    new Map(
      (products.data?.pages.flatMap((page) => page.listings) ?? []).map(
        (row) => [row.id, toHomeListing(row, now)],
      ),
    ).values(),
  );
  const productTotal = products.data?.pages[0]?.total ?? 0;
  const serviceRows = (services.data?.pages[0]?.entries ?? []).map((entry) =>
    directoryPreview(entry, now),
  );
  const serviceTotal = services.data?.pages[0]?.total ?? 0;
  const transportRows = (transport.data?.pages[0]?.entries ?? []).map((entry) =>
    directoryPreview(entry, now),
  );
  const transportTotal = transport.data?.pages[0]?.total ?? 0;
  const loading =
    !offline &&
    (products.isPending || services.isPending || transport.isPending);
  const nothing =
    !loading &&
    !productRows.length &&
    !serviceRows.length &&
    !transportRows.length;
  const open = (route: "/marketplace" | "/services" | "/transport") =>
    router.navigate({
      pathname: route,
      params: { q: search, v: String(Date.now()) },
    });

  return (
    <ProtectedPage allowGuest>
      <Screen
        header={
          <AppHeader title={t.searchAllTitle} back="/home">
            <HeaderSearch
              label={t.searchAllPlaceholder}
              placeholder={t.searchAllPlaceholder}
              value={text}
              onChangeText={setText}
              autoFocus={!incoming.q}
              right={
                <VoiceMicButton
                  status={voice.status}
                  onStart={voice.start}
                  onFinish={voice.finish}
                  onCancel={voice.cancel}
                  t={t}
                />
              }
            />
          </AppHeader>
        }
      >
        {!search && <Text style={s.hint}>{t.searchAllHint}</Text>}
        {!!search && loading && (
          <SkeletonList rows={3} label={t.listingsLoading} />
        )}
        {!!search && nothing && (
          <StateMessage icon="search-outline" title={t.searchAllNone} />
        )}
        {!!search && !!productRows.length && (
          <View style={s.section}>
            <SectionHeader
              icon="storefront-outline"
              title={t.dashboardMarketplace}
              badge={String(productTotal)}
              action={productTotal > SHOWN ? t.viewAll : undefined}
              onPress={() => open("/marketplace")}
            />
            {productRows.slice(0, SHOWN).map((row) => (
              <MarketplaceListingCard
                key={row.id}
                listing={row}
                language={language}
                onPress={() =>
                  router.push({
                    pathname: "/product/[id]",
                    params: { id: row.id },
                  })
                }
              />
            ))}
          </View>
        )}
        {!!search && !!serviceRows.length && (
          <Group
            title={t.dashboardServices}
            icon="build-outline"
            total={serviceTotal}
            rows={serviceRows}
            onAll={() => open("/services")}
          />
        )}
        {!!search && !!transportRows.length && (
          <Group
            title={t.dashboardTransport}
            icon="car-outline"
            total={transportTotal}
            rows={transportRows}
            onAll={() => open("/transport")}
          />
        )}
      </Screen>
    </ProtectedPage>
  );
}

function Group({
  title,
  icon,
  total,
  rows,
  onAll,
}: {
  title: string;
  icon: "build-outline" | "car-outline";
  total: number;
  rows: ReturnType<typeof directoryPreview>[];
  onAll: () => void;
}) {
  const router = useRouter();
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  return (
    <View style={s.section}>
      <SectionHeader
        icon={icon}
        title={title}
        badge={String(total)}
        action={total > SHOWN ? t.viewAll : undefined}
        onPress={onAll}
      />
      {rows.slice(0, SHOWN).map((row) => (
        <Pressable
          key={row.id}
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: "/directory/[id]", params: { id: row.id } })
          }
          style={({ pressed }) => [s.row, pressed && s.pressed]}
        >
          <View style={s.rowIcon}>
            <Ionicons
              accessible={false}
              name={icon}
              size={22}
              color={theme.colors.primary}
            />
          </View>
          <View style={s.rowCopy}>
            <Text numberOfLines={1} style={s.rowName}>
              {listingName(row, language)}
            </Text>
            <Text numberOfLines={1} style={s.rowMeta}>
              {[row.category, language !== "en" ? row.villageMr : row.village]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
          <Ionicons
            accessible={false}
            name="chevron-forward"
            size={18}
            color={theme.colors.inactive}
          />
        </Pressable>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  hint: { ...theme.type.body, color: theme.colors.muted, textAlign: "center" },
  section: { gap: 10 },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pressed: { opacity: theme.interaction.pressedOpacity },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: { flex: 1, gap: 2 },
  rowName: { ...theme.type.subheading, color: theme.colors.heading },
  rowMeta: { ...theme.type.caption, color: theme.colors.muted },
});
