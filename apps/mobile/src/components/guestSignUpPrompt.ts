import { Alert } from "react-native";
import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../i18n";

export function showGuestSignUpPrompt(
  language: MobileLanguage,
  onConfirm: () => void,
) {
  const t = messages(language);
  Alert.alert(
    t.guestSignUpFirst,
    undefined,
    [
      { text: t.notNow, style: "cancel" },
      { text: t.signUp, onPress: onConfirm },
    ],
    { cancelable: true },
  );
}

export function showGuestAuthPrompt(
  language: MobileLanguage,
  onContinue: (mode: "login" | "register") => void,
) {
  const t = messages(language);
  Alert.alert(
    t.signInRequired,
    undefined,
    [
      { text: t.notNow, style: "cancel" },
      { text: t.registrationTitle, onPress: () => onContinue("register") },
      { text: t.loginTitle, onPress: () => onContinue("login") },
    ],
    { cancelable: true },
  );
}
