import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { z } from "zod";
import type { directoryEntrySchema } from "@gaavli/validation";
import type { MobileLanguage } from "@gaavli/types";
import { directoryGroupsOf } from "@gaavli/constants";
import { directoryPreview } from "../../data/directory";
import { theme } from "../../theme";
import { ListingImage } from "./ListingImage";
import { listingRate } from "./listingText";
import { directoryGroupImages } from "./directoryGroupImages";

export function DirectoryListingCard({
  entry,
  language,
  onPress,
  width,
  wide = false,
}: {
  entry: z.infer<typeof directoryEntrySchema>;
  language: MobileLanguage;
  onPress: () => void;
  width?: number;
  wide?: boolean;
}) {
  const name = language === "en" ? entry.name : entry.nameMr || entry.name;
  const village =
    language === "en"
      ? entry.village.name
      : entry.village.nameMr || entry.village.name;
  const rate = listingRate(directoryPreview(entry), language);
  const [group] = directoryGroupsOf(entry.module, {
    profession: entry.name,
    professionMr: entry.nameMr,
    serviceCategory: entry.category,
    providerType: entry.providerType,
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[name, village, rate].join(", ")}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { width },
        wide && s.wide,
        pressed && s.pressed,
      ]}
    >
      <View style={[s.image, wide && s.wideImage]}>
        <ListingImage
          listing={{ photoUrl: entry.images[0]?.url, image: null }}
          fallbackSource={directoryGroupImages[group]}
          style={s.photo}
        />
      </View>
      <View style={[s.copy, wide && s.wideCopy]}>
        <Text numberOfLines={2} style={s.name}>
          {name}
        </Text>
        <View style={s.location}>
          <Ionicons
            accessible={false}
            name="location-outline"
            size={12}
            color={theme.colors.muted}
          />
          <Text numberOfLines={1} style={s.village}>
            {village}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[
            s.rate,
            {
              color:
                entry.price === null
                  ? theme.colors.muted
                  : theme.modules[entry.module].color,
            },
          ]}
        >
          {rate}
        </Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  wide: { flexDirection: "row", alignItems: "center", gap: 2 },
  image: { height: 106, backgroundColor: theme.colors.surfaceMuted },
  wideImage: { width: 94, height: 102 },
  photo: { width: "100%", height: "100%" },
  copy: { padding: 10, gap: 5 },
  wideCopy: { flex: 1 },
  name: { ...theme.type.label, minHeight: 42, color: theme.colors.heading },
  location: { flexDirection: "row", alignItems: "center", gap: 3 },
  village: {
    ...theme.type.micro,
    fontWeight: "400",
    color: theme.colors.muted,
    flex: 1,
  },
  rate: { ...theme.type.micro },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
