import { useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "../store";
import { activateSeller } from "../session";
import { messages } from "../i18n";
import { errorMessage } from "../errors";
import { theme } from "../theme";
import { Button, ErrorMessage } from "./ui";

export function BecomeSellerDialog({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { language, offline } = useAppStore();
  const t = messages(language);
  const router = useRouter();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const submitting = useRef(false);
  function close() {
    if (submitting.current) return;
    setFailure(null);
    onClose();
  }
  async function confirm() {
    if (submitting.current || offline) return;
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await activateSeller();
      void client.invalidateQueries({ queryKey: ["home-listings"] });
      void client.invalidateQueries({ queryKey: ["own-listings"] });
      onClose();
      router.replace("/my-listings");
    } catch (error) {
      setFailure(errorMessage(error, language));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={s.overlay}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View accessibilityViewIsModal style={s.dialog}>
            <View style={s.art}>
              <Text accessible={false} style={s.emoji}>
                🌾
              </Text>
            </View>
            <Text accessibilityRole="header" style={s.title}>
              {t.sellerConfirmTitle}
            </Text>
            <Text style={s.description}>{t.sellerConfirmDescription}</Text>
            {offline && <Text style={s.description}>{t.sellerOffline}</Text>}
            {failure && <ErrorMessage message={failure} />}
            <View style={s.actions}>
              <View style={s.action}>
                <Button secondary disabled={busy} onPress={close}>
                  {t.sellerNo}
                </Button>
              </View>
              <View style={s.action}>
                <Button
                  disabled={offline}
                  loading={busy}
                  onPress={() => void confirm()}
                >
                  {t.sellerYes}
                </Button>
              </View>
            </View>
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
    gap: 16,
  },
  art: {
    alignSelf: "center",
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 38 },
  title: {
    fontSize: 21,
    fontWeight: "700",
    color: theme.colors.heading,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: theme.colors.muted,
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: 12 },
  action: { flex: 1 },
});
