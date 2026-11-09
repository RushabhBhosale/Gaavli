import { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  OTHER_SERVICES_ENTRY,
  PROVIDER_KINDS,
  PROVIDER_MAIN_TYPES,
  PROVIDER_OTHER_TYPES,
  type ProviderType,
} from "@gaavli/constants";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { BackButton, Screen, styles } from "../../components/ui";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Step 1 of provider registration: what is being registered. "Other Services"
// opens a second list so the main list stays short.
export default function ProviderTypeScreen() {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const [other, setOther] = useState(false);
  if (!session) return <Redirect href="/register" />;
  const open = (type: ProviderType) =>
    router.push({ pathname: "/provider/form", params: { type } });
  const rows = other ? PROVIDER_OTHER_TYPES : PROVIDER_MAIN_TYPES;
  return (
    <Screen>
      <BackButton
        label={t.back}
        onPress={() =>
          other
            ? setOther(false)
            : router.canGoBack()
              ? router.back()
              : router.replace("/home")
        }
      />
      <Text accessibilityRole="header" style={styles.title}>
        {other ? t.provOtherTitle : t.provPickTitle}
      </Text>
      <Text style={styles.body}>
        {other ? t.provOtherHelp : t.provPickHint}
      </Text>
      <View style={s.list}>
        {rows.map((type) => {
          const kind = PROVIDER_KINDS[type];
          return (
            <Row
              key={type}
              icon={kind.icon}
              title={kind.title[language]}
              blurb={kind.blurb[language]}
              onPress={() => open(type)}
            />
          );
        })}
        {!other && (
          <Row
            icon={OTHER_SERVICES_ENTRY.icon}
            title={OTHER_SERVICES_ENTRY.title[language]}
            blurb={OTHER_SERVICES_ENTRY.blurb[language]}
            onPress={() => setOther(true)}
          />
        )}
      </View>
    </Screen>
  );
}

function Row({
  icon,
  title,
  blurb,
  onPress,
}: {
  icon: string;
  title: string;
  blurb: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${blurb}`}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
    >
      <View style={s.icon}>
        <Ionicons
          accessible={false}
          name={icon as IconName}
          size={24}
          color={theme.colors.primary}
        />
      </View>
      <View style={s.text}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.blurb}>{blurb}</Text>
      </View>
      <Ionicons
        accessible={false}
        name="chevron-forward"
        size={20}
        color={theme.colors.muted}
      />
    </Pressable>
  );
}
const s = StyleSheet.create({
  list: { gap: 10 },
  row: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pressed: { opacity: 0.85 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
  title: { ...theme.type.heading, color: theme.colors.heading },
  blurb: { ...theme.type.caption, color: theme.colors.muted },
});
