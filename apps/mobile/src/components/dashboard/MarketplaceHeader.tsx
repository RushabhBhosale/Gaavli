import type { ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { d } from "./primitives";
import { BrowsingVillageSelector } from "../BrowsingVillageSelector";
import { GuestProfileButton } from "./GuestProfileButton";
import { useAppStore } from "../../store";

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
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={s.art}
      >
        <Image
          accessible={false}
          source={require("../../../assets/account-header-village.png")}
          resizeMode="contain"
          style={s.artImage}
        />
      </View>
      <View style={s.row}>
        <View style={s.brand}>
          <Image
            accessible={false}
            source={require("../../../assets/gaavli-welcome-mark.png")}
            style={s.logo}
            resizeMode="contain"
          />
          <View style={s.brandCopy}>
            <Text
              accessibilityRole="header"
              accessibilityLabel={`Gaavli. ${t.marketplace}`}
              style={[d.sectionTitle, { flex: 0 }]}
            >
              Gaavli
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={d.badgeText}
            >
              {t.marketplaceBrandTagline}
            </Text>
          </View>
        </View>
        <View style={s.village}>
          <BrowsingVillageSelector />
        </View>
        {!session && <GuestProfileButton language={language} />}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    marginHorizontal: -20,
    marginTop: -14,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
    borderBottomLeftRadius: theme.radii.card,
    borderBottomRightRadius: theme.radii.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
  },
  brand: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  brandCopy: { flex: 1, gap: 1 },
  logo: { width: 28, height: 34 },
  village: { flexShrink: 1, maxWidth: "48%", minWidth: 0 },
  art: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 180,
    height: 64,
    overflow: "hidden",
    opacity: 0.65,
  },
  artImage: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 240,
    height: 80,
  },
});
