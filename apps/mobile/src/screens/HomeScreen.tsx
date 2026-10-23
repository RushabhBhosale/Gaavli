import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { BecomeSellerDialog } from "../components/BecomeSellerDialog";
import { useRouter } from "expo-router";
import type { MobileLanguage } from "@gaavli/types";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { liveDashboard } from "../data/listings";
import { useHomeListings } from "../listings";
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
  return (
    <DashboardScreen>
      <AccountHeader
        language={language}
        browsingVillageControl={<BrowsingVillageSelector />}
      />
      {data.isPreview && <PreviewBanner />}
      <View style={d.section}>
        <SectionHeader
          title={t.freshInVillage}
          action={t.viewAll}
          onPress={() => onNavigate("/marketplace")}
        />
        {listingStatus}
        <FlatList
          horizontal
          data={data.listings}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
          renderItem={({ item }) => (
            <ProductCard
              listing={item}
              language={language}
              onPress={() => onProductPress(item)}
            />
          )}
        />
      </View>
      <View style={d.section}>
        <SectionHeader title={t.marketplaceAndServices} />
        <MarketplaceCard
          count={listingsReady ? data.listingCount : undefined}
          language={language}
          onPress={() => onNavigate("/marketplace")}
        />
        <VillageActionCard
          icon="build-outline"
          title={t.services}
          subtitle={t.servicesDescription}
          onPress={() => onNavigate("/services")}
        />
        <VillageActionCard
          icon="car-outline"
          title={t.transport}
          subtitle={t.transportDescription}
          onPress={() => onNavigate("/transport")}
        />
        <VillageActionCard
          icon="megaphone-outline"
          title={t.villageInformation}
          subtitle={t.villageInformationDescription}
          onPress={() => onNavigate("/village-information")}
        />
      </View>
      {!data.user.isSeller && (
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
  const listingStatus = (
    <>
      {offline && (
        <Text style={d.description}>
          {page ? t.listingsOffline : t.listingsOfflineEmpty}
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
      {page && !query.isError && !listings.length && (
        <Text style={d.description}>{t.noListings}</Text>
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
              useAppStore.getState().setAuthMode("register");
              router.push("/register");
            }
            return;
          }
          router.push(route);
        }}
        onProductPress={(listing) =>
          router.push({ pathname: "/product/[id]", params: { id: listing.id } })
        }
      />
      <BecomeSellerDialog
        visible={sellerDialog}
        onClose={() => setSellerDialog(false)}
      />
    </>
  );
}
