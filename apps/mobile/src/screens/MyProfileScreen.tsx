import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MobileProfile } from "@gaavli/types";
import { indianMobileSchema, mobileProfileSchema } from "@gaavli/validation";
import { useAppStore } from "../store";
import { authenticatedApi, saveSession } from "../session";
import { messages } from "../i18n";
import { errorMessage } from "../errors";
import { ApiError } from "../api/client";
import { theme } from "../theme";
import {
  Button,
  ErrorMessage,
  Input,
  LoadingState,
  Screen,
} from "../components/ui";
import { AppHeader } from "../components/AppHeader";
import { Panel } from "../components/dashboard/primitives";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { MobileChangeDialog } from "../components/MobileChangeDialog";
import {
  editableProfileDraft,
  profileChanged,
  profileSaveBody,
  type ProfileDraft,
} from "../data/profile";
import {
  localListingPhotoSchema,
  type LocalListingPhoto,
} from "../data/listingForm";
import { resolveListingPhotoUrl } from "../data/listingPhotos";
import {
  pickListingPhoto,
  uploadDraftPhoto,
  removeDraftPhoto,
} from "../storage/listingPhotos";
import { listingDraftStorage } from "../storage/sqlite";

export default function MyProfileScreen() {
  const session = useAppStore((state) => state.session);
  return (
    <ProtectedPage>
      <MyProfileContent
        key={`${session?.user.id}:${session?.user.village?.id}`}
      />
    </ProtectedPage>
  );
}
const emailBadNow = (value: string) =>
  !!value.trim() && !/^[^\s@]+@[^\s@]{1,}\.[^\s@]{2,}$/.test(value.trim());
function MyProfileContent() {
  const client = useQueryClient();
  const { session, language, offline } = useAppStore();
  const t = messages(language);
  const accountId = session!.user.id;
  const villageId = session!.user.village!.id;
  const queryKey = ["my-profile", accountId];
  const photoStorageKey = `profile-photo:${accountId}:${villageId}`;
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      authenticatedApi("/users/me/profile", mobileProfileSchema, { signal }),
    enabled: !offline,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });
  const [editedDraft, setDraft] = useState<ProfileDraft | null>(null);
  const draft =
    editedDraft ??
    (query.data ? editableProfileDraft(query.data, session!.user.name) : null);
  const [busy, setBusy] = useState<"save" | "photo" | "reload" | null>(null);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [changeMobile, setChangeMobile] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<LocalListingPhoto | null>(
    null,
  );
  const [photoReady, setPhotoReady] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const working = useRef(false);
  const mounted = useRef(true);
  const isCurrent = () =>
    mounted.current && useAppStore.getState().session?.user.id === accountId;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    void listingDraftStorage
      .read(photoStorageKey)
      .then((raw) => {
        const parsed = raw
          ? localListingPhotoSchema.safeParse(JSON.parse(raw))
          : null;
        if (active && parsed?.success) setPendingPhoto(parsed.data);
      })
      .catch(() => {
        if (active) setFailure(t.storageError);
      })
      .finally(() => {
        if (active) setPhotoReady(true);
      });
    return () => {
      active = false;
    };
  }, [photoStorageKey, t.storageError]);

  function acceptProfile(profile: MobileProfile, keepEdits: boolean) {
    if (!isCurrent()) return;
    client.setQueryData(queryKey, profile);
    setDraft((current) =>
      keepEdits && current
        ? { ...current, version: profile.version }
        : editableProfileDraft(profile, session!.user.name),
    );
    setConflict(false);
  }
  function showFailure(error: unknown) {
    if (!isCurrent()) return;
    setFailure(errorMessage(error, language));
    if (error instanceof ApiError && error.code === "PROFILE_CONFLICT")
      setConflict(true);
  }
  async function save() {
    if (working.current || offline || !draft) return;
    if (!draft.firstName.trim() || emailBadNow(draft.email)) {
      setFailure(!draft.firstName.trim() ? t.nameError : t.profEmailError);
      return;
    }
    const parsed = profileSaveBody(draft, query.data);
    if (!parsed.success) {
      setFailure(t.profileValidationError);
      return;
    }
    working.current = true;
    setBusy("save");
    setFailure("");
    setNotice("");
    try {
      const profile = await authenticatedApi(
        "/users/me/profile",
        mobileProfileSchema,
        { method: "PATCH", body: JSON.stringify(parsed.data) },
      );
      acceptProfile(profile, false);
      // Keep the name in the greeting and elsewhere in step with the profile.
      const current = useAppStore.getState().session;
      if (current && current.user.id === accountId && profile.firstName)
        await saveSession({
          ...current,
          user: {
            ...current.user,
            firstName: profile.firstName,
            lastName: profile.lastName,
            name: [profile.firstName, profile.lastName]
              .filter(Boolean)
              .join(" "),
          },
        });
      if (isCurrent()) setNotice(t.profileSaved);
    } catch (error) {
      showFailure(error);
    } finally {
      working.current = false;
      if (mounted.current) setBusy(null);
    }
  }
  async function reload() {
    if (working.current || offline) return;
    working.current = true;
    setBusy("reload");
    setFailure("");
    setNotice("");
    try {
      const profile = await authenticatedApi(
        "/users/me/profile",
        mobileProfileSchema,
      );
      acceptProfile(profile, false);
    } catch (error) {
      showFailure(error);
    } finally {
      working.current = false;
      if (mounted.current) setBusy(null);
    }
  }
  async function uploadPhoto(photo: LocalListingPhoto) {
    const uploadedKey = await uploadDraftPhoto(photo, accountId, villageId);
    if (!isCurrent()) return;
    const uploaded = { ...photo, uploadedKey };
    await listingDraftStorage.write(photoStorageKey, JSON.stringify(uploaded));
    if (!isCurrent()) return;
    setPendingPhoto(uploaded);
    const profile = await authenticatedApi(
      "/users/me/profile/photo",
      mobileProfileSchema,
      {
        method: "POST",
        body: JSON.stringify({
          photoObjectKey: uploadedKey,
          version: draft!.version,
        }),
      },
    );
    if (!isCurrent()) return;
    acceptProfile(profile, true);
    await listingDraftStorage.remove(photoStorageKey);
    setPendingPhoto(null);
    await removeDraftPhoto(photo, accountId, villageId);
    if (isCurrent()) setNotice(t.profilePhotoSaved);
  }
  async function choosePhoto(source: "camera" | "gallery") {
    if (working.current || offline || !draft || !photoReady) return;
    working.current = true;
    setBusy("photo");
    setFailure("");
    setNotice("");
    try {
      const photo = await pickListingPhoto(accountId, villageId, source);
      if (!photo || !isCurrent()) return;
      await listingDraftStorage.write(photoStorageKey, JSON.stringify(photo));
      if (!isCurrent()) return;
      setPendingPhoto(photo);
      await uploadPhoto(photo);
    } catch (error) {
      showFailure(error);
    } finally {
      working.current = false;
      if (mounted.current) setBusy(null);
    }
  }
  async function retryPhoto() {
    if (working.current || offline || !draft || !pendingPhoto) return;
    working.current = true;
    setBusy("photo");
    setFailure("");
    setNotice("");
    try {
      await uploadPhoto(pendingPhoto);
    } catch (error) {
      showFailure(error);
    } finally {
      working.current = false;
      if (mounted.current) setBusy(null);
    }
  }
  const profile = query.data;
  const registeredMobile = indianMobileSchema.safeParse(profile?.mobile);
  const primaryMobile = registeredMobile.success
    ? `+91 ${registeredMobile.data}`
    : profile?.mobile || "";
  const locked = !!busy || changeMobile;
  const photoUrl = resolveListingPhotoUrl(
    profile?.photoUrl,
    process.env.EXPO_PUBLIC_API_BASE_URL,
    __DEV__,
  );
  const village = session!.user.village!;
  const villageName = language !== "en" ? village.nameMr : village.name;
  const readOnly = {
    backgroundColor: theme.colors.tint,
    color: theme.colors.muted,
    opacity: 1,
  };
  const dirty =
    !!profile && !!draft && profileChanged(draft, profile, session!.user.name);
  const emailBad =
    !!draft &&
    !!draft.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(draft.email.trim());
  const nameBad = !!draft && !draft.firstName.trim();
  const edit = (patch: Partial<ProfileDraft>) => {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
    setNotice("");
  };
  return (
    <Screen
      header={
        <AppHeader
          title={t.myProfile}
          subtitle={t.profileSubtitle}
          back="/profile"
          backDisabled={locked}
        />
      }
      footer={
        profile && draft ? (
          <Button
            loading={busy === "save"}
            disabled={offline || locked || conflict || !dirty}
            onPress={() => void save()}
          >
            {dirty ? t.saveProfile : t.profNoChanges}
          </Button>
        ) : undefined
      }
    >
      {query.isPending && !offline && <LoadingState label={t.loading} />}
      {offline && <Text style={s.caption}>{t.offlineAction}</Text>}
      {query.isError && (
        <>
          <ErrorMessage message={errorMessage(query.error, language)} />
          <Button
            secondary
            disabled={offline || locked}
            onPress={() => void query.refetch()}
          >
            {t.retry}
          </Button>
        </>
      )}
      {profile && draft && (
        <>
          <View style={s.hero}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.profChangePhoto}
              disabled={offline || locked || !photoReady}
              onPress={() =>
                Alert.alert(t.changeListingPhoto, undefined, [
                  {
                    text: t.takeListingPhoto,
                    onPress: () => void choosePhoto("camera"),
                  },
                  {
                    text: t.choosePhonePhoto,
                    onPress: () => void choosePhoto("gallery"),
                  },
                  { text: t.cancel, style: "cancel" },
                ])
              }
              style={s.avatarWrap}
            >
              <View style={s.avatar}>
                {photoUrl && failedPhoto !== photoUrl ? (
                  <Image
                    source={{ uri: photoUrl }}
                    style={s.avatarImage}
                    onError={() => setFailedPhoto(photoUrl)}
                    accessible={false}
                  />
                ) : (
                  <Text style={s.initial}>
                    {(profile.firstName || session!.user.name)
                      .trim()
                      .slice(0, 1)}
                  </Text>
                )}
              </View>
              <View style={s.camera}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </Pressable>
            <Text style={s.heroName}>
              {[draft.firstName, draft.lastName].filter(Boolean).join(" ") ||
                session!.user.name}
            </Text>
            <View style={s.heroChips}>
              <View style={s.chip}>
                <Ionicons
                  accessible={false}
                  name="location"
                  size={14}
                  color={theme.colors.primary}
                />
                <Text style={s.chipText}>{villageName}</Text>
              </View>
              {!!primaryMobile && (
                <View style={s.chip}>
                  <Ionicons
                    accessible={false}
                    name="call"
                    size={14}
                    color={theme.colors.primary}
                  />
                  <Text style={s.chipText}>{primaryMobile}</Text>
                </View>
              )}
            </View>
            <Text style={s.caption}>{t.profilePhotoHelp}</Text>
            {pendingPhoto && (
              <Button
                secondary
                loading={busy === "photo"}
                disabled={offline || locked}
                onPress={() => void retryPhoto()}
              >
                {t.retryProfilePhoto}
              </Button>
            )}
          </View>

          <Text accessibilityRole="header" style={s.sectionTitle}>
            {t.profPersonal}
          </Text>
          <Panel>
            <Input
              label={`${t.firstName} *`}
              value={draft.firstName}
              onChangeText={(firstName) => edit({ firstName })}
              error={dirty && nameBad ? t.nameError : undefined}
              editable={!locked}
              maxLength={60}
              autoComplete="given-name"
            />
            <Input
              label={t.lastName}
              value={draft.lastName}
              onChangeText={(lastName) => edit({ lastName })}
              editable={!locked}
              maxLength={60}
              autoComplete="family-name"
            />
            <Input
              label={t.profEmail}
              value={draft.email}
              onChangeText={(email) => edit({ email })}
              error={emailBad ? t.profEmailError : undefined}
              editable={!locked}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={120}
            />
          </Panel>

          <Text accessibilityRole="header" style={s.sectionTitle}>
            {t.profContact}
          </Text>
          <Panel>
            <View style={s.mobileRow}>
              <View style={s.mobileInput}>
                <Input
                  label={t.mobile}
                  value={primaryMobile}
                  editable={false}
                  style={readOnly}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={offline || locked}
                onPress={() => setChangeMobile(true)}
                style={s.changeMobile}
              >
                <Text style={s.link}>{t.changeWithOtp}</Text>
              </Pressable>
            </View>
            <Input
              label={t.alternativeMobile}
              value={draft.alternativeMobile}
              onChangeText={(alternativeMobile) => edit({ alternativeMobile })}
              editable={!locked}
              keyboardType="phone-pad"
              maxLength={24}
            />
          </Panel>

          <Text accessibilityRole="header" style={s.sectionTitle}>
            {t.profAbout}
          </Text>
          <Panel>
            <Input
              label={t.profileAddress}
              value={draft.address}
              onChangeText={(address) => edit({ address })}
              editable={!locked}
              maxLength={300}
              multiline
            />
            <Input
              label={t.profileOccupation}
              value={draft.occupation}
              onChangeText={(occupation) => edit({ occupation })}
              editable={!locked}
              maxLength={100}
            />
          </Panel>
        </>
      )}
      {!!failure && <ErrorMessage message={failure} />}
      {conflict && (
        <Button
          secondary
          disabled={locked || offline}
          onPress={() => void reload()}
        >
          {t.reloadProfile}
        </Button>
      )}
      {!!notice && (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={s.notice}
        >
          {notice}
        </Text>
      )}
      {changeMobile && (
        <MobileChangeDialog
          onClose={() => setChangeMobile(false)}
          onChanged={(updated) => {
            acceptProfile(updated, true);
            setChangeMobile(false);
            setNotice(t.mobileChanged);
            void client.removeQueries({ queryKey: ["seller-contact"] });
          }}
        />
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: 10,
    padding: 18,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  avatarWrap: { width: 96, height: 96 },
  camera: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.heading,
    textAlign: "center",
  },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.tint,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: theme.colors.heading },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  heading: { flex: 1 },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  caption: { fontSize: 13, lineHeight: 20, color: theme.colors.muted },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCopy: { flex: 1, minWidth: 90, gap: 4 },
  photoButton: {
    minHeight: theme.layout.touchTarget,
    justifyContent: "center",
  },
  avatar: {
    height: 96,
    width: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  initial: { fontSize: 32, fontWeight: "700", color: theme.colors.heading },
  village: {
    flexGrow: 1,
    alignItems: "flex-end",
    minHeight: theme.layout.touchTarget,
    justifyContent: "center",
  },
  villageName: { fontSize: 16, fontWeight: "600", color: theme.colors.heading },
  link: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.primaryDark,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600",
    color: theme.colors.heading,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.saffronBorder,
    paddingLeft: 10,
  },
  mobileRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  mobileInput: { flex: 1 },
  changeMobile: {
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.control,
  },
  notice: { fontSize: 15, lineHeight: 23, color: theme.colors.primaryDark },
});
