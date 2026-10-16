import type { MobileLanguage } from "@gaavli/types";
import { formatMessage, messages } from "../../i18n";
import { NavigationCard } from "./primitives";

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
      title={t.marketplace}
      subtitle={t.marketplaceDescription}
      badge={
        count === undefined
          ? undefined
          : formatMessage(t.listingsCount, { count })
      }
      onPress={onPress}
    />
  );
}
