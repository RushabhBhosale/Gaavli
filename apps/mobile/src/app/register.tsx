import { useState, useRef } from "react";
import { Redirect, useRouter } from "expo-router";
import { Text } from "react-native";
import {
  registrationSchema,
  loginSchema,
  otpChallengeSchema,
} from "@gaavli/validation";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import {
  Brand,
  BackButton,
  Button,
  Input,
  ErrorMessage,
  Screen,
  styles,
} from "../components/ui";
import { api } from "../api";
import { errorMessage } from "../errors";

export default function RegistrationScreen() {
  const router = useRouter();
  const { language, confirmed, session, draft, offline, authMode } =
    useAppStore();
  const registering = authMode === "register";
  const t = messages(language);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  if (session)
    return <Redirect href={session.user.village ? "/home" : "/village"} />;
  if (!confirmed) return <Redirect href="/language" />;
  function change(key: keyof typeof draft, value: string) {
    useAppStore.getState().setDraft({ ...draft, [key]: value });
    setErrors((previous) => ({ ...previous, [key]: "" }));
    setFailure(null);
  }
  async function send() {
    if (submitting.current) return;
    const parsed = registering
      ? registrationSchema.safeParse({ ...draft, language })
      : loginSchema.safeParse({ mobile: draft.mobile, language });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message === "FULL_NAME_TOO_LONG"
              ? t.fullNameError
              : issue.path[0] === "mobile"
                ? t.mobileError
                : t.nameError,
          ]),
        ),
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const challenge = await api("/auth/send-otp", otpChallengeSchema, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      useAppStore.getState().setDraft({
        firstName:
          "firstName" in parsed.data &&
          typeof parsed.data.firstName === "string"
            ? parsed.data.firstName
            : "",
        lastName:
          "lastName" in parsed.data && typeof parsed.data.lastName === "string"
            ? parsed.data.lastName
            : "",
        mobile: parsed.data.mobile,
      });
      useAppStore.getState().setChallenge(challenge);
      router.push("/otp");
    } catch (error) {
      setFailure(error);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen>
      <BackButton
        label={t.back}
        disabled={busy}
        onPress={() => router.replace("/language")}
      />
      <Brand compact />
      <Text style={styles.title}>
        {registering ? t.registrationTitle : t.loginTitle}
      </Text>
      <Text style={styles.body}>
        {registering ? t.registrationDescription : t.loginDescription}
      </Text>
      {registering && (
        <>
          <Input
            label={t.firstName}
            value={draft.firstName}
            onChangeText={(value) => change("firstName", value)}
            error={errors.firstName}
            autoComplete="given-name"
            maxLength={60}
            editable={!busy}
          />
          <Input
            label={t.lastName}
            value={draft.lastName}
            onChangeText={(value) => change("lastName", value)}
            error={errors.lastName}
            autoComplete="family-name"
            maxLength={60}
            editable={!busy}
          />
        </>
      )}
      <Input
        label={t.mobile}
        value={draft.mobile}
        onChangeText={(value) => change("mobile", value)}
        error={errors.mobile}
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={24}
        editable={!busy}
      />
      {!!failure && <ErrorMessage message={errorMessage(failure, language)} />}
      {offline && <Text style={styles.body}>{t.offlineAction}</Text>}
      <Button loading={busy} disabled={offline} onPress={() => void send()}>
        {failure ? t.retry : t.sendOtp}
      </Button>
      <Button
        secondary
        disabled={busy}
        onPress={() => {
          useAppStore
            .getState()
            .setAuthMode(registering ? "login" : "register");
          setErrors({});
          setFailure(null);
        }}
      >
        {registering ? t.switchToLogin : t.switchToRegister}
      </Button>
      <Text style={styles.body}>{t.privacy}</Text>
    </Screen>
  );
}
