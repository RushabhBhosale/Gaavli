import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "../theme";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import type { MobileLanguage } from "@gaavli/types";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { confirmLanguage } from "../storage/preferences";
import { preferenceStorage } from "../storage/sqlite";
import { logout } from "../session";
import { errorMessage } from "../errors";
import { Button, ErrorMessage } from "../components/ui";
import { DashboardScreen } from "../components/dashboard/primitives";
import { PageSceneHeader } from "../components/dashboard/PageSceneHeader";

export default function ProfileScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const { session, language, offline, guestVillage } = useAppStore();
  const t = messages(language);
  const [busy, setBusy] = useState<"language" | "logout" | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const submitting = useRef(false);
  async function selectLanguage(value: MobileLanguage) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy("language");
    setFailure(null);
    try {
      useAppStore
        .getState()
        .restore(await confirmLanguage(preferenceStorage, value));
    } catch {
      setFailure(messages(value).storageError);
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  }
  async function signOut() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy("logout");
    setFailure(null);
    try {
      await client.cancelQueries();
      await logout();
      client.clear();
      router.dismissAll();
      router.replace("/language");
    } catch (error) {
      setFailure(errorMessage(error, language));
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  }
  if (!session) {
    const villageName = guestVillage
      ? language === "mr"
        ? guestVillage.nameMr
        : guestVillage.name
      : "";
    return (
      <DashboardScreen>
        <PageSceneHeader
          title={t.settings}
          subtitle={t.guestBrowsing}
          backLabel={t.back}
          onBack={() => router.replace("/home")}
        />
        <View style={s.section}>
          <Text accessibilityRole="header" style={s.sectionLabel}>
            {t.accountSettings}
          </Text>
          <View style={s.group}>
            <SettingRow
              icon="location-outline"
              title={t.changeVillage}
              subtitle={villageName}
              disabled={!!busy}
              onPress={() => router.push("/language")}
            />
            <View style={[s.row, s.last, s.languageStack]}>
              <View style={s.languageLabel}>
                <SettingsIcon name="globe-outline" />
                <Text style={s.rowTitle}>{t.changeLanguage}</Text>
              </View>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel={t.changeLanguage}
                style={s.languages}
              >
                {(["mr", "en"] as const).map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: language === value,
                      disabled: !!busy,
                    }}
                    disabled={!!busy}
                    onPress={() => void selectLanguage(value)}
                    style={({ pressed }) => [
                      s.languageButton,
                      pressed && s.pressed,
                      !!busy && s.disabled,
                    ]}
                  >
                    <View
                      accessible={false}
                      style={[s.radio, language === value && s.radioSelected]}
                    >
                      {language === value && <View style={s.radioDot} />}
                    </View>
                    <Text style={s.languageText}>
                      {value === "mr" ? "मराठी" : "English"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
        {failure && <ErrorMessage message={failure} />}
        <Button
          disabled={!!busy}
          onPress={() => {
            useAppStore.getState().setAuthMode("register");
            router.push("/register");
          }}
        >
          {t.registrationTitle}
        </Button>
        <Button
          secondary
          disabled={!!busy}
          onPress={() => {
            useAppStore.getState().setAuthMode("login");
            router.push("/register");
          }}
        >
          {t.loginTitle}
        </Button>
      </DashboardScreen>
    );
  }
  const village = session.user.village;
  const villageName = village
    ? language === "mr"
      ? village.nameMr
      : village.name
    : "";
  const unavailable = (message: string) =>
    Alert.alert(t.settingsUnavailable, message);
  return (
    <DashboardScreen>
      <PageSceneHeader
        title={t.settings}
        subtitle={t.settingsSubtitle}
        backLabel={t.back}
        onBack={() => router.replace("/home")}
      />
      <View style={s.section}>
        <Text accessibilityRole="header" style={s.sectionLabel}>
          {t.accountSettings}
        </Text>
        <View style={s.group}>
          <SettingRow
            icon="person-outline"
            title={t.updateProfile}
            disabled={!!busy}
            onPress={() => router.push("/my-profile")}
          />
          <SettingRow
            icon="location-outline"
            title={t.changeVillage}
            subtitle={villageName}
            disabled={!!busy}
            onPress={() => router.push("/village")}
          />
          <View style={[s.row, s.last, s.languageStack]}>
            <View style={s.languageLabel}>
              <SettingsIcon name="globe-outline" />
              <Text style={s.rowTitle}>{t.changeLanguage}</Text>
            </View>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={t.changeLanguage}
              style={s.languages}
            >
              {(["mr", "en"] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: language === value,
                    disabled: !!busy,
                  }}
                  disabled={!!busy}
                  onPress={() => void selectLanguage(value)}
                  style={({ pressed }) => [
                    s.languageButton,
                    pressed && s.pressed,
                    !!busy && s.disabled,
                  ]}
                >
                  <View
                    accessible={false}
                    style={[s.radio, language === value && s.radioSelected]}
                  >
                    {language === value && <View style={s.radioDot} />}
                  </View>
                  <Text style={s.languageText}>
                    {value === "mr" ? "मराठी" : "English"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>
      <View style={s.section}>
        <Text accessibilityRole="header" style={s.sectionLabel}>
          {t.notificationSettings}
        </Text>
        <View style={s.group}>
          <View style={s.row}>
            <SettingsIcon name="notifications-outline" />
            <View style={s.rowInfo}>
              <Text style={s.rowTitle}>{t.newCropNotifications}</Text>
              <Text style={s.subtitle}>{t.notificationsPending}</Text>
            </View>
            <Switch
              accessibilityLabel={`${t.newCropNotifications}. ${t.notificationsPending}`}
              value={false}
              disabled
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>
          <SettingRow
            icon="star-outline"
            last
            title={t.favouriteSellersCrops}
            subtitle={t.settingsUnavailable}
            disabled={!!busy}
            onPress={() => unavailable(t.favouritesPending)}
          />
        </View>
      </View>
      {failure && <ErrorMessage message={failure} />}
      <Button
        secondary
        loading={busy === "logout"}
        disabled={offline || busy === "language"}
        onPress={() => void signOut()}
      >
        {t.logout}
      </Button>
    </DashboardScreen>
  );
}

type SettingsIconName = React.ComponentProps<typeof Ionicons>["name"];
function SettingsIcon({ name }: { name: SettingsIconName }) {
  return (
    <View style={s.icon}>
      <Ionicons name={name} size={22} color={theme.colors.icon} />
    </View>
  );
}
function SettingRow({
  icon,
  title,
  subtitle,
  disabled,
  onPress,
  last = false,
}: {
  icon: SettingsIconName;
  title: string;
  subtitle?: string;
  disabled: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        last && s.last,
        disabled && s.disabled,
        pressed && s.pressed,
      ]}
    >
      <SettingsIcon name={icon} />
      <View style={s.rowInfo}>
        <Text style={s.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>
      <Ionicons
        accessible={false}
        name="chevron-forward"
        size={18}
        color={theme.colors.muted}
      />
    </Pressable>
  );
}
const s = StyleSheet.create({
  group: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.card,
    overflow: "hidden",
  },
  section: { gap: 10 },
  sectionLabel: {
    color: theme.colors.muted,
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  last: { borderBottomWidth: 0 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: { flex: 1, gap: 3 },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.heading,
    flexShrink: 1,
  },
  subtitle: { fontSize: 13, lineHeight: 19, color: theme.colors.muted },
  languageLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  languageStack: { flexDirection: "column", alignItems: "stretch" },
  languages: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  languageButton: {
    minHeight: theme.layout.touchTarget,
    flexGrow: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: theme.radii.control,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: theme.colors.primary },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  languageText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.heading,
  },
  pressed: { opacity: theme.interaction.pressedOpacity },
  disabled: { opacity: theme.interaction.disabledOpacity },
});
