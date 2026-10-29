import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
              language === "mr" ? village.nameMr : village.name,
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
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={s.art}
      >
        <Image
          source={require("../../../assets/account-header-village.png")}
          style={s.artImage}
          resizeMode="cover"
        />
      </View>
      <View style={s.row}>
        <View style={s.identity}>
          <Text style={s.greeting}>{t.headerGreeting}</Text>
          <Text accessibilityRole="header" style={s.name}>
            {identity.name}
          </Text>
          <Text style={s.role}>{role}</Text>
        </View>
        <View style={s.headerControls}>
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
                      color={theme.colors.heading}
                    />
                  )}
                </View>
              </Pressable>
            )}
          </View>
          {!!browsingVillageControl && (
            <View style={s.browsingVillage}>{browsingVillageControl}</View>
          )}
        </View>
      </View>
      {!browsingVillageControl && !!identity.location && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${identity.location}. ${t.changeVillage}`}
          hitSlop={{ top: 8, bottom: 8 }}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={
            onVillagePress ||
            (() => router.push(session ? "/village" : "/language"))
          }
          style={({ pressed }) => [
            s.location,
            pressed && d.pressed,
            disabled && s.disabled,
          ]}
        >
          <Ionicons
            accessible={false}
            name="location"
            size={18}
            color={theme.colors.primaryDark}
          />
          <Text style={s.locationText}>{identity.location}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.tint,
    borderBottomLeftRadius: theme.radii.card,
    borderBottomRightRadius: theme.radii.card,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 3,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  headerControls: { alignItems: "flex-end", maxWidth: "60%", flexShrink: 1 },
  iconRow: { flexDirection: "row", gap: 4 },
  browsingVillage: { alignSelf: "flex-end", maxWidth: "100%" },
  identity: { flex: 1, gap: 0 },
  greeting: { fontSize: 13, lineHeight: 20, color: theme.colors.text },
  name: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "700",
    color: theme.colors.heading,
    includeFontPadding: true,
  },
  role: { fontSize: 13, lineHeight: 20, color: theme.colors.muted },
  initials: {
    fontSize: 13,
    lineHeight: 22,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  locationText: {
    fontSize: 12,
    lineHeight: 20,
    color: theme.colors.text,
    flexShrink: 1,
  },
  control: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.softGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  art: {
    position: "absolute",
    width: "70%",
    height: 94,
    right: 0,
    bottom: 0,
  },
  artImage: { width: "100%", height: "100%" },
  location: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    maxWidth: "72%",
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.tint,
  },
  disabled: { opacity: theme.interaction.disabledOpacity },
});
