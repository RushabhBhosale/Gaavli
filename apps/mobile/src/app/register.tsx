import { useState, useRef } from "react";
import { Redirect, useRouter } from "expo-router";
import { Text } from "react-native";
import { otpChallengeSchema } from "@gaavli/validation";
import { limitIndianMobileInput } from "../data/mobileInput";
import { parseOtpRequest } from "../data/otpRequest";
import { postAuthHref } from "../storage/preferences";
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
  const {
    language,
    confirmed,
    session,
    draft,
    offline,
    authMode,
    contactReturnListingId,
    guestVillage,
  } = useAppStore();
  const registering = authMode === "register";
  const t = messages(language);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  if (session)
    return (
      <Redirect href={postAuthHref(session.user, contactReturnListingId)} />
    );
  if (!confirmed) return <Redirect href="/language" />;
  function change(key: keyof typeof draft, value: string) {
    useAppStore.getState().setDraft({ ...draft, [key]: value });
    setErrors((previous) => ({ ...previous, [key]: "" }));
    setFailure(null);
  }
  async function send() {
    if (submitting.current) return;
    const parsed = parseOtpRequest(
      registering ? "register" : "login",
      draft,
      language,
    );
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
    const body = parsed.data;
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const challenge = await api("/auth/send-otp", otpChallengeSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
      useAppStore.getState().setDraft({
        firstName:
          "firstName" in body && typeof body.firstName === "string"
            ? body.firstName
            : draft.firstName,
        lastName:
          "lastName" in body && typeof body.lastName === "string"
            ? body.lastName
            : draft.lastName,
        mobile: body.mobile,
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
        onPress={() =>
          router.replace(guestVillage ? "/home" : "/language")
        }
      />
      <Brand compact />
      <Text style={styles.title}>
        {registering ? t.registrationTitle : t.loginTitle}
      </Text>
      <Text style={styles.body}>
        {contactReturnListingId
          ? t.contactSellerReason
          : registering
            ? t.registrationDescription
            : t.loginDescription}
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
        onChangeText={(value) => change("mobile", limitIndianMobileInput(value))}
        error={errors.mobile}
        keyboardType="number-pad"
        autoComplete="tel"
        maxLength={10}
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
