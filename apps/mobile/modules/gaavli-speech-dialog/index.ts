import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";

type DialogResult =
  { status: "ok"; text: string } | { status: "cancelled" | "unavailable" };
type Native = {
  recognize: (language: string, prompt: string | null) => Promise<DialogResult>;
};

// The phone's own voice dialog (Android only). Null elsewhere, and in builds
// made before this module existed, so callers can fall back.
const native =
  Platform.OS === "android"
    ? requireOptionalNativeModule<Native>("GaavliSpeechDialog")
    : null;

export const speechDialogAvailable = !!native;
export function recognizeWithDialog(
  language: string,
  prompt?: string,
): Promise<DialogResult> {
  if (!native) return Promise.resolve({ status: "unavailable" });
  return native.recognize(language, prompt ?? null);
}
