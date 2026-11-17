import { Redirect, useRouter } from "expo-router";
import { Text } from "react-native";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { postAuthHref } from "../../storage/preferences";
import { Brand, Button, Screen, styles } from "../../components/ui";

// Shown once, right after a new account's number is verified: an optional
// step to register a shop, service or organisation.
export default function ProviderWelcomeScreen() {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  if (!session) return <Redirect href="/register" />;
  return (
    <Screen>
      <Brand compact />
      <Text
        accessibilityRole="header"
        style={[styles.title, { textAlign: "center" }]}
      >
        {t.regProviderTitle}
      </Text>
      <Text style={[styles.body, { textAlign: "center" }]}>
        {t.regProviderText}
      </Text>
      <Button onPress={() => router.replace("/provider/type")}>
        {t.regAddProvider}
      </Button>
      <Button
        secondary
        onPress={() => router.replace(postAuthHref(session.user, null, false))}
      >
        {t.regSkipProvider}
      </Button>
    </Screen>
  );
}
