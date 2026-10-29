import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileLanguage } from "@gaavli/types";
import { useUnreadNotifications } from "../../notifications";
import { useAppStore } from "../../store";
import { formatMessage, messages } from "../../i18n";
import { theme } from "../../theme";
import { d } from "./primitives";

export function NotificationBell({
  language,
  disabled = false,
}: {
  language: MobileLanguage;
  disabled?: boolean;
}) {
  const session = useAppStore((state) => state.session);
  const offline = useAppStore((state) => state.offline);
  const unread = useUnreadNotifications();
  const router = useRouter();
  const t = messages(language);
  const refetch = unread.refetch;
  const accountId = session?.user.id;
  useFocusEffect(
    useCallback(() => {
      if (accountId && !offline) void refetch();
    }, [accountId, offline, refetch]),
  );
  if (!session) return null;
  const count = unread.data?.unreadCount;
  const number = new Intl.NumberFormat(
    language === "mr" ? "mr-IN-u-nu-deva" : "en-IN",
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        count === undefined
          ? t.notificationSettings
          : formatMessage(t.unreadNotificationCount, {
              count: number.format(count),
            })
      }
      accessibilityHint={unread.isError ? t.notificationCountFailed : undefined}
      accessibilityState={{ disabled, busy: unread.isLoading }}
      disabled={disabled}
      onPress={() => router.push("/notifications")}
      style={({ pressed }) => [
        s.control,
        pressed && d.pressed,
        disabled && s.disabled,
      ]}
    >
      <Ionicons
        accessible={false}
        name="notifications-outline"
        size={24}
        color={theme.colors.heading}
      />
      {unread.isLoading && (
        <ActivityIndicator
          style={s.loading}
          size="small"
          color={theme.colors.primaryDark}
        />
      )}
      {count !== undefined && count > 0 && (
        <View accessible={false} pointerEvents="none" style={s.badge}>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={s.count}
          >
            {count > 99 ? `${number.format(99)}+` : number.format(count)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
const s = StyleSheet.create({
  control: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: theme.interaction.disabledOpacity },
  loading: {
    position: "absolute",
    top: 0,
    right: 0,
    transform: [{ scale: 0.55 }],
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    color: theme.colors.surface,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 1,
  },
});
