import { theme } from "../theme";
import { useRef, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MOBILE_LANGUAGES } from "@gaavli/constants";
import type { MobileVillage } from "@gaavli/types";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import {
  confirmLanguage,
  postAuthHref,
  saveGuestVillage,
} from "../storage/preferences";
import { preferenceStorage } from "../storage/sqlite";
import { Button, ErrorMessage } from "../components/ui";
import { VillageSelectField } from "../components/VillageSelectField";

export default function LanguageScreen() {
  const router = useRouter();
  const language = useAppStore((state) => state.language);
  const session = useAppStore((state) => state.session);
  const guestVillage = useAppStore((state) => state.guestVillage);
  const contactReturnListingId = useAppStore(
    (state) => state.contactReturnListingId,
  );
  const t = messages(language);
  const [selected, setSelected] = useState<MobileVillage | null>(guestVillage);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const submitting = useRef(false);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const illustrationHeight = Math.max(
    170,
    Math.min(340, (height - insets.top - insets.bottom) * 0.33),
  );
  if (session)
    return (
      <Redirect href={postAuthHref(session.user, contactReturnListingId)} />
    );

  async function next(destination: "/home" | "/register") {
    if (submitting.current) return;
    if (destination === "/home" && !selected) return;
    submitting.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await confirmLanguage(preferenceStorage, language);
      const preferences = selected
        ? await saveGuestVillage(preferenceStorage, selected)
        : await confirmLanguage(preferenceStorage, language);
      useAppStore.getState().restore(preferences);
      if (destination === "/register")
        useAppStore.getState().setAuthMode("login");
      router.replace(destination);
    } catch {
      setFailed(true);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <View
        style={s.languages}
        accessibilityRole="radiogroup"
        accessibilityLabel={t.languageTitle}
      >
        {MOBILE_LANGUAGES.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={value === "mr" ? "मराठी" : "English"}
            accessibilityState={{ checked: language === value, disabled: busy }}
            disabled={busy}
            onPress={() => useAppStore.getState().setLanguage(value)}
            style={s.languageTarget}
          >
            <View style={[s.pill, language === value && s.pillSelected]}>
              <Text
                style={[
                  s.languageText,
                  language === value && s.languageSelected,
                ]}
              >
                {value === "mr" ? "मराठी" : "English"}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.brandSection}>
          <Image
            source={require("../../assets/gaavli-welcome-mark.png")}
            style={s.mark}
            resizeMode="contain"
            accessible={false}
          />
          <Text accessibilityRole="header" style={s.title}>
            Gaavli
          </Text>
          <Text style={s.tagline}>{t.splashTagline}</Text>
          <View
            style={s.divider}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <View style={s.dividerLine} />
            <View style={s.leaf} />
            <View style={s.dividerLine} />
          </View>
          <Text style={s.support}>{t.splashDescription}</Text>
        </View>
        <View style={s.action}>
          <VillageSelectField
            selected={selected}
            disabled={busy}
            onSelect={setSelected}
          />
          <Text style={s.villageHelp}>{t.villageRequired}</Text>
          {failed && <ErrorMessage message={t.storageError} />}
          <Button
            loading={busy}
            disabled={!selected}
            onPress={() => void next("/home")}
          >
            {t.getStarted}
          </Button>
          <Button
            secondary
            disabled={busy}
            onPress={() => void next("/register")}
          >
            {t.switchToLogin}
          </Button>
        </View>
        <View style={[s.illustration, { height: illustrationHeight }]}>
          <Image
            source={require("../../assets/farm-welcome.webp")}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            accessible={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  languages: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 4,
  },
  languageTarget: {
    minHeight: theme.layout.touchTarget,
    minWidth: 72,
    justifyContent: "center",
  },
  pill: {
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: theme.colors.background,
  },
  pillSelected: {
    backgroundColor: theme.colors.tint,
    borderColor: theme.colors.tint,
  },
  languageText: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    textAlign: "center",
  },
  languageSelected: { color: theme.colors.primaryDark, fontWeight: "700" },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 8 },
  brandSection: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: 20,
    paddingBottom: 24,
  },
  mark: { width: 116, height: 116 },
  title: {
    color: theme.colors.brand,
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -1.5,
    textAlign: "center",
    marginTop: 2,
  },
  tagline: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 20,
  },
  dividerLine: { height: 1, width: 25, backgroundColor: theme.colors.border },
  leaf: {
    height: 9,
    width: 17,
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 12,
    transform: [{ rotate: "-25deg" }],
    backgroundColor: theme.colors.icon,
  },
  support: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 350,
  },
  villageHelp: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  action: {
    paddingHorizontal: 28,
    paddingBottom: 16,
    gap: 10,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  illustration: {
    marginHorizontal: 10,
    borderRadius: theme.radii.artwork,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },
});
