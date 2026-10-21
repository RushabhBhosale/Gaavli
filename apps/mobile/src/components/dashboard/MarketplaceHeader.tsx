import type { ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileLanguage } from "@gaavli/types";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { d } from "./primitives";

export function MarketplaceHeader({
  language,
  children,
}: {
  language: MobileLanguage;
  children: ReactNode;
}) {
  const session = useAppStore((state) => state.session);
  if (!session) return null;
  const t = messages(language);
  const village = session.user.village;
  const villageName = village
    ? language === "mr"
      ? village.nameMr
      : village.name
    : t.villageLabel;
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
          <Ionicons
            accessible={false}
            name="location"
            size={16}
            color={theme.colors.primaryDark}
          />
          <Text
            numberOfLines={1}
            style={[
              d.description,
              { color: theme.colors.text, fontWeight: "600", flexShrink: 1 },
            ]}
          >
            {villageName}
          </Text>
        </View>
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
  village: {
    flexShrink: 1,
    maxWidth: "40%",
    marginLeft: "auto",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: theme.radii.control,
    backgroundColor: "rgba(255, 253, 247, 0.9)",
  },
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
