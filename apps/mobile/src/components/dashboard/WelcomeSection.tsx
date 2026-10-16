import { StyleSheet, Text, View } from "react-native";
import type { MobileLanguage } from "@gaavli/types";
import type { HomeUser } from "../../types/home";
import { formatMessage, messages } from "../../i18n";
import { theme } from "../../theme";
import { Badge } from "./primitives";

export function WelcomeSection({
  user,
  language,
}: {
  user: HomeUser;
  language: MobileLanguage;
}) {
  const t = messages(language);
  console.log("started debugging");
  return (
    <View style={s.section}>
      <View style={s.greetingRow}>
        <Text accessibilityRole="header" style={s.title}>
          {formatMessage(t.greeting, { name: user.firstName })}jj
        </Text>
        <Badge yellow>{user.isSeller ? t.seller : t.buyer}</Badge>
      </View>
      <Text style={s.subtitle}>
        {formatMessage(t.availableInVillage, { village: user.village })}
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  section: { gap: 5 },
  greetingRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 23,
    lineHeight: 32,
    fontWeight: "700",
  },
  subtitle: { color: theme.colors.muted, fontSize: 14, lineHeight: 22 },
});
