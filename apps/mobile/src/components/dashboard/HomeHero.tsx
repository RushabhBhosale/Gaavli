import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import type { MobileLanguage } from "@gaavli/types";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { accountHeaderIdentity } from "../../data/accountHeader";
import { theme } from "../../theme";
import { BrowsingVillageSelector } from "../BrowsingVillageSelector";
import { GuestProfileButton } from "./GuestProfileButton";
import { NotificationBell } from "./NotificationBell";
import { d } from "./primitives";

// The first thing a buyer sees: where they are, who they are, and a search
// that goes straight to the market. Dark green so it anchors the page.
export function HomeHero({
  language,
  topInset,
  onSearch,
}: {
  language: MobileLanguage;
  topInset: number;
  onSearch: () => void;
}) {
  const session = useAppStore((state) => state.session);
  const router = useRouter();
  const t = messages(language);
  const name = session
    ? accountHeaderIdentity(session.user, language).name
    : t.guest;
  return (
    <View style={[s.hero, { paddingTop: topInset + 8 }]}>
      <View style={s.topRow}>
        <View style={s.village}>
          <BrowsingVillageSelector onDark />
        </View>
        {session && <NotificationBell language={language} onDark />}
        {!session ? (
          <GuestProfileButton language={language} onDark />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.settings}
            onPress={() => router.push("/profile")}
            style={({ pressed }) => [s.profile, pressed && d.pressed]}
          >
            <Ionicons
              accessible={false}
              name="person-outline"
              size={20}
              color={theme.colors.heroText}
            />
          </Pressable>
        )}
      </View>
      <View style={s.copy}>
        <Text style={s.greeting}>{t.headerGreeting}</Text>
        <Text accessibilityRole="header" numberOfLines={1} style={s.name}>
          {name}
        </Text>
      </View>
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={t.marketplaceSearchPlaceholder}
        onPress={onSearch}
        style={({ pressed }) => [s.search, pressed && d.pressed]}
      >
        <Ionicons
          accessible={false}
          name="search"
          size={20}
          color={theme.colors.muted}
        />
        <Text numberOfLines={1} style={s.searchText}>
          {t.homeSearchHint}
        </Text>
        <View style={s.mic}>
          <Ionicons
            accessible={false}
            name="mic-outline"
            size={20}
            color={theme.colors.primary}
          />
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: theme.colors.primaryDark,
    paddingHorizontal: theme.layout.screenPadding,
    // The tiles below overlap the bottom edge.
    paddingBottom: 36,
    gap: 8,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  village: { flex: 1, minWidth: 0, alignItems: "flex-start" },
  profile: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { gap: 0 },
  greeting: { ...theme.type.caption, color: theme.colors.heroMuted },
  name: { ...theme.type.title, color: theme.colors.heroText },
  search: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
  },
  searchText: { flex: 1, ...theme.type.body, color: theme.colors.placeholder },
  mic: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
});
