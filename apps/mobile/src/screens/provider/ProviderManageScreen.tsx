import { useEffect, useRef, useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TextInput, Pressable, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  PROVIDER_KINDS,
  ProviderType,
  isFacilityType,
  providerKind,
} from "@gaavli/constants";
import { useAppStore } from "../../store";
import { formatMessage, messages } from "../../i18n";
import { theme } from "../../theme";
import { errorMessage } from "../../errors";
import { ApiError } from "../../api/client";
import {
  answerLink,
  refreshProfiles,
  requestLink,
  searchProfiles,
  setProfileStatus,
  updateProfile,
  useMyProviderProfile,
} from "../../providerProfiles";
import {
  activeContacts,
  contactErrors,
  contactsPayload,
  draftsFromServer,
  type ContactDraft,
} from "../../data/contactNumbers";
import { ContactNumbersField } from "../../components/ContactNumbersField";
import {
  ProviderFields,
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

// Edit one registered profile, hide or show it in the directory and, for a
// medical facility, answer and start doctor links.
export default function ProviderManageScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAppStore((state) => state.session);
  const language = useAppStore((state) => state.language);
  const offline = useAppStore((state) => state.offline);
  const t = messages(language);
  const query = useMyProviderProfile(id);
  const profile = query.data?.profile;
  const links = query.data?.links ?? [];
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [details, setDetails] = useState<Details>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [linking, setLinking] = useState(false);
  const [q, setQ] = useState("");
  const [found, setResults] = useState<{ id: string; name: string }[]>([]);
  const results = linking && q.trim().length >= 2 ? found : [];
  const loaded = useRef<string | null>(null);
  const submitting = useRef(false);

  // Fill the form once per loaded version (a reload after a conflict refills).
  useEffect(() => {
    if (!profile) return;
    const key = `${profile.id}:${profile.version}`;
    if (loaded.current === key) return;
    loaded.current = key;
    setName(profile.name);
    setAddress(profile.address ?? "");
    setDescription(profile.description ?? "");
    setContacts(draftsFromServer(profile.contacts));
    const next: Details = {};
    for (const field of PROVIDER_KINDS[profile.providerType].fields) {
      const value = profile.details[field.key];
      next[field.key] =
        field.kind === "bool"
          ? value === true
          : typeof value === "string"
            ? value
            : "";
    }
    setDetails(next);
  }, [profile]);
  useEffect(() => {
    if (!linking || q.trim().length < 2 || !profile) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchProfiles(
        {
          providerType: ProviderType.HEALTHCARE_PROFESSIONAL,
          villageId: profile.village.id,
          q: q.trim(),
        },
        controller.signal,
      )
        .then((r) => setResults(r.results))
        .catch(() => undefined);
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, linking, profile]);

  if (!session) return <Redirect href="/register" />;
  const kind = profile ? providerKind(profile.providerType) : null;

  async function run(action: () => Promise<unknown>) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    setSaved(false);
    try {
      await action();
      await Promise.all([refreshProfiles(client), query.refetch()]);
      return true;
    } catch (error) {
      setFailure(error);
      return false;
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function save() {
    if (!profile || !kind) return;
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = t.provErrRequired;
    if (Object.keys(contactErrors(activeContacts(contacts))).length)
      next.contacts = t.mobileError;
    for (const field of kind.fields)
      if (
        field.required &&
        field.kind !== "bool" &&
        !String(details[field.key] ?? "").trim()
      )
        next[field.key] = t.provErrRequired;
    setErrors(next);
    setShowErrors(true);
    if (Object.keys(next).length) return;
    const cleaned: Record<string, unknown> = {};
    for (const field of kind.fields) {
      const value = details[field.key];
      cleaned[field.key] =
        field.kind === "bool" ? !!value : String(value ?? "").trim();
    }
    const ok = await run(() =>
      updateProfile(profile.id, {
        name: name.trim(),
        address: address.trim(),
        description: description.trim(),
        contacts: contactsPayload(activeContacts(contacts)),
        details: cleaned,
        version: profile.version,
      }),
    );
    if (ok) setSaved(true);
  }
  const failureText = !failure
    ? ""
    : failure instanceof ApiError && failure.status === 409
      ? t.manageStale
      : errorMessage(failure, language);
  const myFacilityLinks = links.filter(
    (link) => profile && link.facility.id === profile.id,
  );

  return (
    <Screen>
      <BackButton
        label={t.back}
        disabled={busy}
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/activities")
        }
      />
      {query.isError && (
        <ErrorMessage message={errorMessage(query.error, language)} />
      )}
      {profile && kind && (
        <>
          <Text accessibilityRole="header" style={styles.title}>
            {profile.name}
          </Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>{kind.title[language]}</Text>
          </View>
          {profile.status !== "ACTIVE" && (
            <Text style={s.warn}>{t.actInactive}</Text>
          )}

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
          <Input
            label={t.provAddress}
            value={address}
            onChangeText={setAddress}
            maxLength={300}
            editable={!busy}
          />
          <Text style={s.section}>{t.provContactsTitle}</Text>
          <ContactNumbersField
            contacts={contacts}
            onChange={setContacts}
            primaryLocked
            showErrors={showErrors}
            disabled={busy}
          />
          {!!errors.contacts && <ErrorMessage message={errors.contacts} />}
          <ProviderFields
            type={profile.providerType}
            values={details}
            onChange={(key, value) => {
              setDetails((p) => ({ ...p, [key]: value }));
              setErrors((p) => ({ ...p, [key]: "" }));
            }}
            errors={errors}
            disabled={busy}
          />
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
          {failure instanceof ApiError && failure.status === 409 && (
            <Button
              secondary
              onPress={() => {
                loaded.current = null;
                void query.refetch();
              }}
            >
              {t.retry}
            </Button>
          )}
          {saved && <Text style={s.ok}>{t.provSaved}</Text>}
          <Button loading={busy} disabled={offline} onPress={() => void save()}>
            {t.manageEdit}
          </Button>
          <Button
            outlined
            disabled={busy || offline}
            onPress={() =>
              void run(() =>
                setProfileStatus(
                  profile.id,
                  profile.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                  profile.version,
                ),
              )
            }
          >
            {profile.status === "ACTIVE" ? t.manageHide : t.manageShow}
          </Button>

          {(isFacilityType(profile.providerType) ||
            profile.providerType === ProviderType.HEALTHCARE_PROFESSIONAL) && (
            <View style={s.links}>
              <Text style={s.section}>{t.facDoctors}</Text>
              {!myFacilityLinks.length &&
                isFacilityType(profile.providerType) && (
                  <Text style={s.hint}>{t.facNoDoctors}</Text>
                )}
              {links.map((link) => (
                <Card key={link.id}>
                  <Text style={s.cardTitle}>
                    {isFacilityType(profile.providerType)
                      ? link.doctor.name
                      : link.facility.name}
                  </Text>
                  {link.doctor.specialization &&
                  isFacilityType(profile.providerType) ? (
                    <Text style={s.hint}>{link.doctor.specialization}</Text>
                  ) : null}
                  {link.status === "PENDING" && link.needsMyAnswer ? (
                    <>
                      <Text style={s.hint}>
                        {link.initiatedBy === "doctor"
                          ? formatMessage(t.linkAsks, {
                              doctor: link.doctor.name,
                              facility: link.facility.name,
                            })
                          : formatMessage(t.linkAsksDoctor, {
                              facility: link.facility.name,
                            })}
                      </Text>
                      <Button
                        disabled={busy}
                        onPress={() =>
                          void run(() => answerLink(link.id, "confirm"))
                        }
                      >
                        {t.linkConfirm}
                      </Button>
                      <Button
                        outlined
                        disabled={busy}
                        onPress={() =>
                          void run(() => answerLink(link.id, "reject"))
                        }
                      >
                        {t.linkDecline}
                      </Button>
                    </>
                  ) : link.status === "PENDING" ? (
                    <Text style={s.warn}>{t.facAwaiting}</Text>
                  ) : (
                    <>
                      <Text style={s.ok}>{t.facLinked}</Text>
                      <Button
                        ghost
                        disabled={busy}
                        onPress={() =>
                          void run(() => answerLink(link.id, "remove"))
                        }
                      >
                        {t.linkRemove}
                      </Button>
                    </>
                  )}
                </Card>
              ))}
              {isFacilityType(profile.providerType) && (
                <>
                  <Button secondary onPress={() => setLinking(!linking)}>
                    {t.facLinkDoctor}
                  </Button>
                  {linking && (
                    <>
                      <Text style={s.hint}>{t.facLinkHelp}</Text>
                      <TextInput
                        accessibilityLabel={t.facLinkDoctor}
                        value={q}
                        onChangeText={setQ}
                        placeholder={t.practiceSearchHint}
                        placeholderTextColor={theme.colors.muted}
                        style={s.search}
                      />
                      {results.map((row) => (
                        <Pressable
                          key={row.id}
                          accessibilityRole="button"
                          style={s.result}
                          onPress={() =>
                            void run(async () => {
                              await requestLink(profile.id, row.id);
                              setLinking(false);
                              setQ("");
                            })
                          }
                        >
                          <Text style={s.cardTitle}>{row.name}</Text>
                        </Pressable>
                      ))}
                    </>
                  )}
                </>
              )}
            </View>
          )}
        </>
      )}
    </Screen>
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
  hint: { ...theme.type.caption, color: theme.colors.muted },
  warn: { ...theme.type.label, color: theme.colors.saffronText },
  ok: { ...theme.type.label, color: theme.colors.primary },
  cardTitle: { ...theme.type.subheading, color: theme.colors.heading },
  links: { gap: 10 },
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
