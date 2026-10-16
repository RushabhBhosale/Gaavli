import { Alert, Linking } from "react-native";
import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../../i18n";

export function dialSampleContact(phone: string, language: MobileLanguage) {
  const t = messages(language);
  if (!/^[6-9]\d{9}$/.test(phone)) {
    Alert.alert(t.callError);
    return;
  }
  Alert.alert(t.sampleCallTitle, t.sampleCallMessage, [
    { text: t.cancel, style: "cancel" },
    {
      text: t.openDialer,
      onPress: () => {
        void Linking.openURL(`tel:+91${phone}`).catch(() =>
          Alert.alert(t.callError),
        );
      },
    },
  ]);
}
