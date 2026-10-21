import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { requireOptionalNativeModule } from "expo";
import type { ExpoSpeechRecognitionModuleType } from "expo-speech-recognition/build/ExpoSpeechRecognitionModule.types";
import type { MobileLanguage } from "@gaavli/types";
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
    requestPermissions: () => native.requestPermissionsAsync(),
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
}: {
  language: MobileLanguage;
  scope: string;
  onResult: (text: string) => void;
  hints: string[];
}) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<VoiceFailure | null>(null);
  const callback = useRef(onResult);
  useEffect(() => {
    callback.current = onResult;
  }, [onResult]);
  const controller = useRef<VoiceSearchSession | null>(null);
  useEffect(() => {
    controller.current?.cancel();
  }, [language, scope]);
  useFocusEffect(
    useCallback(() => {
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
      setStatus("idle");
      setError(null);
      const subscription = AppState.addEventListener("change", (state) => {
        // "inactive" may be the permission prompt on iOS; background always cancels.
        if (state === "background") session.cancel();
      });
      return () => {
        active = false;
        session.cancel();
        controller.current = null;
        subscription.remove();
      };
    }, []),
  );
  return {
    status,
    error,
    cancel: () => controller.current?.cancel(),
    start: () => {
      setError(null);
      void controller.current?.start(language, hints);
    },
    clearError: () => setError(null),
  };
}
