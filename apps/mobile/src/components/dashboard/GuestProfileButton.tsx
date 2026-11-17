import { Pressable, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import type { MobileLanguage } from "@gaavli/types";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { d } from "./primitives";
import { showGuestSignUpPrompt } from "../guestSignUpPrompt";

export function GuestProfileButton({
  language,
  disabled = false,
  onDark = false,
}: {
  language: MobileLanguage;
  disabled?: boolean;
  onDark?: boolean;
}) {
  const router = useRouter();
  const t = messages(language);
  function showSignUp() {
    showGuestSignUpPrompt(language, () => {
      useAppStore.getState().setContactReturn(null);
      useAppStore.getState().setAuthMode("register");
      router.push("/register");
    });
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.signUp}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={showSignUp}
      style={({ pressed }) => [
        s.control,
        pressed && d.pressed,
        disabled && s.disabled,
      ]}
    >
      <View style={[s.avatar, onDark && s.avatarDark]}>
        <Ionicons
          accessible={false}
          name="person-outline"
          size={20}
          color={onDark ? theme.colors.heroText : theme.colors.primaryDark}
        />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  control: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.saffronBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarDark: {
    backgroundColor: theme.colors.heroSurface,
    borderColor: theme.colors.heroBorder,
  },
  disabled: { opacity: theme.interaction.disabledOpacity },
});
