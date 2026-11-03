import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import type { MobileLanguage } from "@gaavli/types";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { accountHeaderIdentity } from "../../data/accountHeader";
import { theme } from "../../theme";
import { d } from "./primitives";
import { GuestProfileButton } from "./GuestProfileButton";
import { NotificationBell } from "./NotificationBell";

export function AccountHeader({
  language,
  onVillagePress,
  browsingVillageControl,
  disabled = false,
  edgeInset = 20,
  topInset = 14,
}: {
  language: MobileLanguage;
  onVillagePress?: () => void;
  browsingVillageControl?: ReactNode;
  disabled?: boolean;
  edgeInset?: number;
  topInset?: number;
}) {
  const session = useAppStore((state) => state.session);
  const browsingVillage = useAppStore((state) => state.browsingVillage);
  const router = useRouter();
  const village = session?.user.village ?? browsingVillage;
  if (!session && !village) return null;
  const t = messages(language);
  const identity = session
    ? accountHeaderIdentity(session.user, language)
    : {
        name: t.guest,
        initials: "",
        role: "guest" as const,
        location: village
          ? [
              language !== "en" ? village.nameMr : village.name,
              village.taluka,
              village.district,
            ]
              .filter(Boolean)
              .join(", ")
          : "",
      };
  const role =
    identity.role === "coordinator"
      ? t.villageCoordinator
      : identity.role === "seller"
        ? t.seller
        : identity.role === "guest"
          ? t.guestBrowsing
          : t.buyer;
  return (
    <View
      style={[s.header, { marginHorizontal: -edgeInset, marginTop: -topInset }]}
    >
      <View style={s.topRow}>
        <View style={s.location}>
          {browsingVillageControl ??
            (!!identity.location && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${identity.location}. ${t.changeVillage}`}
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={
                  onVillagePress ||
                  (() => router.push(session ? "/village" : "/language"))
                }
                style={({ pressed }) => [
                  s.locationButton,
                  pressed && d.pressed,
                  disabled && s.disabled,
                ]}
              >
                <Ionicons
                  accessible={false}
                  name="location"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text numberOfLines={1} style={s.locationText}>
                  {identity.location}
                </Text>
                <Ionicons
                  accessible={false}
                  name="chevron-down"
                  size={16}
                  color={theme.colors.muted}
                />
              </Pressable>
            ))}
        </View>
        <View style={s.iconRow}>
          {session && (
            <NotificationBell language={language} disabled={disabled} />
          )}
          {!session ? (
            <GuestProfileButton language={language} disabled={disabled} />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.settings}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => router.push("/profile")}
              style={({ pressed }) => [
                s.control,
                pressed && d.pressed,
                disabled && s.disabled,
              ]}
            >
              <View style={s.avatar}>
                {identity.initials ? (
                  <Text style={s.initials}>{identity.initials}</Text>
                ) : (
                  <Ionicons
                    accessible={false}
                    name="person-outline"
                    size={20}
                    color={theme.colors.primaryDark}
                  />
                )}
              </View>
            </Pressable>
          )}
        </View>
      </View>
      <View style={s.identity}>
        <Text style={s.greeting}>{t.headerGreeting}</Text>
        <Text accessibilityRole="header" numberOfLines={1} style={s.name}>
          {identity.name}
        </Text>
        <View style={s.rolePill}>
          <Text style={s.role}>{role}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 6,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  location: { flex: 1, minWidth: 0, alignItems: "flex-start" },
  locationButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: "100%",
  },
  locationText: {
    ...theme.type.label,
    color: theme.colors.text,
    flexShrink: 1,
  },
  iconRow: { flexDirection: "row", alignItems: "center" },
  identity: { gap: 0, paddingTop: 4 },
  greeting: { ...theme.type.caption, color: theme.colors.muted },
  name: { ...theme.type.display, color: theme.colors.heading },
  rolePill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.tint,
  },
  role: { ...theme.type.micro, color: theme.colors.primaryDark },
  initials: { ...theme.type.label, color: theme.colors.primaryDark },
  control: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.softGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: theme.interaction.disabledOpacity },
});
