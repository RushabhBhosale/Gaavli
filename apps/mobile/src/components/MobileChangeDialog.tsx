import { useEffect, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MobileProfile, OtpChallenge } from "@gaavli/types";
import {
  indianMobileSchema,
  mobileProfileSchema,
  otpChallengeSchema,
} from "@gaavli/validation";
import { authenticatedApi } from "../session";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { errorMessage } from "../errors";
import { limitIndianMobileInput } from "../data/mobileInput";
import { theme } from "../theme";
import { Button, ErrorMessage, Input, styles } from "./ui";

export function MobileChangeDialog({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: (profile: MobileProfile) => void;
}) {
  const { language, offline, session } = useAppStore();
  const t = messages(language);
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const submitting = useRef(false);
  const mounted = useRef(true);
  const accountId = session?.user.id;
  const isCurrent = () =>
    mounted.current && useAppStore.getState().session?.user.id === accountId;
  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, []);
  const seconds = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - now) / 1000))
    : 0;
  async function send() {
    if (submitting.current || offline) return;
    const parsed = indianMobileSchema.safeParse(mobile);
    if (!parsed.success) {
      setFailure(t.mobileError);
      return;
    }
    submitting.current = true;
    setBusy(true);
    setFailure("");
    try {
      const result = await authenticatedApi(
        "/users/me/mobile/send-otp",
        otpChallengeSchema,
        {
          method: "POST",
          body: JSON.stringify({ mobile: parsed.data }),
        },
      );
      if (isCurrent()) {
        setChallenge(result);
        setCode("");
        setNow(Date.now());
      }
    } catch (error) {
      if (isCurrent()) setFailure(errorMessage(error, language));
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function verify() {
    if (submitting.current || offline || !challenge) return;
    if (!/^\d{6}$/.test(code)) {
      setFailure(t.otpError);
      return;
    }
    submitting.current = true;
    setBusy(true);
    setFailure("");
    try {
      const profile = await authenticatedApi(
        "/users/me/mobile/verify-otp",
        mobileProfileSchema,
        {
          method: "POST",
          body: JSON.stringify({ challengeId: challenge.challengeId, code }),
        },
      );
      if (isCurrent()) onChanged(profile);
    } catch (error) {
      // A lost success response must not make the user consume the same OTP again.
      try {
        const profile = await authenticatedApi(
          "/users/me/profile",
          mobileProfileSchema,
        );
        if (
          isCurrent() &&
          indianMobileSchema.safeParse(profile.mobile).data ===
            indianMobileSchema.parse(mobile)
        ) {
          onChanged(profile);
          return;
        }
      } catch {
        /* Keep the original verification error and allow retry. */
      }
      if (isCurrent()) setFailure(errorMessage(error, language));
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Modal
      transparent
      animationType="slide"
      visible
      onRequestClose={() => {
        if (!submitting.current) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView
          edges={["bottom"]}
          style={s.sheet}
          accessibilityViewIsModal
        >
          <ScrollView
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title} accessibilityRole="header">
              {t.changePrimaryMobile}
            </Text>
            <Text style={styles.body}>{t.mobileChangeHelp}</Text>
            <Input
              label={t.newMobile}
              value={mobile}
              onChangeText={(value) => setMobile(limitIndianMobileInput(value))}
              keyboardType="phone-pad"
              maxLength={14}
              editable={!busy && !challenge}
            />
            {challenge && (
              <Input
                label={t.otpLabel}
                value={code}
                onChangeText={(value) =>
                  setCode(value.replace(/\D/g, "").slice(0, 6))
                }
                keyboardType="number-pad"
                autoComplete="sms-otp"
                maxLength={6}
                editable={!busy}
              />
            )}
            {!!failure && <ErrorMessage message={failure} />}
            {challenge ? (
              <>
                <Button
                  loading={busy}
                  disabled={offline}
                  onPress={() => void verify()}
                >
                  {t.verify}
                </Button>
                <Button
                  secondary
                  disabled={busy || offline || seconds > 0}
                  onPress={() => void send()}
                >
                  {seconds > 0
                    ? `${t.resendIn} ${seconds} ${t.seconds}`
                    : t.resend}
                </Button>
              </>
            ) : (
              <Button
                loading={busy}
                disabled={offline}
                onPress={() => void send()}
              >
                {t.sendOtp}
              </Button>
            )}
            <Button secondary disabled={busy} onPress={onClose}>
              {t.cancel}
            </Button>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.sheet,
    borderTopRightRadius: theme.radii.sheet,
    maxHeight: "90%",
  },
  content: { padding: theme.layout.screenPadding, gap: theme.spacing },
});
