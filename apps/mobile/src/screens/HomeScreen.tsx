import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { BecomeSellerDialog } from "../components/BecomeSellerDialog";
import { showGuestSignUpPrompt } from "../components/guestSignUpPrompt";
import { useRouter } from "expo-router";
import type { MobileLanguage } from "@gaavli/types";
import { useAppStore } from "../store";
import { formatMessage, messages } from "../i18n";
import { liveDashboard } from "../data/listings";
import { useHomeListings } from "../listings";
import { useDashboardDirectory } from "../directory";
import { directoryPreview } from "../data/directory";
import { useListingClock } from "../hooks/useListingClock";
import { Button, ErrorMessage } from "../components/ui";
import type {
  HomeDashboardData,
  HomeDestination,
  HomeListing,
} from "../types/home";
import { AccountHeader } from "../components/dashboard/AccountHeader";
import { BrowsingVillageSelector } from "../components/BrowsingVillageSelector";
import { browsingVillageFor } from "../storage/browsingVillage";
import { ProductCard } from "../components/dashboard/ProductCard";
import { MarketplaceCard } from "../components/dashboard/MarketplaceCard";
// Restore with the coordinator banner when it is enabled again.
// import { CoordinatorInfo } from "../components/dashboard/CoordinatorInfo";
import { BecomeSellerCard } from "../components/dashboard/SellerCards";
import { VillageActionCard } from "../components/dashboard/VillageActionCard";
import {
  DashboardScreen,
  PreviewBanner,
  SectionHeader,
  d,
} from "../components/dashboard/primitives";

export function HomeDashboard({
  data,
  language,
  onNavigate,
  onProductPress,
  listingStatus,
  listingsReady = true,
}: {
  data: HomeDashboardData;
  language: MobileLanguage;
  onNavigate: (route: HomeDestination) => void;
  onProductPress: (listing: HomeListing) => void;
  listingStatus?: React.ReactNode;
  listingsReady?: boolean;
}) {
  const t = messages(language);
  const signedIn = useAppStore((state) => !!state.session);
  const number = new Intl.NumberFormat(
    language === "mr" ? "mr-IN-u-nu-deva" : "en-IN",
  );
  return (
    <DashboardScreen>
      <AccountHeader
        language={language}
        browsingVillageControl={<BrowsingVillageSelector />}
      />
      {data.isPreview && <PreviewBanner />}
      {/* Temporarily hidden; retained for future use.
      <CoordinatorInfo coordinator={data.coordinator} language={language} />
      */}
      <View style={d.section}>
        <SectionHeader
          title={t.dashboardLiveAvailability}
          badge={formatMessage(t.dashboardFreshCount, {
            count: number.format(data.listings.length),
          })}
        />
        {listingStatus}
        <FlatList
          horizontal
          data={data.listings}
          keyExtractor={(item) => `${item.module ?? "marketplace"}:${item.id}`}
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
      <View style={d.section}>
        <SectionHeader title={t.dashboardCategories} />
        <MarketplaceCard
          count={listingsReady ? data.listingCount : undefined}
          language={language}
          onPress={() => onNavigate("/marketplace")}
        />
        {/* Services count badge temporarily hidden; retain for future use:
          badge={
            data.serviceCount === undefined
              ? t.dashboardCountUnavailable
              : formatMessage(t.dashboardProviderCount, {
                  count: number.format(data.serviceCount),
                })
          }
          badgeTone="blue"
        */}
        <VillageActionCard
          icon="build-outline"
          title={t.dashboardServices}
          subtitle={t.dashboardServicesDescription}
          onPress={() => onNavigate("/services")}
        />
        {/* Transport count badge temporarily hidden; retain for future use:
          badge={
            data.transportCount === undefined
              ? t.dashboardCountUnavailable
              : formatMessage(t.dashboardVehicleCount, {
                  count: number.format(data.transportCount),
                })
          }
          badgeTone="green"
        */}
        <VillageActionCard
          icon="car-outline"
          title={t.dashboardTransport}
          subtitle={t.dashboardTransportDescription}
          onPress={() => onNavigate("/transport")}
        />
        <VillageActionCard
          icon="megaphone-outline"
          title={t.villageInformation}
          subtitle={t.villageInformationDescription}
          onPress={() => onNavigate("/village-information")}
        />
      </View>
      {signedIn && data.user.isBuyer && !data.user.isSeller && (
        <BecomeSellerCard
          language={language}
          onPress={() => onNavigate("/become-seller")}
        />
      )}
    </DashboardScreen>
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
  data.listings = [
    ...data.listings,
    ...(directory.data?.services.entries ?? []).map((entry) =>
      directoryPreview(entry, now),
    ),
    ...(directory.data?.transport.entries ?? []).map((entry) =>
      directoryPreview(entry, now),
    ),
  ].sort(
    (a, b) =>
      a.postedMinutesAgo - b.postedMinutesAgo || b.id.localeCompare(a.id),
  );
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
          {page || directory.data ? t.listingsOffline : t.listingsOfflineEmpty}
        </Text>
      )}
      {!offline && query.isPending && (
        <Text style={d.description}>{t.listingsLoading}</Text>
      )}
      {query.isError && !offline && (
        <>
          <ErrorMessage message={t.listingsFailed} />
          <Button secondary onPress={() => void query.refetch()}>
            {t.retry}
          </Button>
        </>
      )}
      {directory.isError && !offline && (
        <>
          <ErrorMessage message={t.dashboardDirectoryFailed} />
          <Button secondary onPress={() => void directory.refetch()}>
            {t.retry}
          </Button>
        </>
      )}
      {!offline && directory.isPending && !query.isPending && (
        <Text style={d.description}>{t.listingsLoading}</Text>
      )}
      {page &&
        directory.data &&
        !query.isError &&
        !directory.isError &&
        !data.listings.length && (
          <Text style={d.description}>{t.dashboardDirectoryEmpty}</Text>
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
