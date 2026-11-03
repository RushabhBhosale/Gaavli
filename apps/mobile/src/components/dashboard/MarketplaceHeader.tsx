import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { BrowsingVillageSelector } from "../BrowsingVillageSelector";
import { GuestProfileButton } from "./GuestProfileButton";
import { useAppStore } from "../../store";
import { NotificationBell } from "./NotificationBell";

// Where you are (Marketplace, your village) and the search to find something.
export function MarketplaceHeader({
  language,
  children,
}: {
  language: MobileLanguage;
  children: ReactNode;
}) {
  const t = messages(language);
  const session = useAppStore((state) => state.session);
  return (
    <View style={s.banner}>
      <View style={s.row}>
        <View style={s.titleCol}>
          <Text accessibilityRole="header" style={s.title}>
            {t.marketplace}
          </Text>
          <Text numberOfLines={1} style={s.subtitle}>
            {t.marketplaceBrandTagline}
          </Text>
        </View>
        {!session && <GuestProfileButton language={language} />}
        {session && <NotificationBell language={language} />}
      </View>
      <View style={s.village}>
        <BrowsingVillageSelector />
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  banner: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  titleCol: { flex: 1, minWidth: 0, gap: 0 },
  title: { ...theme.type.display, color: theme.colors.heading },
  subtitle: { ...theme.type.caption, color: theme.colors.muted },
  village: { alignItems: "flex-start" },
});
