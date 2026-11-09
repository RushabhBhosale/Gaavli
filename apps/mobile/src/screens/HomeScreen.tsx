import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "../theme";
import { BecomeSellerDialog } from "../components/BecomeSellerDialog";
import { showGuestSignUpPrompt } from "../components/guestSignUpPrompt";
import { useFocusEffect, useRouter } from "expo-router";
import type { MobileLanguage } from "@gaavli/types";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { liveDashboard } from "../data/listings";
import { directoryPreview } from "../data/directory";
import { useHomeListings } from "../listings";
import { useDashboardDirectory } from "../directory";
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
import { HomeHero } from "../components/dashboard/HomeHero";
import { browsingVillageFor } from "../storage/browsingVillage";
import { ProductCard } from "../components/dashboard/ProductCard";
import { ServiceCard } from "../components/dashboard/ServiceCard";
import { BecomeSellerCard } from "../components/dashboard/SellerCards";
import {
  PreviewBanner,
  SectionHeader,
  d,
  type IconName,
} from "../components/dashboard/primitives";

const h = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: 32,
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
  },
  statusBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: theme.colors.primaryDark,
  },
  body: { paddingHorizontal: theme.layout.screenPadding, gap: 16 },
  // One white card of four destinations, overlapping the dark hero.
  quick: {
    flexDirection: "row",
    marginTop: -24,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  action: { flex: 1, alignItems: "center", gap: 6, paddingHorizontal: 2 },
  actionHint: {
    ...theme.type.micro,
    fontWeight: "400",
    textAlign: "center",
    color: theme.colors.muted,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    ...theme.type.micro,
    color: theme.colors.heading,
    textAlign: "center",
    minHeight: 34,
  },
  pressed: { opacity: theme.interaction.pressedOpacity },
});

function QuickAction({
  icon,
  title,
  hint,
  onPress,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${title}. ${hint}` : title}
      onPress={onPress}
      style={({ pressed }) => [h.action, pressed && h.pressed]}
    >
      <View style={h.actionIcon}>
        <Ionicons
          accessible={false}
          name={icon}
          size={24}
          color={theme.colors.primary}
        />
      </View>
      <Text numberOfLines={2} style={h.actionLabel}>
        {title}
      </Text>
      {!!hint && (
        <Text numberOfLines={2} style={h.actionHint}>
          {hint}
        </Text>
      )}
    </Pressable>
  );
}

export function HomeDashboard({
  data,
  language,
  onNavigate,
  onProductPress,
  listingStatus,
  services = [],
  transport = [],
}: {
  data: HomeDashboardData;
  language: MobileLanguage;
  onNavigate: (route: HomeDestination) => void;
  onProductPress: (listing: HomeListing) => void;
  listingStatus?: React.ReactNode;
  listingsReady?: boolean;
  services?: HomeListing[];
  transport?: HomeListing[];
}) {
  const t = messages(language);
  const signedIn = useAppStore((state) => !!state.session);
  const offline = useAppStore((state) => state.offline);
  const insets = useSafeAreaInsets();
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
      <View
        pointerEvents="none"
        style={[h.statusBackdrop, { height: offline ? 0 : insets.top }]}
      />
      {offline && (
        <View style={{ paddingTop: insets.top }}>
          <OfflineBanner message={t.offline} />
        </View>
      )}
      <ScrollView
        contentContainerStyle={h.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHero
          language={language}
          topInset={offline ? 0 : insets.top}
          onSearch={() => onNavigate("/marketplace")}
        />
        <View style={h.body}>
          <View style={h.quick}>
            <QuickAction
              icon="storefront-outline"
              title={t.dashboardMarketplace}
              hint={t.tileMarketplaceHint}
              onPress={() => onNavigate("/marketplace")}
            />
            <QuickAction
              icon="build-outline"
              title={t.dashboardServices}
              hint={t.tileServicesHint}
              onPress={() => onNavigate("/services")}
            />
            <QuickAction
              icon="car-outline"
              title={t.dashboardTransport}
              hint={t.tileTransportHint}
              onPress={() => onNavigate("/transport")}
            />
            <QuickAction
              icon="people-outline"
              title={t.villageCoordinator}
              onPress={() => onNavigate("/village-coordinator")}
            />
          </View>
          {data.isPreview && <PreviewBanner />}
          <View style={d.section}>
            <SectionHeader
              icon="storefront-outline"
              title={t.dashboardMarketplace}
              action={t.viewAll}
              onPress={() => onNavigate("/marketplace")}
            />
            {listingStatus}
            <FlatList
              horizontal
              data={data.listings}
              keyExtractor={(item) =>
                `${item.module ?? "marketplace"}:${item.id}`
              }
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
              renderItem={({ item }) => (
                <ProductCard
                  listing={item}
                  language={language}
                  compact
                  onPress={() => onProductPress(item)}
                />
              )}
            />
          </View>
          {(
            [
              [services, t.dashboardServices, "/services", "build-outline"],
              [transport, t.dashboardTransport, "/transport", "car-outline"],
            ] as const
          ).map(
            ([entries, title, route, icon]) =>
              entries.length > 0 && (
                <View key={route} style={d.section}>
                  <SectionHeader
                    icon={icon}
                    title={title}
                    action={t.viewAll}
                    onPress={() => onNavigate(route)}
                  />
                  <FlatList
                    horizontal
                    data={entries}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
                    renderItem={({ item }) => (
                      <ServiceCard
                        listing={item}
                        language={language}
                        onPress={() => onProductPress(item)}
                      />
                    )}
                  />
                </View>
              ),
          )}
          {signedIn && data.user.isBuyer && !data.user.isSeller && (
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
  data.serviceCount = directory.data?.services.total;
  data.transportCount = directory.data?.transport.total;
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
        listingsReady={!!page}
        services={(directory.data?.services.entries ?? []).map((entry) =>
          directoryPreview(entry, now),
        )}
        transport={(directory.data?.transport.entries ?? []).map((entry) =>
          directoryPreview(entry, now),
        )}
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
      <BecomeSellerDialog
        visible={sellerDialog}
        onClose={() => setSellerDialog(false)}
      />
    </>
  );
}
