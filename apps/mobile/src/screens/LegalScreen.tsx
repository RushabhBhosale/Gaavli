import { StyleSheet, Text, View } from "react-native";
import { useAppStore } from "../store";
import { formatMessage, messages } from "../i18n";
import { theme } from "../theme";
import { legalDoc, LEGAL_UPDATED, type LegalKind } from "../data/legal";
import { Screen } from "../components/ui";
import { AppHeader } from "../components/AppHeader";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";

// Terms of Use and Privacy Policy, readable without signing in.
export default function LegalScreen({ kind }: { kind: LegalKind }) {
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const doc = legalDoc(kind, language);
  return (
    <ProtectedPage allowGuest>
      <Screen header={<AppHeader title={doc.title} back="/home" />}>
        <Text style={s.updated}>
          {formatMessage(t.legalUpdated, { date: LEGAL_UPDATED })}
        </Text>
        <Text style={s.body}>{doc.intro}</Text>
        {doc.sections.map((section, index) => (
          <View key={section.heading} style={s.section}>
            <Text accessibilityRole="header" style={s.heading}>
              {`${index + 1}. ${section.heading}`}
            </Text>
            <Text style={s.body}>{section.body}</Text>
          </View>
        ))}
      </Screen>
    </ProtectedPage>
  );
}
const s = StyleSheet.create({
  updated: { color: theme.colors.muted, fontSize: 13 },
  section: { gap: 6 },
  heading: { ...theme.type.subheading, color: theme.colors.heading },
  body: { color: theme.colors.text, fontSize: 16, lineHeight: 25 },
});
