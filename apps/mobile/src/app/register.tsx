import { useState, useRef } from "react";
import { Redirect, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MOBILE_LANGUAGES } from "@gaavli/constants";
import { preferenceStorage } from "../storage/sqlite";
import { ContactNumbersField } from "../components/ContactNumbersField";
import { VillageField } from "../components/VillageField";
import { activeContacts, contactErrors } from "../data/contactNumbers";
import { splitFullName } from "../data/finishRegistration";
import { theme } from "../theme";
import { otpChallengeSchema } from "@gaavli/validation";
import { limitIndianMobileInput } from "../data/mobileInput";
import { parseOtpRequest } from "../data/otpRequest";
import { confirmLanguage, postAuthHref } from "../storage/preferences";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import {
  Brand,
  BackButton,
  Button,
  Chip,
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
    hasAuthenticated,
    session,
    draft,
    offline,
    authMode,
    contactReturnListingId,
    browsingVillage,
    registration,
  } = useAppStore();
  const registering = authMode === "register";
  const t = messages(language);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [showErrors, setShowErrors] = useState(false);
  const set = useAppStore.getState().setRegistration;
  if (session)
    return (
      <Redirect
        href={postAuthHref(
          session.user,
          contactReturnListingId,
          authMode === "login",
        )}
      />
    );
  if (!confirmed && !hasAuthenticated) return <Redirect href="/language" />;
  function change(key: keyof typeof draft, value: string) {
    useAppStore.getState().setDraft({ ...draft, [key]: value });
    setErrors((previous) => ({ ...previous, [key]: "" }));
    setFailure(null);
  }
  function setPrimary(contacts: typeof registration.contacts) {
    set({ contacts });
    useAppStore.getState().setDraft({
      ...useAppStore.getState().draft,
      mobile: limitIndianMobileInput(contacts[0]?.mobile ?? ""),
    });
    setErrors((previous) => ({ ...previous, mobile: "" }));
    setFailure(null);
  }
  function changeName(value: string) {
    set({ fullName: value });
    const parts = splitFullName(value);
    useAppStore.getState().setDraft({
      ...useAppStore.getState().draft,
      firstName: parts?.firstName ?? value.trim(),
      lastName: parts?.lastName ?? "",
    });
    setErrors((previous) => ({ ...previous, firstName: "", lastName: "" }));
  }
  async function chooseLanguage(value: (typeof MOBILE_LANGUAGES)[number]) {
    try {
      useAppStore
        .getState()
        .restore(await confirmLanguage(preferenceStorage, value));
    } catch {
      useAppStore.getState().setLanguage(value);
    }
  }
  async function send(intent?: boolean) {
    if (submitting.current) return;
    if (registering) {
      setShowErrors(true);
      const next: Record<string, string> = {};
      if (!splitFullName(registration.fullName))
        next.firstName = t.regFullNameError;
      if (
        Object.keys(contactErrors(activeContacts(registration.contacts))).length
      )
        next.mobile = t.mobileError;
      if (!registration.village) next.village = t.regVillageRequired;
      if (
        registration.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(registration.email.trim())
      )
        next.email = t.regEmailError;
      if (Object.keys(next).length) {
        setErrors(next);
        return;
      }
      if (intent !== undefined) set({ providerIntent: intent });
    }
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
        onPress={() => router.replace(browsingVillage ? "/home" : "/language")}
      />
      <Brand compact />
      <Text style={styles.title}>
        {registering ? t.regCreateTitle : t.loginTitle}
      </Text>
      <Text style={styles.body}>
        {contactReturnListingId
          ? t.contactSellerReason
          : registering
            ? t.registrationDescription
            : t.loginDescription}
      </Text>
      {registering ? (
        <>
          <Input
            label={`${t.regFullName} *`}
            value={registration.fullName}
            onChangeText={changeName}
            error={errors.firstName}
            placeholder={t.regFullNamePlaceholder}
            autoComplete="name"
            maxLength={110}
            editable={!busy}
          />
          <Text style={st.section}>{t.regBasicDetails}</Text>
          <ContactNumbersField
            contacts={registration.contacts}
            onChange={setPrimary}
            showErrors={showErrors}
            disabled={busy}
            showOrderNote
          />
          {!!errors.mobile && <ErrorMessage message={errors.mobile} />}
          <VillageField
            label={`${t.regVillage} *`}
            value={registration.village}
            onChange={(village) => {
              set({ village });
              setErrors((previous) => ({ ...previous, village: "" }));
            }}
            error={errors.village}
            disabled={busy}
          />
          <View style={st.languages} accessibilityRole="radiogroup">
            <Text style={st.label}>{`${t.regLanguage} *`}</Text>
            <View style={st.chips}>
              {MOBILE_LANGUAGES.map((value) => (
                <Chip
                  key={value}
                  label={{ mr: "मराठी", en: "English", hi: "हिन्दी" }[value]}
                  selected={language === value}
                  onPress={() => void chooseLanguage(value)}
                />
              ))}
            </View>
          </View>
          <Input
            label={t.regEmail}
            value={registration.email}
            onChangeText={(value) => {
              set({ email: value });
              setErrors((previous) => ({ ...previous, email: "" }));
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            maxLength={120}
            editable={!busy}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: registration.promoWhatsapp }}
            onPress={() => set({ promoWhatsapp: !registration.promoWhatsapp })}
            style={st.check}
          >
            <View style={[st.box, registration.promoWhatsapp && st.boxOn]}>
              {registration.promoWhatsapp && <Text style={st.tick}>✓</Text>}
            </View>
            <Text style={st.checkText}>{t.regPromo}</Text>
          </Pressable>
          <View style={st.provider}>
            <Text style={st.providerTitle}>{t.regProviderTitle}</Text>
            <Text style={st.providerText}>{t.regProviderText}</Text>
          </View>
          <Button
            outlined
            disabled={busy}
            onPress={() =>
              set({ providerIntent: !registration.providerIntent })
            }
          >
            {registration.providerIntent
              ? t.regProviderAdded
              : t.regAddProvider}
          </Button>
        </>
      ) : (
        <Input
          label={t.mobile}
          value={draft.mobile}
          onChangeText={(value) =>
            change("mobile", limitIndianMobileInput(value))
          }
          error={errors.mobile}
          keyboardType="number-pad"
          autoComplete="tel"
          maxLength={10}
          editable={!busy}
        />
      )}
      {!!failure && <ErrorMessage message={errorMessage(failure, language)} />}
      {offline && <Text style={styles.body}>{t.offlineAction}</Text>}
      <Button loading={busy} disabled={offline} onPress={() => void send()}>
        {failure ? t.retry : registering ? t.regContinueOtp : t.continue}
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
      <Text style={styles.body}>{registering ? t.regTerms : t.privacy}</Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  section: {
    ...theme.type.micro,
    color: theme.colors.muted,
    letterSpacing: 0.6,
  },
  label: { ...theme.type.label, color: theme.colors.text },
  languages: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  check: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    minHeight: 44,
  },
  box: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  boxOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tick: { color: theme.colors.onPrimary, fontWeight: "700" },
  checkText: { ...theme.type.body, color: theme.colors.text, flex: 1 },
  provider: {
    gap: 4,
    padding: 14,
    borderRadius: theme.radii.card,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
  },
  providerTitle: { ...theme.type.micro, color: theme.colors.muted },
  providerText: { ...theme.type.body, color: theme.colors.text },
});
