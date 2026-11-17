import { Text } from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { Button, Screen } from "../components/ui";
import { AppHeader } from "../components/AppHeader";
import {
  IconTile,
  Panel,
  PreviewBanner,
  d,
  type IconName,
} from "../components/dashboard/primitives";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";

export type UpcomingFeature =
  | "services"
  | "transport"
  | "add-listing"
  | "my-listings"
  | "insights"
  | "become-seller";
export default function UpcomingScreen({
  feature,
}: {
  feature: UpcomingFeature;
}) {
  const router = useRouter();
  const t = messages(useAppStore((state) => state.language));
  const features: Record<
    UpcomingFeature,
    { title: string; icon: IconName; description: string }
  > = {
    services: {
      title: t.services,
      icon: "build-outline",
      description: t.servicesDescription,
    },
    transport: {
      title: t.transport,
      icon: "car-outline",
      description: t.transportDescription,
    },
    "add-listing": {
      title: t.addListing,
      icon: "add-circle-outline",
      description: t.upcomingDescription,
    },
    "my-listings": {
      title: t.myListings,
      icon: "list-outline",
      description: t.upcomingDescription,
    },
    insights: {
      title: t.viewInsights,
      icon: "bar-chart-outline",
      description: t.upcomingDescription,
    },
    "become-seller": {
      title: t.becomeSeller,
      icon: "leaf-outline",
      description: t.sellerSetupDescription,
    },
  };
  const item = features[feature];
  return (
    <ProtectedPage allowGuest>
      <Screen header={<AppHeader title={item.title} back="/home" />}>
        <PreviewBanner />
        <Panel>
          <IconTile name={item.icon} />
          <Text style={d.cardTitle}>{t.upcomingTitle}</Text>
          <Text style={d.description}>{item.description}</Text>
          {feature === "become-seller" && (
            <Text style={d.description}>{t.upcomingDescription}</Text>
          )}
        </Panel>
        {feature === "become-seller" && (
          <Button onPress={() => router.push("/add-listing")}>
            {t.addListing}
          </Button>
        )}
      </Screen>
    </ProtectedPage>
  );
}
