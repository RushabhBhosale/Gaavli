import { useCallback, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "../theme";
import { BecomeSellerDialog } from "../components/BecomeSellerDialog";
import { VillageNoticeDialog } from "../components/VillageNoticeDialog";
import { showGuestSignUpPrompt } from "../components/guestSignUpPrompt";
import { useFocusEffect, useRouter } from "expo-router";
import type { MobileLanguage } from "@gaavli/types";
import { useAppStore } from "../store";
import { formatMessage, messages } from "../i18n";
import { liveDashboard } from "../data/listings";
import { useHomeListings } from "../listings";
import { useDashboardDirectory, useDirectorySummary } from "../directory";
import { useListingClock } from "../hooks/useListingClock";
import {
  Button,
  ErrorMessage,
  OfflineBanner,
  StateMessage,
  SkeletonList,
} from "../components/ui";
import type {
  HomeDashboardData,
  HomeDestination,
  HomeListing,
} from "../types/home";
import { HomeHero, HomeTopBar } from "../components/dashboard/HomeHero";
import { browsingVillageFor } from "../storage/browsingVillage";
import { ProductTile } from "../components/dashboard/ProductTile";
import { NearbyVillages } from "../components/dashboard/NearbyVillages";
import { BecomeSellerCard } from "../components/dashboard/SellerCards";
import {
  PreviewBanner,
  SectionHeader,
  d,
  type IconName,
} from "../components/dashboard/primitives";

// Two rows of three tiles on Home; the rest of the market is one tap away.
const TILE_GAP = 8;
const HOME_TILES = 6;

const h = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: 32,
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
  },
  body: { paddingHorizontal: theme.layout.screenPadding, gap: 16 },
  // One bordered card with the two modules side by side in a single row,
  // overlapping the dark hero. Each half opens its own page; the module
  // colour is only on the icon.
  quick: {
    marginTop: -24,
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  action: {
    flex: 1,
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionDivider: {
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { flex: 1 },
  actionLabel: { ...theme.type.label, color: theme.colors.heading },
  actionCount: { ...theme.type.caption, color: theme.colors.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: TILE_GAP },
  pressed: { opacity: theme.interaction.pressedOpacity },
});

function QuickAction({
  icon,
  title,
  count,
  onPress,
  tone,
  divider = false,
}: {
  icon: IconName;
  title: string;
  count?: string;
  onPress: () => void;
  tone: keyof typeof theme.modules;
  divider?: boolean;
}) {
  const module = theme.modules[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `${title}, ${count}` : title}
      onPress={onPress}
      style={({ pressed }) => [
        h.action,
        divider && h.actionDivider,
        pressed && h.pressed,
      ]}
    >
      <View style={[h.actionIcon, { backgroundColor: module.tint }]}>
        <Ionicons
          accessible={false}
          name={icon}
          size={20}
          color={module.color}
        />
      </View>
      <View style={h.actionText}>
        <Text numberOfLines={1} style={h.actionLabel}>
          {title}
        </Text>
        {!!count && (
          <Text numberOfLines={1} style={h.actionCount}>
            {count}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function HomeDashboard({
  data,
  language,
  onNavigate,
  onProductPress,
  listingStatus,
}: {
  data: HomeDashboardData;
  language: MobileLanguage;
  onNavigate: (route: HomeDestination) => void;
  onProductPress: (listing: HomeListing) => void;
  listingStatus?: React.ReactNode;
}) {
  const t = messages(language);
  const offline = useAppStore((state) => state.offline);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Three tiles across the content column, two rows of them.
  const tileWidth = Math.floor(
    (Math.min(width, theme.layout.contentWidth) -
      theme.layout.screenPadding * 2 -
      TILE_GAP * 2) /
      3,
  );
  const tiles = data.listings.slice(0, HOME_TILES);
  // Transport is part of Services now, so the one count covers both.
  const servicesTotal = (data.serviceCount ?? 0) + (data.transportCount ?? 0);
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return (
    <View style={d.safe}>
      {focused && <StatusBar style="light" />}
      {offline && (
        <View style={{ paddingTop: insets.top }}>
          <OfflineBanner message={t.offline} />
        </View>
      )}
      <HomeTopBar language={language} topInset={offline ? 0 : insets.top} />
      <ScrollView
        contentContainerStyle={h.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHero
          language={language}
          onSearch={() => onNavigate("/marketplace")}
        />
        <View style={h.body}>
          <View style={h.quick}>
            <QuickAction
              icon="storefront-outline"
              tone="marketplace"
              title={t.dashboardMarketplace}
              count={
                data.listingCount
                  ? formatMessage(t.homeOffersCount, {
                      count: data.listingCount,
                    })
                  : undefined
              }
              onPress={() => onNavigate("/marketplace")}
            />
            <QuickAction
              divider
              icon="build-outline"
              tone="services"
              title={t.dashboardServices}
              count={
                servicesTotal
                  ? formatMessage(t.homeNearbyCount, { count: servicesTotal })
                  : undefined
              }
              onPress={() => onNavigate("/services")}
            />
          </View>
          {data.isPreview && <PreviewBanner />}
          <View style={d.section}>
            <SectionHeader
              icon="storefront-outline"
              tone="marketplace"
              title={t.freshInVillage}
              action={tiles.length ? t.viewAll : undefined}
              onPress={() => onNavigate("/marketplace")}
            />
            {listingStatus}
            {!!tiles.length && (
              <View style={h.grid}>
                {tiles.map((item) => (
                  <ProductTile
                    key={`${item.module ?? "marketplace"}:${item.id}`}
                    listing={item}
                    language={language}
                    width={tileWidth}
                    onPress={() => onProductPress(item)}
                  />
                ))}
              </View>
            )}
          </View>
          <NearbyVillages
            language={language}
            onSeeAll={() => onNavigate("/mapped-villages")}
          />
          {!data.user.isSeller && (
            <BecomeSellerCard
              language={language}
              onPress={() => onNavigate("/become-seller")}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
export default function HomeScreen() {
  const [sellerDialog, setSellerDialog] = useState(false);
  const router = useRouter();
  const { session, language, offline } = useAppStore();
  const village = useAppStore(browsingVillageFor);
  const query = useHomeListings();
  const directory = useDashboardDirectory();
  // Counts for the Services card come from the directory summaries, which
  // work for guests too.
  const servicesSummary = useDirectorySummary("services");
  const transportSummary = useDirectorySummary("transport");
  // Coming back to Home reshuffles the services and vehicles it shows.
  const visited = useRef(false);
  const reshuffle = directory.refetch;
  useFocusEffect(
    useCallback(() => {
      if (visited.current) void reshuffle();
      visited.current = true;
    }, [reshuffle]),
  );
  const now = useListingClock();
  const t = messages(language);
  if (!village || (session && !session.user.village)) return null;
  const account = session?.user ?? {
    id: "guest",
    name: t.guest,
    firstName: null,
    lastName: null,
    language,
    village,
    isSeller: false,
  };
  const page = query.data;
  const listings = (page?.listings || []).filter(
    (listing) =>
      listing.expiresAt === null || Date.parse(listing.expiresAt) > now,
  );
  const data = liveDashboard(
    account,
    language,
    listings,
    page?.total || 0,
    account.isSeller ?? page?.isSeller ?? false,
    now,
  );
  data.serviceCount = servicesSummary.data?.total;
  data.transportCount = transportSummary.data?.total;
  const coordinator = directory.data?.coordinator;
  data.coordinator = coordinator
    ? {
        name: coordinator.name,
        nameMr: coordinator.name,
        village: coordinator.village.name,
        villageMr: coordinator.village.nameMr,
        phone: coordinator.publicContactPhone,
        publicContactable: !!coordinator.publicContactPhone,
        verified: false,
      }
    : null;
  const listingStatus = (
    <>
      {offline && (
        <Text style={d.description}>
          {page ? t.listingsOffline : t.listingsOfflineEmpty}
        </Text>
      )}
      {!offline && query.isPending && (
        <SkeletonList rows={3} label={t.listingsLoading} />
      )}
      {query.isError && !offline && (
        <>
          <ErrorMessage message={t.listingsFailed} />
          <Button secondary onPress={() => void query.refetch()}>
            {t.retry}
          </Button>
        </>
      )}
      {page && !query.isError && !data.listings.length && (
        <StateMessage icon="basket-outline" title={t.dashboardDirectoryEmpty} />
      )}
    </>
  );
  return (
    <>
      <HomeDashboard
        data={data}
        language={language}
        listingStatus={listingStatus}
        onNavigate={(route) => {
          if (route === "/become-seller") {
            if (session) setSellerDialog(true);
            else {
              showGuestSignUpPrompt(language, () => {
                useAppStore.getState().setContactReturn(null);
                useAppStore.getState().setAuthMode("login");
                router.push("/register");
              });
            }
            return;
          }
          router.push(route);
        }}
        onProductPress={(listing) =>
          router.push({
            pathname:
              listing.module === "services" || listing.module === "transport"
                ? "/directory/[id]"
                : "/product/[id]",
            params: { id: listing.id },
          })
        }
      />
      <VillageNoticeDialog />
      <BecomeSellerDialog
        visible={sellerDialog}
        onClose={() => setSellerDialog(false)}
      />
    </>
  );
}
