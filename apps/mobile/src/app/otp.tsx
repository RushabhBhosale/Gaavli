import { useEffect, useRef, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { Text } from "react-native";
import type { MobileSession } from "@gaavli/types";
import {
  mobileSessionSchema,
  otpChallengeSchema,
  mobileUserSchema,
} from "@gaavli/validation";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import {
  BackButton,
  Button,
  Input,
  ErrorMessage,
  Screen,
  styles,
} from "../components/ui";
import { api } from "../api";
import { errorMessage } from "../errors";
import { ApiError } from "../api/client";
import { saveSession, authenticatedApi } from "../session";
import { postAuthHref } from "../storage/preferences";
import { parseOtpRequest } from "../data/otpRequest";

export default function OtpScreen() {
  const router = useRouter();
  const {
    language,
    session,
    challenge,
    draft,
    offline,
    contactReturnListingId,
    authMode,
  } = useAppStore();
  const t = messages(language);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"verify" | "resend" | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hasPendingSession, setHasPendingSession] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const pendingSession = useRef<MobileSession | null>(null);
  const submitting = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  // Publishing the verified session must not navigate before the guest village
  // has been confirmed and the final product return destination is resolved.
  if (session && (busy !== "verify" || !challenge))
    return (
      <Redirect
        href={postAuthHref(
          session.user,
          contactReturnListingId,
          authMode === "login",
        )}
      />
    );
  if (!challenge) return <Redirect href="/register" />;
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(challenge.resendAt) - now) / 1000),
  );
  async function verify() {
    if (submitting.current || !challenge) return;
    if (!/^\d{6}$/.test(code)) {
      setError(t.otpError);
      return;
    }
    submitting.current = true;
    setBusy("verify");
    setError("");
    try {
      // Retry local secure-storage failures without consuming the OTP twice.
      pendingSession.current ??= await api(
        "/auth/verify-otp",
        mobileSessionSchema,
        {
          method: "POST",
          body: JSON.stringify({ challengeId: challenge.challengeId, code }),
        },
      );
      setHasPendingSession(true);
      await saveSession(pendingSession.current);
      let user = pendingSession.current.user;
      const browsingVillage = useAppStore.getState().browsingVillage;
      if (!user.village && browsingVillage && user.firstName && user.lastName) {
        try {
          user = await authenticatedApi("/users/me", mobileUserSchema, {
            method: "PATCH",
            body: JSON.stringify({ villageId: browsingVillage.id }),
          });
          const current = useAppStore.getState().session;
          if (current?.user.id === user.id)
            await saveSession({ ...current, user });
        } catch {
          /* Village selection remains available when the saved village cannot be confirmed. */
        }
      }
      const listingId = useAppStore.getState().contactReturnListingId;
      pendingSession.current = null;
      useAppStore.getState().clearRegistration();
      router.replace(postAuthHref(user, listingId, authMode === "login"));
    } catch (failure) {
      setNeedsRegistration(
        failure instanceof ApiError && failure.code === "REGISTRATION_REQUIRED",
      );
      setError(
        pendingSession.current
          ? t.sessionSaveError
          : errorMessage(failure, language),
      );
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  }
  async function resend() {
    if (submitting.current || seconds > 0) return;
    submitting.current = true;
    setBusy("resend");
    setError("");
    try {
      const input = parseOtpRequest(
        useAppStore.getState().authMode,
        draft,
        language,
      );
      if (!input.success) {
        setError(t.genericError);
        return;
      }
      const next = await api("/auth/send-otp", otpChallengeSchema, {
        method: "POST",
        body: JSON.stringify(input.data),
      });
      useAppStore.getState().setChallenge(next);
      setCode("");
      setNow(Date.now());
    } catch (failure) {
      setError(errorMessage(failure, language));
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  }
  return (
    <Screen>
      <BackButton
        label={t.back}
        disabled={!!busy || hasPendingSession}
        onPress={() => router.replace("/register")}
      />
      <Text style={styles.title}>{t.verifyTitle}</Text>
      <Text style={styles.body}>
        {t.verifyDescription}
        {"\n"}+91 {draft.mobile}
      </Text>
      <Input
        label={t.otpLabel}
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={6}
        editable={!busy && !hasPendingSession}
        style={{ fontSize: 28, letterSpacing: 10, textAlign: "center" }}
      />
      {!!error && <ErrorMessage message={error} />}
      {needsRegistration && (
        <Button
          secondary
          disabled={!!busy}
          onPress={() => {
            useAppStore.getState().setAuthMode("register");
            router.replace("/register");
          }}
        >
          {t.switchToRegister}
        </Button>
      )}
      <Button
        loading={busy === "verify"}
        disabled={!!busy || (offline && !hasPendingSession)}
        onPress={() => void verify()}
      >
        {t.verify}
      </Button>
      <Text accessibilityLiveRegion="polite" style={styles.body}>
        {seconds > 0 ? `${t.resendIn} ${seconds} ${t.seconds}` : t.resend}
      </Text>
      <Button
        secondary
        loading={busy === "resend"}
        disabled={!!busy || offline || seconds > 0 || hasPendingSession}
        onPress={() => void resend()}
      >
        {t.resend}
      </Button>
    </Screen>
  );
}
