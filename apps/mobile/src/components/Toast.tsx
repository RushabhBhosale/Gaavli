import { useEffect } from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToastStore } from "../toast";
import { theme } from "../theme";
import { useAppStore } from "../store";
import { messages } from "../i18n";

export function Toast() {
  const notice = useToastStore((state) => state.notice);
  const dismiss = useToastStore((state) => state.dismiss);
  const insets = useSafeAreaInsets();
  const language = useAppStore((state) => state.language);
  useEffect(() => {
    if (!notice) return;
    if (Platform.OS === "ios")
      AccessibilityInfo.announceForAccessibility(notice.message);
    const timeout = setTimeout(() => dismiss(notice.id), 5000);
    return () => clearTimeout(timeout);
  }, [notice, dismiss]);
  if (!notice) return null;
  const error = notice.tone === "error";
  return (
    <View
      pointerEvents="box-none"
      style={[s.overlay, { bottom: insets.bottom + 12 }]}
    >
      <View style={[s.card, error && s.error]}>
        <Ionicons
          accessible={false}
          name={error ? "alert-circle" : "checkmark-circle"}
          size={24}
          color={error ? theme.colors.error : theme.colors.icon}
        />
        <Text accessibilityLiveRegion="polite" style={s.message}>
          {notice.message}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={messages(language).dismissToast}
          onPress={() => dismiss(notice.id)}
          style={s.close}
        >
          <Ionicons
            accessible={false}
            name="close"
            size={22}
            color={theme.colors.text}
          />
        </Pressable>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 20,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 8,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.tint,
    borderColor: theme.colors.primary,
    borderWidth: 1,
    elevation: 8,
    shadowColor: theme.shadow.color,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  error: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.error,
  },
  message: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
    fontWeight: "600",
  },
  close: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
});
