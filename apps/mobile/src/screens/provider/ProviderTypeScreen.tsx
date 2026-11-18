import { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  PROVIDER_KINDS,
  ProviderType,
  SERVICE_CATEGORIES,
  type ServiceCategory,
} from "@gaavli/constants";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { Input, Screen, styles } from "../../components/ui";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
const normalizeSearchText = (value: string) =>
  value.normalize("NFC").toLocaleLowerCase("en-IN").replace(/\s+/g, " ").trim();

// Step 1 of provider registration: one of the 15 Services categories (or
// Transport), then the subcategory, which decides the form that follows.
export default function ProviderTypeScreen() {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [search, setSearch] = useState("");
  if (!session) return <Redirect href="/register" />;
  const transport = PROVIDER_KINDS[ProviderType.TRANSPORT_DRIVER];
  const words = normalizeSearchText(search).split(" ").filter(Boolean);
  const rows = (category?.subcategories ?? []).filter((row) => {
    const text = normalizeSearchText(`${row.en} ${row.mr} ${row.hi}`);
    return words.every((word) => text.includes(word));
  });
  return (
    <Screen
      back={{
        label: t.back,
        onPress: () => {
          if (category) {
            setCategory(null);
            setSearch("");
          } else if (router.canGoBack()) router.back();
          else router.replace("/home");
        },
      }}
    >
      <Text accessibilityRole="header" style={styles.title}>
        {category ? category[language] : t.provPickTitle}
      </Text>
      <Text style={styles.body}>
        {category ? t.provSubHelp : t.provCategoryHint}
      </Text>
      {category ? (
        <View style={s.list}>
          <Input
            label={t.search}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {!rows.length && <Text style={styles.body}>{t.provSubEmpty}</Text>}
          {rows.map((row) => (
            <Row
              key={`${row.providerType}:${row.code}`}
              icon={category.icon}
              title={row[language]}
              onPress={() =>
                router.push({
                  pathname: "/provider/form",
                  params: { type: row.providerType, code: row.code },
                })
              }
            />
          ))}
        </View>
      ) : (
        <View style={s.list}>
          {SERVICE_CATEGORIES.map((item) => (
            <Row
              key={item.id}
              icon={item.icon}
              title={item[language]}
              blurb={item.subcategories
                .slice(0, 3)
                .map((row) => row[language])
                .join(", ")}
              onPress={() => setCategory(item)}
            />
          ))}
          <Row
            icon={transport.icon}
            title={transport.title[language]}
            blurb={transport.blurb[language]}
            onPress={() =>
              router.push({
                pathname: "/provider/form",
                params: { type: ProviderType.TRANSPORT_DRIVER },
              })
            }
          />
        </View>
      )}
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
  blurb?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={blurb ? `${title}. ${blurb}` : title}
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
        {!!blurb && <Text style={s.blurb}>{blurb}</Text>}
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
