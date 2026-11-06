import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { VoiceFailure, VoiceStatus } from "../data/voiceSearch";
import type { messages } from "../i18n";
import { theme } from "../theme";

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
