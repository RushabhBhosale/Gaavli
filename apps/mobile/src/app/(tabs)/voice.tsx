import { Redirect } from "expo-router";

// The bottom-bar mic lives on this tab's button and never opens it; a stray
// visit (deep link, back history) goes to the Marketplace instead.
export default function VoiceTab() {
  return <Redirect href="/marketplace" />;
}
