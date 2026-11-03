import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { BrowsingVillageSelector } from "../BrowsingVillageSelector";
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
        <Text accessibilityRole="header" style={s.title}>
          {t.marketplace}
        </Text>
        <BrowsingVillageSelector />
        {session && <NotificationBell language={language} />}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  banner: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48 },
  title: { ...theme.type.title, color: theme.colors.heading, flexShrink: 0 },
});
