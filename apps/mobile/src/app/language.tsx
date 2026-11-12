import { LANGUAGE_LABELS } from "../locale";
import { theme } from "../theme";
import { useRef, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MOBILE_LANGUAGES } from "@gaavli/constants";
import type { MobileVillage } from "@gaavli/types";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { confirmLanguage, postAuthHref } from "../storage/preferences";
import { preferenceStorage } from "../storage/sqlite";
import { Brand, Button, ErrorMessage } from "../components/ui";
import { VillageSelectField } from "../components/VillageSelectField";
import {
  clearBrowsingVillage,
  selectBrowsingVillage,
} from "../storage/browsingVillage";

export default function LanguageScreen() {
  const router = useRouter();
  const language = useAppStore((state) => state.language);
  const session = useAppStore((state) => state.session);
  const browsingVillage = useAppStore((state) => state.browsingVillage);
  const contactReturnListingId = useAppStore(
    (state) => state.contactReturnListingId,
  );
  const t = messages(language);
  const [selected, setSelected] = useState<MobileVillage | null>(
    browsingVillage,
  );
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const submitting = useRef(false);
  if (session)
    return (
      <Redirect href={postAuthHref(session.user, contactReturnListingId)} />
    );

  async function next(
    destination: "/home" | "/register",
    mode?: "login" | "register",
  ) {
    if (submitting.current) return;
    if (destination === "/home" && !selected) return;
    submitting.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const preferences = await confirmLanguage(preferenceStorage, language);
      if (destination === "/register") {
        await clearBrowsingVillage(preferenceStorage);
        useAppStore.getState().clearAuthenticatedState();
        useAppStore
          .getState()
          .restore({ ...preferences, browsingVillage: null });
        // Clearing the session resets the mode, so choose it afterwards.
        if (mode) useAppStore.getState().setAuthMode(mode);
      } else {
        if (selected)
          await selectBrowsingVillage(
            preferenceStorage,
            selected,
            useAppStore.getState().setBrowsingVillage,
          );
        useAppStore.getState().restore(preferences);
      }
      router.replace(
        mode ? { pathname: "/register", params: { mode } } : destination,
      );
    } catch {
      setFailed(true);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={s.languages}
          accessibilityRole="radiogroup"
          accessibilityLabel={t.languageTitle}
        >
          {MOBILE_LANGUAGES.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={LANGUAGE_LABELS[value]}
              accessibilityState={{
                checked: language === value,
                disabled: busy,
              }}
              disabled={busy}
              onPress={() => useAppStore.getState().setLanguage(value)}
              style={[s.segment, language === value && s.segmentSelected]}
            >
              <Text
                style={[s.segmentText, language === value && s.segmentTextOn]}
              >
                {LANGUAGE_LABELS[value]}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.brandSection}>
          <Brand />
        </View>
        <View style={s.action}>
          <VillageSelectField
            selected={selected}
            disabled={busy}
            onSelect={setSelected}
          />
          {failed && <ErrorMessage message={t.storageError} />}
          <Button
            loading={busy}
            disabled={!selected}
            onPress={() => void next("/home")}
          >
            {t.continue}
          </Button>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${t.alreadyRegisteredPrompt} ${t.villageLoginLink}`}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => {
              void next("/register", "login");
            }}
            style={({ pressed }) => [
              s.loginLink,
              busy && s.loginDisabled,
              pressed && s.loginPressed,
            ]}
          >
            <Text style={s.loginText}>
              {t.alreadyRegisteredPrompt}{" "}
              <Text style={s.loginHighlight}>{t.villageLoginLink}</Text>
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${t.newHerePrompt} ${t.registerLink}`}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => {
              void next("/register", "register");
            }}
            style={({ pressed }) => [
              s.loginLink,
              busy && s.loginDisabled,
              pressed && s.loginPressed,
            ]}
          >
            <Text style={s.loginText}>
              {t.newHerePrompt}{" "}
              <Text style={s.loginHighlight}>{t.registerLink}</Text>
            </Text>
          </Pressable>
        </View>
        <View style={s.trust}>
          {(
            [
              ["eye-outline", t.trustBrowse],
              ["call-outline", t.trustContact],
              ["shield-checkmark-outline", t.trustLocal],
            ] as const
          ).map(([icon, label]) => (
            <View key={icon} style={s.trustItem}>
              <Ionicons
                accessible={false}
                name={icon}
                size={20}
                color={theme.colors.primary}
              />
              <Text style={s.trustText}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: theme.layout.screenPadding,
    paddingBottom: 24,
    gap: 28,
  },
  languages: {
    flexDirection: "row",
    alignSelf: "center",
    marginTop: 8,
    padding: 4,
    gap: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  segment: {
    minHeight: 40,
    minWidth: 92,
    paddingHorizontal: 16,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentSelected: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentText: { ...theme.type.label, color: theme.colors.muted },
  segmentTextOn: { color: theme.colors.primaryDark, fontWeight: "700" },
  brandSection: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingVertical: 12,
  },
  copy: { alignItems: "center", gap: 6 },
  tagline: {
    ...theme.type.heading,
    color: theme.colors.primaryDark,
    textAlign: "center",
  },
  support: {
    ...theme.type.body,
    color: theme.colors.muted,
    textAlign: "center",
    maxWidth: 320,
  },
  action: {
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loginLink: {
    minHeight: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  loginText: {
    ...theme.type.caption,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: theme.colors.muted,
  },
  loginHighlight: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  loginDisabled: { opacity: theme.interaction.disabledOpacity },
  loginPressed: { opacity: theme.interaction.pressedOpacity },
  trust: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  trustItem: { flex: 1, alignItems: "center", gap: 6 },
  trustText: {
    ...theme.type.micro,
    fontWeight: "500",
    color: theme.colors.muted,
    textAlign: "center",
  },
});
