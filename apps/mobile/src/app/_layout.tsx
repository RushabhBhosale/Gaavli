import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { Toast } from "../components/Toast";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "../providers";
import { useAppStore } from "../store";
import { preferenceStorage } from "../storage/sqlite";
import { restorePreferences } from "../storage/preferences";
import { restoreBrowsingVillage } from "../storage/browsingVillage";
import { messages } from "../i18n";
import { Screen, Brand, Button, ErrorMessage } from "../components/ui";
import { theme } from "../theme";
import { restoreSession } from "../session";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
function Startup() {
  const hydrated = useAppStore((state) => state.hydrated);
  const language = useAppStore((state) => state.language);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.all([
      restorePreferences(preferenceStorage),
      restoreBrowsingVillage(preferenceStorage),
    ])
      .then(async ([preferences, browsingVillage]) => {
        await restoreSession();
        if (active) {
          useAppStore.getState().setBrowsingVillage(browsingVillage);
          useAppStore
            .getState()
            .setAuthMode(preferences.confirmed ? "login" : "register");
          useAppStore.getState().restore(preferences);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  useEffect(() => {
    if (hydrated || failed)
      void SplashScreen.hideAsync().catch(() => undefined);
  }, [hydrated, failed]);
  if (!hydrated)
    return (
      <Screen>
        <Brand />
        {failed && (
          <>
            <ErrorMessage message={messages(language).restoreError} />
            <Button
              onPress={() => {
                setFailed(false);
                setAttempt((value) => value + 1);
              }}
            >
              {messages(language).retry}
            </Button>
          </>
        )}
      </Screen>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Startup />
      <Toast />
    </AppProviders>
  );
}
