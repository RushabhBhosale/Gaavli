import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../../i18n";
import { NavigationCard } from "./primitives";
import { listingCountLabel } from "./listingText";

export function MarketplaceCard({
  count,
  language,
  onPress,
}: {
  count?: number;
  language: MobileLanguage;
  onPress: () => void;
}) {
  const t = messages(language);
  return (
    <NavigationCard
      icon="storefront-outline"
      title={t.dashboardMarketplace}
      subtitle={t.dashboardMarketplaceDescription}
      dashboard
      badgeTone="yellow"
      badge={
        count === undefined
          ? t.dashboardCountUnavailable
          : listingCountLabel(count, language)
      }
      onPress={onPress}
    />
  );
}
