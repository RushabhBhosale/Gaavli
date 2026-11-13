import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type {
  DirectoryGroup,
  DirectoryGroupId,
  DirectoryModule,
} from "@gaavli/constants";
import type { MobileLanguage } from "@gaavli/types";
import { formatMessage, messages } from "../../i18n";
import { theme } from "../../theme";
import { directoryGroupImages } from "./directoryGroupImages";

export function DirectoryCategoryGrid({
  groups,
  counts,
  language,
  module,
  onSelect,
}: {
  groups: readonly DirectoryGroup[];
  counts: ReadonlyMap<DirectoryGroupId, number>;
  language: MobileLanguage;
  module: DirectoryModule;
  onSelect: (id: DirectoryGroupId) => void;
}) {
  const t = messages(language);
  const palette = theme.modules[module];
  const columns = [
    groups.filter((_, index) => index % 2 === 0),
    groups.filter((_, index) => index % 2 === 1),
  ];

  return (
    <View style={s.grid}>
      {columns.map((column, columnIndex) => (
        <View key={columnIndex} style={s.column}>
          {column.map((group, index) => {
            const count = counts.get(group.id) ?? 0;
            const countLabel = count
              ? formatMessage(t.dashboardAvailableCount, {
                  count: new Intl.NumberFormat(
                    language === "en" ? "en-IN" : `${language}-IN-u-nu-deva`,
                  ).format(count),
                })
              : t.directoryNoneYet;
            const image = directoryGroupImages[group.id];
            // Independent columns and alternating artwork heights create the
            // staggered layout. Text grows freely with language and font scale.
            const aspectRatio = (index + columnIndex) % 3 === 0 ? 0.95 : 1.4;

            return (
              <Pressable
                key={group.id}
                accessibilityRole="button"
                accessibilityLabel={`${group[language]}, ${countLabel}`}
                onPress={() => onSelect(group.id)}
                style={({ pressed }) => [s.tile, pressed && s.pressed]}
              >
                <View style={s.tileContent}>
                  <Image
                    source={image}
                    resizeMode="cover"
                    accessible={false}
                    style={[s.artwork, { aspectRatio }]}
                  />
                  <View style={s.copy}>
                    <Text style={s.label}>{group[language]}</Text>
                    <Text
                      style={[
                        s.count,
                        { color: count ? palette.color : theme.colors.muted },
                      ]}
                    >
                      {countLabel}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  column: { flex: 1, minWidth: 0, gap: 16 },
  tile: {
    borderRadius: theme.radii.artwork,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.shadow.color,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tileContent: { borderRadius: theme.radii.artwork, overflow: "hidden" },
  artwork: { width: "100%" },
  copy: { padding: 12, gap: 6 },
  label: { ...theme.type.subheading, color: theme.colors.heading },
  count: { ...theme.type.caption },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
