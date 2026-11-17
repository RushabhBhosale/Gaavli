import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { requireOptionalNativeModule } from "expo";
import type { ExpoSpeechRecognitionModuleType } from "expo-speech-recognition/build/ExpoSpeechRecognitionModule.types";
import type { MobileLanguage } from "@gaavli/types";
import { speechLocale } from "../locale";
import {
  recognizeWithDialog,
  speechDialogAvailable,
} from "../../modules/gaavli-speech-dialog";
import {
  VoiceSearchSession,
  type SpeechDriver,
  type VoiceFailure,
  type VoiceStatus,
} from "../data/voiceSearch";

let nativeShutdown = Promise.resolve();
function speechDriver(): SpeechDriver | null {
  if (Platform.OS === "web") return null;
  const native = requireOptionalNativeModule<ExpoSpeechRecognitionModuleType>(
    "ExpoSpeechRecognition",
  );
  if (!native) return null;
  return {
    ready: () => nativeShutdown,
    available: () => native.isRecognitionAvailable(),
    requestPermissions: async () => {
      const permission = await native.getPermissionsAsync();
      return permission.granted ? permission : native.requestPermissionsAsync();
    },
    subscribe: (handlers) => {
      const subscriptions = [
        native.addListener("result", (event) =>
          handlers.result(event.results[0]?.transcript || "", event.isFinal),
        ),
        native.addListener("error", (event) => handlers.error(event.error)),
        native.addListener("end", handlers.end),
        native.addListener("nomatch", handlers.nomatch),
      ];
      return () =>
        subscriptions.forEach((subscription) => subscription.remove());
    },
    start: (lang, contextualStrings) =>
      native.start({
        lang,
        contextualStrings,
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
        iosTaskHint: "search",
        androidIntentOptions: { EXTRA_LANGUAGE_MODEL: "web_search" },
        recordingOptions: { persist: false },
      }),
    stop: () => native.stop(),
    abort: () => {
      nativeShutdown = new Promise<void>((resolve) => {
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          subscription.remove();
          resolve();
        };
        const subscription = native.addListener("end", finish);
        const timer = setTimeout(finish, 1000);
        try {
          native.abort();
        } catch {
          finish();
        }
      });
      return nativeShutdown;
    },
  };
}

export function useVoiceSearch({
  language,
  scope,
  onResult,
  hints,
  alwaysOn = false,
}: {
  language: MobileLanguage;
  scope: string;
  onResult: (text: string) => void;
  hints: string[];
  // For controls outside any screen (the bottom-bar mic), which never get
  // screen focus events: keep a session for as long as the control is shown.
  alwaysOn?: boolean;
}) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<VoiceFailure | null>(null);
  const callback = useRef(onResult);
  useEffect(() => {
    callback.current = onResult;
  }, [onResult]);
  const controller = useRef<VoiceSearchSession | null>(null);
  const dialogOpen = useRef(false);
  useEffect(() => {
    controller.current?.cancel();
  }, [language, scope]);
  const setup = useCallback(() => {
    let active = true;
    const session = new VoiceSearchSession(speechDriver(), {
      status: (value) => {
        if (active) setStatus(value);
      },
      error: (value) => {
        if (active) setError(value);
      },
      result: (text) => {
        if (active) callback.current(text);
      },
    });
    controller.current = session;
    session.setForeground(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") session.setForeground(true);
      else if (state === "background") session.setForeground(false);
    });
    return () => {
      active = false;
      session.cancel();
      controller.current = null;
      subscription.remove();
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (alwaysOn) return;
      // A screen coming back into view starts from a clean state.
      setStatus("idle");
      setError(null);
      return setup();
    }, [alwaysOn, setup]),
  );
  useEffect(() => (alwaysOn ? setup() : undefined), [alwaysOn, setup]);
  return {
    status,
    error,
    cancel: () => controller.current?.cancel(),
    finish: () => controller.current?.finish(),
    start: () => {
      setError(null);
      // Android: the phone's own "Speak now" dialog. If it is missing (an
      // older build, or no speech app), the in-app recognizer is used.
      if (speechDialogAvailable) {
        if (dialogOpen.current) return;
        dialogOpen.current = true;
        void recognizeWithDialog(speechLocale(language))
          .then((result) => {
            if (result.status === "ok") callback.current(result.text);
            else if (result.status === "unavailable")
              void controller.current?.start(language, hints);
          })
          .catch(() => setError("failed"))
          .finally(() => {
            dialogOpen.current = false;
          });
        return;
      }
      void controller.current?.start(language, hints);
    },
    clearError: () => setError(null),
  };
}
