import { Text } from "react-native";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { Screen } from "../components/ui";
import { AppHeader } from "../components/AppHeader";
import { d } from "../components/dashboard/primitives";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";

export default function SellerContactScreen() {
  const t = messages(useAppStore((state) => state.language));
  return (
    <ProtectedPage>
      <Screen
        header={<AppHeader title={t.sellerContact} back="/marketplace" />}
      >
        <Text style={d.description}>{t.contactNotConnected}</Text>
      </Screen>
    </ProtectedPage>
  );
}
