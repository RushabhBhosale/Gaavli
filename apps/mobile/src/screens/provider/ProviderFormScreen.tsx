import { useEffect, useRef, useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  PRACTICE_MODES,
  PROVIDER_KINDS,
  ProviderType,
  isDoctorType,
} from "@gaavli/constants";
import type { MobileVillage } from "@gaavli/types";
import { useAppStore } from "../../store";
import { messages } from "../../i18n";
import { theme } from "../../theme";
import { ApiError } from "../../api/client";
import { errorMessage } from "../../errors";
import {
  checkDuplicates,
  claimProfile,
  createProfile,
  refreshProfiles,
  searchProfiles,
  useAccountContacts,
} from "../../providerProfiles";
import {
  activeContacts,
  contactErrors,
  contactsPayload,
  draftsFromServer,
  type ContactDraft,
} from "../../data/contactNumbers";
import { useQueryClient } from "@tanstack/react-query";
import { ContactNumbersField } from "../../components/ContactNumbersField";
import { VillageField } from "../../components/VillageField";
import {
  ProviderFields,
  emptyDetails,
  type Details,
} from "../../components/provider/ProviderFields";
import {
  BackButton,
  Button,
  Card,
  ErrorMessage,
  Input,
  Screen,
  styles,
} from "../../components/ui";

type Step = "details" | "duplicates" | "category";
type Match = Awaited<ReturnType<typeof checkDuplicates>>["matches"][number];
type Practice = { mode: string; facilityId?: string; facilityName?: string };

// Provider registration: common details, a duplicate check, then the form for
// the chosen category. Doctors also say where they practise.
export default function ProviderFormScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const params = useLocalSearchParams<{ type?: string }>();
  const type = Object.values(ProviderType).find(
    (value) => value === params.type,
  );
  const session = useAppStore((state) => state.session);
  const language = useAppStore((state) => state.language);
  const offline = useAppStore((state) => state.offline);
  const t = messages(language);
  const account = useAccountContacts();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [pickedVillage, setVillage] = useState<MobileVillage | null>(null);
  const village = pickedVillage ?? session?.user.village ?? null;
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [edited, setContacts] = useState<ContactDraft[] | null>(null);
  // The account's verified primary number leads the list.
  const contacts =
    edited ?? (account.data ? draftsFromServer(account.data.contacts) : null);
  const [details, setDetails] = useState<Details>(() =>
    type ? emptyDetails(type) : {},
  );
  const [practice, setPractice] = useState<Practice>({ mode: "own_clinic" });
  const [matches, setMatches] = useState<Match[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const submitting = useRef(false);

  if (!session) return <Redirect href="/register" />;
  if (!type) return <Redirect href="/provider/type" />;
  const kind = PROVIDER_KINDS[type];
  const doctor = isDoctorType(type);
  const list = contacts ?? [];

  function back() {
    if (step === "category")
      return setStep(matches.length ? "duplicates" : "details");
    if (step === "duplicates") return setStep("details");
    router.back();
  }
  function validateDetails() {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = t.provErrRequired;
    if (!village) next.village = t.regVillageRequired;
    if (!list.length || Object.keys(contactErrors(activeContacts(list))).length)
      next.contacts = t.mobileError;
    setErrors(next);
    setShowErrors(true);
    return !Object.keys(next).length;
  }
  async function check() {
    if (submitting.current || !validateDetails() || !village) return;
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const result = await checkDuplicates({
        providerType: type,
        villageId: village.id,
        name: name.trim(),
        mobiles: contactsPayload(activeContacts(list)).map((row) => row.mobile),
      });
      setMatches(result.matches);
      setStep(result.matches.length ? "duplicates" : "category");
    } catch (error) {
      setFailure(error);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  function validateCategory() {
    const next: Record<string, string> = {};
    for (const field of kind.fields) {
      const value = details[field.key];
      if (
        field.required &&
        field.kind !== "bool" &&
        !String(value ?? "").trim()
      )
        next[field.key] = t.provErrRequired;
    }
    if (doctor && practice.mode === "existing_facility" && !practice.facilityId)
      next.practice = t.provErrFacility;
    setErrors(next);
    return !Object.keys(next).length;
  }
  async function save() {
    if (submitting.current || !village) return;
    if (!validateCategory()) return;
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const cleaned: Record<string, unknown> = {};
      for (const field of kind.fields) {
        const value = details[field.key];
        cleaned[field.key] =
          field.kind === "bool" ? !!value : String(value ?? "").trim();
      }
      await createProfile({
        providerType: type,
        name: name.trim(),
        villageId: village.id,
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        contacts: contactsPayload(activeContacts(list)),
        details: cleaned,
        ...(doctor
          ? {
              practice: {
                mode: practice.mode,
                ...(practice.mode === "existing_facility"
                  ? { facilityId: practice.facilityId }
                  : {}),
              },
            }
          : {}),
      });
      await refreshProfiles(client);
      router.replace("/activities");
    } catch (error) {
      setFailure(error);
      if (error instanceof ApiError && error.status === 409) setStep("details");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function claim(match: Match) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await claimProfile(match.id);
      setNotice(t.dupClaimSent);
    } catch (error) {
      setFailure(error);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  function linkMe(match: Match) {
    setPractice({
      mode: "existing_facility",
      facilityId: match.id,
      facilityName: match.name,
    });
    setStep("category");
  }
  const failureText = failure ? providerError(failure, t, language) : "";

  return (
    <Screen>
      <BackButton label={t.back} disabled={busy} onPress={back} />
      <Text accessibilityRole="header" style={styles.title}>
        {step === "duplicates"
          ? t.dupTitle
          : step === "category"
            ? t.provCategoryStep
            : t.provDetailsTitle}
      </Text>
      <View style={s.badge}>
        <Text style={s.badgeText}>{`${kind.title[language]}`}</Text>
      </View>

      {step === "details" && (
        <>
          <Text style={styles.body}>{t.provMandatory}</Text>
          <Input
            label={`${kind.nameLabel[language]} *`}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setErrors((p) => ({ ...p, name: "" }));
            }}
            error={errors.name}
            maxLength={120}
            editable={!busy}
          />
          <Text style={s.hint}>{t.provNameHint}</Text>
          <VillageField
            label={`${t.regVillage} *`}
            value={village}
            onChange={(next) => {
              setVillage(next);
              setErrors((p) => ({ ...p, village: "" }));
            }}
            error={errors.village}
            disabled={busy}
          />
          <Input
            label={t.provAddress}
            value={address}
            onChangeText={setAddress}
            maxLength={300}
            editable={!busy}
          />
          <Text style={s.section}>{t.provContactsTitle}</Text>
          <ContactNumbersField
            contacts={list}
            onChange={setContacts}
            primaryLocked
            showErrors={showErrors}
            disabled={busy}
          />
          {!!errors.contacts && <ErrorMessage message={errors.contacts} />}
          <Input
            label={t.provDescription}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={1500}
            editable={!busy}
            style={{ minHeight: 96, textAlignVertical: "top" }}
          />
          {!!failureText && <ErrorMessage message={failureText} />}
          {offline && <Text style={styles.body}>{t.offlineAction}</Text>}
          <Button
            loading={busy}
            disabled={offline || !contacts}
            onPress={() => void check()}
          >
            {t.provCheckContinue}
          </Button>
        </>
      )}

      {step === "duplicates" && (
        <>
          <Text style={styles.body}>{t.dupSubtitle}</Text>
          {matches.map((match) => (
            <Card key={match.id}>
              <Text style={s.cardTitle}>{match.name}</Text>
              <Text style={s.hint}>
                {`${match.village[language === "en" ? "name" : "nameMr"]}${match.maskedMobile ? ` · ${match.maskedMobile}` : ""}`}
              </Text>
              <Text style={s.match}>
                {match.reason === "same_number"
                  ? t.dupMatchPhone
                  : t.dupMatchName}
              </Text>
              {match.mine ? (
                <Text style={s.hint}>{t.dupMine}</Text>
              ) : (
                <>
                  {doctor &&
                    match.providerType === ProviderType.MEDICAL_FACILITY && (
                      <Button
                        secondary
                        disabled={busy}
                        onPress={() => linkMe(match)}
                      >
                        {t.dupLink}
                      </Button>
                    )}
                  <Button
                    outlined
                    disabled={busy || !!notice}
                    onPress={() => void claim(match)}
                  >
                    {t.dupClaim}
                  </Button>
                </>
              )}
            </Card>
          ))}
          <Text style={s.hint}>{t.dupNote}</Text>
          {!!notice && <Text style={s.notice}>{notice}</Text>}
          {!!failureText && <ErrorMessage message={failureText} />}
          {notice ? (
            <Button onPress={() => router.replace("/activities")}>
              {t.continue}
            </Button>
          ) : (
            <Button disabled={busy} onPress={() => setStep("category")}>
              {t.dupDifferent}
            </Button>
          )}
          <Text style={s.hint}>{t.dupDifferentHelp}</Text>
        </>
      )}

      {step === "category" && (
        <>
          <Text style={styles.body}>{t.provFromType}</Text>
          <ProviderFields
            type={type}
            values={details}
            onChange={(key, value) => {
              setDetails((p) => ({ ...p, [key]: value }));
              setErrors((p) => ({ ...p, [key]: "" }));
            }}
            errors={errors}
            disabled={busy}
          />
          {doctor && village && (
            <PracticeSection
              practice={practice}
              onChange={(next) => {
                setPractice(next);
                setErrors((p) => ({ ...p, practice: "" }));
              }}
              villageId={village.id}
              error={errors.practice}
              disabled={busy}
            />
          )}
          {!!failureText && <ErrorMessage message={failureText} />}
          {offline && <Text style={styles.body}>{t.offlineAction}</Text>}
          <Button loading={busy} disabled={offline} onPress={() => void save()}>
            {failure ? t.retry : t.provSave}
          </Button>
        </>
      )}
    </Screen>
  );
}

function providerError(
  error: unknown,
  t: ReturnType<typeof messages>,
  language: "en" | "mr" | "hi",
) {
  if (error instanceof ApiError) {
    if (error.code === "PROFILE_LIMIT") return t.provErrLimit;
    if (error.code === "INVALID_MASTER_OPTION") return t.provErrMaster;
    if (error.code === "PRIMARY_NUMBER_MISMATCH") return t.provErrPrimary;
    if (error.code === "FACILITY_UNAVAILABLE") return t.provErrFacility;
  }
  return errorMessage(error, language);
}

function PracticeSection({
  practice,
  onChange,
  villageId,
  error,
  disabled,
}: {
  practice: Practice;
  onChange: (next: Practice) => void;
  villageId: string;
  error?: string;
  disabled: boolean;
}) {
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const [q, setQ] = useState("");
  const [found, setResults] = useState<{ id: string; name: string }[]>([]);
  const [searched, setSearched] = useState(false);
  const ready = practice.mode === "existing_facility" && q.trim().length >= 2;
  const results = ready ? found : [];
  useEffect(() => {
    if (practice.mode !== "existing_facility" || q.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchProfiles(
        {
          providerType: ProviderType.MEDICAL_FACILITY,
          villageId,
          q: q.trim(),
        },
        controller.signal,
      )
        .then((response) => {
          setResults(response.results);
          setSearched(true);
        })
        .catch(() => undefined);
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, villageId, practice.mode]);
  const help: Record<string, string> = {
    existing_facility: t.practiceExistingHelp,
    own_clinic: t.practiceOwnHelp,
    home_visits: t.practiceHomeHelp,
  };
  return (
    <View style={s.practice}>
      <Text style={s.section}>{t.practiceWhere}</Text>
      {PRACTICE_MODES.map((mode) => {
        const on = practice.mode === mode.id;
        return (
          <Pressable
            key={mode.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            disabled={disabled}
            onPress={() => onChange({ mode: mode.id })}
            style={[s.mode, on && s.modeOn]}
          >
            <Text style={[s.modeTitle, on && s.modeTitleOn]}>
              {mode[language]}
            </Text>
            <Text style={s.hint}>{help[mode.id]}</Text>
          </Pressable>
        );
      })}
      {practice.mode === "existing_facility" && (
        <>
          {practice.facilityId && practice.facilityName ? (
            <Text style={s.notice}>{practice.facilityName}</Text>
          ) : null}
          <Text style={s.label}>{t.practiceSearch}</Text>
          <TextInput
            accessibilityLabel={t.practiceSearch}
            value={q}
            onChangeText={setQ}
            placeholder={t.practiceSearchHint}
            placeholderTextColor={theme.colors.muted}
            editable={!disabled}
            style={s.search}
          />
          {results.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              onPress={() => {
                onChange({
                  mode: "existing_facility",
                  facilityId: row.id,
                  facilityName: row.name,
                });
                setQ("");
              }}
              style={s.result}
            >
              <Text style={s.modeTitle}>{row.name}</Text>
            </Pressable>
          ))}
          {ready && searched && !results.length && (
            <Text style={s.hint}>{t.practiceNone}</Text>
          )}
          {!!results.length && <Text style={s.hint}>{t.practicePick}</Text>}
        </>
      )}
      {practice.mode === "own_clinic" && (
        <Text style={s.hint}>{t.practiceInherit}</Text>
      )}
      {!!error && <ErrorMessage message={error} />}
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.tint,
  },
  badgeText: { ...theme.type.label, color: theme.colors.saffronText },
  section: {
    ...theme.type.micro,
    color: theme.colors.muted,
    letterSpacing: 0.6,
  },
  label: { ...theme.type.label, color: theme.colors.text },
  hint: { ...theme.type.caption, color: theme.colors.muted },
  cardTitle: { ...theme.type.heading, color: theme.colors.heading },
  match: { ...theme.type.label, color: theme.colors.saffronText },
  notice: { ...theme.type.label, color: theme.colors.primary },
  practice: { gap: 10 },
  mode: {
    padding: 14,
    gap: 2,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modeOn: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.tint,
  },
  modeTitle: { ...theme.type.subheading, color: theme.colors.text },
  modeTitleOn: { color: theme.colors.saffronText },
  search: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    ...theme.type.body,
  },
  result: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
