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
