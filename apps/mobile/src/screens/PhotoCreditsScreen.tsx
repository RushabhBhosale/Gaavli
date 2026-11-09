import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { directoryGroupLabel } from "@gaavli/constants";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { theme } from "../theme";
import { Screen } from "../components/ui";
import { AppHeader } from "../components/AppHeader";
import { PHOTO_CREDITS } from "../data/photoCredits";

// The photos on the Services and Transport tiles are used under Creative
// Commons licences that ask for the author to be named.
export default function PhotoCreditsScreen() {
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const open = (url: string) =>
    void Linking.openURL(url).catch(() => Alert.alert(t.callError));
  return (
    <Screen header={<AppHeader title={t.photoCredits} back="/profile" />}>
      <Text style={s.intro}>{t.photoCreditsIntro}</Text>
      {PHOTO_CREDITS.map((credit) => (
        <View key={credit.group} style={s.card}>
          <Text style={s.group}>
            {directoryGroupLabel(credit.group, language)}
          </Text>
          <Text style={s.author}>{credit.author}</Text>
          <View style={s.links}>
            <Pressable
              accessibilityRole="link"
              disabled={!credit.page}
              onPress={() => open(credit.page)}
              style={s.link}
            >
              <Ionicons
                accessible={false}
                name="image-outline"
                size={16}
                color={theme.colors.steel}
              />
              <Text style={s.linkText}>{t.photoCreditsOriginal}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              disabled={!credit.licenseUrl}
              onPress={() => open(credit.licenseUrl)}
              style={s.link}
            >
              <Ionicons
                accessible={false}
                name="document-text-outline"
                size={16}
                color={theme.colors.steel}
              />
              <Text style={s.linkText}>{credit.license}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </Screen>
  );
}
const s = StyleSheet.create({
  intro: { ...theme.type.body, color: theme.colors.muted },
  card: {
    gap: 4,
    padding: 14,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  group: { ...theme.type.subheading, color: theme.colors.heading },
  author: { ...theme.type.body, color: theme.colors.text },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  link: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.steelTint,
  },
  linkText: { ...theme.type.label, color: theme.colors.steel },
});
