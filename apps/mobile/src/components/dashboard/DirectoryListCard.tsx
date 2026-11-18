import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  directoryGroup,
  directoryGroupsOf,
  type DirectoryGroupId,
} from "@gaavli/constants";
import type { z } from "zod";
import type { directoryEntrySchema } from "@gaavli/validation";
import type { MobileLanguage } from "@gaavli/types";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { resolveListingPhotoUrl } from "../../data/listingPhotos";
import { openState } from "../../data/operatingHours";
import { CategoryIcon } from "./CategoryIcon";

type Entry = z.infer<typeof directoryEntrySchema>;

// One service or vehicle in the list: a picture, "Available", the name, a
// phone number and the village. The whole card opens the details.
export function DirectoryListCard({
  entry,
  language,
  onPress,
}: {
  entry: Entry;
  language: MobileLanguage;
  onPress: () => void;
}) {
  const t = messages(language);
  const module = theme.modules[entry.module];
  const name = language !== "en" ? entry.nameMr || entry.name : entry.name;
  const village =
    language !== "en"
      ? entry.village.nameMr || entry.village.name
      : entry.village.name;
  const photo = entry.images?.[0]
    ? resolveListingPhotoUrl(
        entry.images[0].url,
        process.env.EXPO_PUBLIC_API_BASE_URL,
        __DEV__,
      )
    : null;
  const group: DirectoryGroupId | undefined = directoryGroupsOf(entry.module, {
    profession: entry.name,
    professionMr: entry.nameMr,
    serviceCategory: entry.category,
    providerType: entry.providerType,
  })[0];
  // A category icon stands in when the provider added no photo.
  const icon =
    (group ? directoryGroup(group)?.icon : undefined) ??
    (entry.module === "transport" ? "car-outline" : "construct-outline");
  const phone = entry.contacts[0]?.mobile;
  // Open now / Closed from the saved hours, or Closed when the owner closed
  // it for now. No badge when there are no hours to go by.
  const state = openState(entry.hours, !!entry.closed);
  const stateLabel =
    state === "open"
      ? t.directoryOpenNow
      : state === "closed"
        ? t.directoryClosedNow
        : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[name, village, stateLabel]
        .filter(Boolean)
        .join(", ")}
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && s.pressed]}
    >
      <View style={[s.thumb, { backgroundColor: module.tint }]}>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={s.thumbImage}
            accessible={false}
          />
        ) : (
          <CategoryIcon name={icon} size={28} color={module.color} />
        )}
      </View>
      <View style={s.copy}>
        {stateLabel && (
          <View style={[s.badge, state === "closed" && s.badgeClosed]}>
            <Text
              style={[s.badgeText, state === "closed" && s.badgeTextClosed]}
            >
              {stateLabel}
            </Text>
          </View>
        )}
        <Text numberOfLines={2} style={s.name}>
          {name}
        </Text>
        <View style={s.meta}>
          <View style={s.metaItem}>
            <Ionicons
              accessible={false}
              name={phone ? "call-outline" : "pricetag-outline"}
              size={14}
              color={theme.colors.muted}
            />
            <Text numberOfLines={1} style={s.metaText}>
              {phone ? `+91 ${phone}` : entry.category}
            </Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons
              accessible={false}
              name="location"
              size={14}
              color={theme.colors.muted}
            />
            <Text numberOfLines={1} style={s.metaText}>
              {village}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 10,
    padding: 8,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: theme.radii.control,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: { width: "100%", height: "100%" },
  copy: { flex: 1, gap: 2, justifyContent: "center" },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.successBackground,
  },
  badgeText: { color: theme.colors.success, fontSize: 12, fontWeight: "700" },
  badgeClosed: { backgroundColor: theme.colors.errorBackground },
  badgeTextClosed: { color: theme.colors.error },
  name: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  meta: { gap: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { flex: 1, color: theme.colors.muted, fontSize: 13 },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
