import { Text } from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { BackButton, Screen } from "../components/ui";
import { SectionHeader, d } from "../components/dashboard/primitives";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";

export default function SellerContactScreen() {
  const router = useRouter();
  const t = messages(useAppStore((state) => state.language));
  return (
    <ProtectedPage>
      <Screen>
        <BackButton
          label={t.back}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/marketplace")
          }
        />
        <SectionHeader title={t.sellerContact} />
        <Text style={d.description}>{t.contactNotConnected}</Text>
      </Screen>
    </ProtectedPage>
  );
}
