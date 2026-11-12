import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import type { MobileVillage } from "@gaavli/types";
import { useAppStore } from "../store";
import { formatMessage, messages } from "../i18n";
import { theme } from "../theme";
import { selectBrowsingVillage } from "../storage/browsingVillage";
import { preferenceStorage } from "../storage/sqlite";
import { Button } from "./ui";

// Shown once after sign-in when the village being browsed is not the one the
// account belongs to.
let noticed = "";
export function VillageNoticeDialog() {
  const session = useAppStore((state) => state.session);
  const browsing = useAppStore((state) => state.browsingVillage);
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const client = useQueryClient();
  const [closed, setClosed] = useState(false);
  const home = session?.user.village ?? null;
  const key =
    session && home && browsing ? `${session.user.id}:${browsing.id}` : "";
  const differs = !!home && !!browsing && home.id !== browsing.id;
  const visible = !closed && differs && noticed !== key;
  if (!session || !home || !browsing) return null;
  const name = (village: MobileVillage) =>
    language !== "en" ? village.nameMr || village.name : village.name;
  function dismiss() {
    noticed = key;
    setClosed(true);
  }
  async function goHome() {
    if (!home) return;
    try {
      await selectBrowsingVillage(
        preferenceStorage,
        home,
        useAppStore.getState().setBrowsingVillage,
      );
      void client.invalidateQueries();
    } finally {
      dismiss();
    }
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View style={s.overlay}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View accessibilityViewIsModal style={s.dialog}>
            <View style={s.art}>
              <Ionicons
                name="location"
                size={34}
                color={theme.colors.primary}
              />
            </View>
            <Text accessibilityRole="header" style={s.title}>
              {t.villageNoticeTitle}
            </Text>
            <Text style={s.description}>
              {formatMessage(t.villageNoticeBody, {
                home: name(home),
                browsing: name(browsing),
              })}
            </Text>
            <Button onPress={dismiss}>
              {formatMessage(t.villageNoticeStay, { browsing: name(browsing) })}
            </Button>
            <Button secondary onPress={() => void goHome()}>
              {formatMessage(t.villageNoticeHome, { home: name(home) })}
            </Button>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.colors.overlay },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  dialog: {
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.sheet,
    padding: 24,
    gap: 14,
  },
  art: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 21,
    fontWeight: "700",
    color: theme.colors.heading,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.muted,
    textAlign: "center",
  },
});
