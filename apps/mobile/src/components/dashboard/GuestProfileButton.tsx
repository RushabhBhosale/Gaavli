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
}: {
  language: MobileLanguage;
  disabled?: boolean;
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
      <View style={s.avatar}>
        <Ionicons
          accessible={false}
          name="person-outline"
          size={20}
          color={theme.colors.heading}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.softGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: theme.interaction.disabledOpacity },
});
