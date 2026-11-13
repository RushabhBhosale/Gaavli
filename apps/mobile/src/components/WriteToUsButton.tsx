import { Linking } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { theme } from "../theme";
import { SUPPORT_EMAIL } from "../config";
import { Button } from "./ui";
import { showAlert } from "../alert";

// Opens the person's mail app with a message to Gaavli, their name filled in.
export function openWriteToUs(
  t: ReturnType<typeof messages>,
  name?: string | null,
  village?: string,
) {
  if (!SUPPORT_EMAIL) return showAlert(t.writeToUs, t.writeToUsUnavailable);
  const where = village ? ` (${village})` : "";
  const subject = encodeURIComponent(`${t.coordinatorEmailSubject}${where}`);
  const body = encodeURIComponent(name ? `\n\n${name}` : "");
  void Linking.openURL(
    `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`,
  ).catch(() => showAlert(t.coordinatorEmailError));
}
export function WriteToUsButton({ village }: { village?: string }) {
  const language = useAppStore((state) => state.language);
  const session = useAppStore((state) => state.session);
  const t = messages(language);
  return (
    <Button
      outlined
      onPress={() => openWriteToUs(t, session?.user.name, village)}
      icon={
        <Ionicons
          accessible={false}
          name="mail-outline"
          size={20}
          color={theme.colors.heading}
        />
      }
    >
      {t.writeToUs}
    </Button>
  );
}
