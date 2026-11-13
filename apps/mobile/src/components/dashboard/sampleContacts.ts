import { Linking } from "react-native";
import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../../i18n";
import { showAlert } from "../../alert";

export function dialSampleContact(phone: string, language: MobileLanguage) {
  const t = messages(language);
  if (!/^[6-9]\d{9}$/.test(phone)) {
    showAlert(t.callError);
    return;
  }
  showAlert(t.sampleCallTitle, t.sampleCallMessage, [
    { text: t.cancel, style: "cancel" },
    {
      text: t.openDialer,
      onPress: () => {
        void Linking.openURL(`tel:+91${phone}`).catch(() =>
          showAlert(t.callError),
        );
      },
    },
  ]);
}
