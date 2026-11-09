import { useEffect, useState } from "react";
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
import {
  marketplaceSearchRoute,
  produceVoiceHints,
  voiceProductSearch,
} from "../../data/voiceSearch";
import { useVoiceSearch } from "../../hooks/useVoiceSearch";
import { useSearchIndex } from "../../listings";
import {
  VoiceMicButton,
  voiceErrorText,
  voiceStatusText,
} from "../VoiceMicButton";

const VOICE_HINTS = produceVoiceHints();

// The first thing a buyer sees: where they are, who they are, and a search
// that goes straight to the market. Steel blue so it anchors the page, with
// saffron only on the mic.
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
  // Fetch the product list for instant search a moment after Home appears, so
  // it never competes with the first screen for the network.
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWarm(true), 1500);
    return () => clearTimeout(timer);
  }, []);
  useSearchIndex(warm);
  const name = session
    ? accountHeaderIdentity(session.user, language).name
    : t.guest;
  // Tapping the box opens the search page; speaking opens the Marketplace
  // with results already showing: one step instead of two.
  const open = (value: string, productGroup?: string | null) => {
    if (!value.trim()) return onSearch();
    router.navigate(marketplaceSearchRoute(value, productGroup));
  };
  const voice = useVoiceSearch({
    language,
    scope: "home",
    hints: VOICE_HINTS,
    onResult: (transcript) => {
      const spoken = voiceProductSearch(transcript, language);
      if (spoken.text) open(spoken.text, spoken.productGroup);
    },
  });
  const voiceLine =
    voiceStatusText(t, voice.status) ?? voiceErrorText(t, voice.error);
  return (
    <View style={[s.hero, { paddingTop: topInset + 8 }]}>
      <View pointerEvents="none" style={s.circleLarge} />
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
      <View style={s.search}>
        <Ionicons
          accessible={false}
          name="search"
          size={20}
          color={theme.colors.muted}
        />
        <Pressable
          accessibilityRole="search"
          accessibilityLabel={t.marketplaceSearchPlaceholder}
          onPress={() => router.push("/search")}
          style={s.searchTap}
        >
          <Text numberOfLines={1} style={s.searchHint}>
            {t.homeSearchHint}
          </Text>
        </Pressable>
        <VoiceMicButton
          solid
          status={voice.status}
          onStart={voice.start}
          onFinish={voice.finish}
          onCancel={voice.cancel}
          t={t}
        />
      </View>
      {voiceLine && (
        <Text accessibilityLiveRegion="polite" style={s.voiceLine}>
          {voiceLine}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: theme.colors.primaryDark,
    overflow: "hidden",
    paddingHorizontal: theme.layout.screenPadding,
    // The tiles below overlap the bottom edge.
    paddingBottom: 36,
    gap: 8,
  },
  // A soft circle gives the banner depth without an image.
  circleLarge: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -70,
    top: -90,
    backgroundColor: theme.colors.steelSoft,
    opacity: 0.55,
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
  searchTap: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: "center" },
  searchHint: { fontSize: 16, color: theme.colors.placeholder },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingVertical: 8,
    fontSize: 16,
    color: theme.colors.text,
  },
  voiceLine: { ...theme.type.caption, color: theme.colors.heroMuted },
});
