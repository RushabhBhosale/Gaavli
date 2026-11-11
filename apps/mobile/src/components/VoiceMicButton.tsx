import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { VoiceFailure, VoiceStatus } from "../data/voiceSearch";
import type { messages } from "../i18n";
import { theme } from "../theme";
import { LANGUAGE_LABELS } from "../locale";
import { useAppStore } from "../store";

type Messages = ReturnType<typeof messages>;

// One mic for every search: tap to start (tap again to stop), or press and
// hold while speaking and let go to search. A ring pulses while it listens.
export function VoiceMicButton({
  status,
  onStart,
  onFinish,
  onCancel,
  t,
  solid = false,
  style,
}: {
  status: VoiceStatus;
  onStart: () => void;
  onFinish: () => void;
  onCancel: () => void;
  t: Messages;
  solid?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const holding = useRef(false);
  const busy = status !== "idle";
  const listening = status === "listening";
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!listening) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [listening, pulse]);
  const iconColor = solid
    ? theme.colors.onPrimary
    : busy
      ? theme.colors.onPrimary
      : theme.colors.primary;
  return (
    <>
      <VoiceDialog
        status={status}
        t={t}
        onFinish={onFinish}
        onCancel={onCancel}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={busy ? t.voiceCancel : t.voiceSearch}
        accessibilityHint={t.voiceHoldHint}
        accessibilityState={{ selected: busy, busy: status === "processing" }}
        hitSlop={6}
        delayLongPress={300}
        onPress={() => (busy ? onCancel() : onStart())}
        onLongPress={() => {
          if (busy) return;
          holding.current = true;
          onStart();
        }}
        onPressOut={() => {
          if (!holding.current) return;
          holding.current = false;
          onFinish();
        }}
        style={({ pressed }) => [
          s.button,
          (solid || busy) && s.solid,
          pressed && s.pressed,
          style,
        ]}
      >
        {listening && (
          <Animated.View
            pointerEvents="none"
            style={[
              s.ring,
              {
                opacity: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 0],
                }),
                transform: [
                  {
                    scale: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.7],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
        <View style={s.icon}>
          <Ionicons
            accessible={false}
            name={busy ? (listening ? "mic" : "stop") : "mic-outline"}
            size={22}
            color={iconColor}
          />
        </View>
      </Pressable>
    </>
  );
}

// A "Speak now" card over the page while the phone listens, in the style of
// the phone's own voice dialog: a big mic that pulses, tap it when done.
function VoiceDialog({
  status,
  t,
  onFinish,
  onCancel,
}: {
  status: VoiceStatus;
  t: Messages;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const language = useAppStore((state) => state.language);
  const visible = status !== "idle";
  const listening = status === "listening";
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!listening) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1300,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [listening, pulse]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        accessibilityLabel={t.voiceCancel}
        onPress={onCancel}
        style={d.overlay}
      >
        <Pressable accessibilityViewIsModal style={d.card}>
          <Text style={d.brand}>Gaavli</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.voiceDone}
            disabled={!listening}
            onPress={onFinish}
            style={d.micWrap}
          >
            {listening && (
              <Animated.View
                pointerEvents="none"
                style={[
                  d.pulse,
                  {
                    opacity: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.45, 0],
                    }),
                    transform: [
                      {
                        scale: pulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.6],
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}
            <View style={d.mic}>
              <Ionicons
                accessible={false}
                name="mic"
                size={38}
                color="#0B2A57"
              />
            </View>
          </Pressable>
          <Text accessibilityLiveRegion="polite" style={d.title}>
            {status === "listening"
              ? t.voiceSpeakNow
              : status === "processing"
                ? t.voiceProcessingShort
                : t.voiceRequesting}
          </Text>
          <Text style={d.language}>{LANGUAGE_LABELS[language]}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function voiceStatusText(t: Messages, status: VoiceStatus) {
  return status === "requesting"
    ? t.voiceRequesting
    : status === "processing"
      ? t.voiceProcessing
      : status === "listening"
        ? t.voiceListening
        : null;
}

export function voiceErrorText(t: Messages, error: VoiceFailure | null) {
  return error
    ? {
        permission: t.voicePermission,
        unavailable: t.voiceService,
        noSpeech: t.voiceNoSpeech,
        network: t.voiceNetwork,
        language: t.voiceLanguage,
        failed: t.voiceFailed,
        build: t.voiceBuild,
      }[error]
    : null;
}

const d = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
    alignItems: "center",
    gap: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: "#1F1F23",
  },
  brand: { fontSize: 24, fontWeight: "700", color: "#FFFFFF" },
  micWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#8AB4F8",
  },
  mic: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#8AB4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 24, lineHeight: 32, color: "#FFFFFF" },
  language: { fontSize: 14, color: "#C4C7CC" },
});
const s = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  solid: { backgroundColor: theme.colors.primary },
  pressed: { opacity: theme.interaction.pressedOpacity },
  icon: { alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.saffron,
  },
});
