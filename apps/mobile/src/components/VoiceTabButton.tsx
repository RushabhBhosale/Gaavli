import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { theme } from "../theme";
import {
  marketplaceSearchRoute,
  produceVoiceHints,
  voiceProductSearch,
} from "../data/voiceSearch";
import { useVoiceSearch } from "../hooks/useVoiceSearch";
import { showToast } from "../toast";
import { VoiceMicButton, voiceErrorText } from "./VoiceMicButton";

const VOICE_HINTS = produceVoiceHints();

// A raised mic in the middle of the bottom bar, on every tab: tap it, or hold
// it while speaking, and the Marketplace opens showing that product.
export function VoiceTabButton() {
  const router = useRouter();
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const voice = useVoiceSearch({
    language,
    scope: "tab-bar",
    hints: VOICE_HINTS,
    alwaysOn: true,
    onResult: (transcript) => {
      const spoken = voiceProductSearch(transcript, language);
      if (spoken.text)
        router.navigate(
          marketplaceSearchRoute(spoken.text, spoken.productGroup),
        );
    },
  });
  const failure = voiceErrorText(t, voice.error);
  useEffect(() => {
    if (!failure) return;
    showToast(failure, "error");
    voice.clearError();
  }, [failure, voice]);
  const busy = voice.status !== "idle";
  return (
    <View style={s.slot}>
      <View style={s.raised}>
        <VoiceMicButton
          solid
          status={voice.status}
          onStart={voice.start}
          onFinish={voice.finish}
          onCancel={voice.cancel}
          t={t}
          style={s.mic}
        />
      </View>
      <Text
        numberOfLines={1}
        accessibilityLiveRegion="polite"
        style={[s.label, busy && s.labelBusy]}
      >
        {voice.status === "listening"
          ? t.voiceListeningShort
          : voice.status === "processing"
            ? t.voiceProcessingShort
            : t.voiceTab}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  slot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
  },
  // A round saffron button lifted above the bar with a white ring, so it
  // reads as the app's main action.
  raised: {
    marginTop: -30,
    padding: 5,
    borderRadius: 36,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  mic: { width: 60, height: 60, borderRadius: 30 },
  label: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    color: theme.colors.steel,
    includeFontPadding: true,
  },
  labelBusy: { fontWeight: "700", color: theme.colors.primary },
});
