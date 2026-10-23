import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MobileProfile } from "@gaavli/types";
import { indianMobileSchema, mobileProfileSchema } from "@gaavli/validation";
import { useAppStore } from "../store";
import { authenticatedApi } from "../session";
import { messages } from "../i18n";
import { errorMessage } from "../errors";
import { ApiError } from "../api/client";
import { theme } from "../theme";
import {
  BackButton,
  Button,
  ErrorMessage,
  Input,
  LoadingState,
  Screen,
} from "../components/ui";
import { Panel } from "../components/dashboard/primitives";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { MobileChangeDialog } from "../components/MobileChangeDialog";
import {
  editableProfileDraft,
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
function MyProfileContent() {
  const router = useRouter();
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
    editedDraft ?? (query.data ? editableProfileDraft(query.data) : null);
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
        : editableProfileDraft(profile),
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
    const parsed = profileSaveBody(draft);
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
  const villageName = language === "mr" ? village.nameMr : village.name;
  const readOnly = {
    backgroundColor: theme.colors.tint,
    color: theme.colors.muted,
    opacity: 1,
  };
  return (
    <Screen>
      <View style={s.header}>
        <BackButton
          label={t.back}
          disabled={locked}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/profile")
          }
        />
        <View style={s.heading}>
          <Text style={s.title} accessibilityRole="header">
            {t.myProfile}
          </Text>
          <Text style={s.caption}>{t.profileSubtitle}</Text>
        </View>
        <Button
          disabled={offline || locked || !draft || conflict}
          loading={busy === "save"}
          onPress={() => void save()}
        >
          {t.saveProfile}
        </Button>
      </View>
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
          <Panel>
            <View style={s.summary}>
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
              <View style={s.summaryCopy}>
                <Pressable
                  accessibilityRole="button"
                  disabled={offline || locked || !photoReady}
                  style={s.photoButton}
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
                >
                  <Text style={s.link}>{t.changeListingPhoto}</Text>
                </Pressable>
                <Text style={s.caption}>{t.profilePhotoHelp}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.changeVillage}
                disabled={locked}
                onPress={() => router.push("/village")}
                style={s.village}
              >
                <Text style={s.caption}>{t.registeredVillage}</Text>
                <Text style={s.villageName}>{villageName}</Text>
                <Text style={s.link}>{t.changeVillage}</Text>
              </Pressable>
            </View>
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
          </Panel>
          <Text accessibilityRole="header" style={s.sectionTitle}>
            {t.basicProfileInformation}
          </Text>
          <Panel>
            <Text style={s.caption}>{t.registeredFieldsReadOnly}</Text>
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
              label={t.firstName}
              value={profile.firstName || ""}
              placeholder={t.detailsNotProvided}
              editable={false}
              style={readOnly}
            />
            <Input
              label={t.lastName}
              value={profile.lastName || ""}
              placeholder={t.detailsNotProvided}
              editable={false}
              style={readOnly}
            />
            <Input
              label={t.profileAddress}
              value={draft.address}
              onChangeText={(address) => {
                setDraft({ ...draft, address });
                setNotice("");
              }}
              editable={!locked}
              maxLength={300}
              multiline
            />
          </Panel>
          <Text accessibilityRole="header" style={s.sectionTitle}>
            {t.additionalProfileInformation}
          </Text>
          <Panel>
            <Input
              label={t.alternativeMobile}
              value={draft.alternativeMobile}
              onChangeText={(alternativeMobile) => {
                setDraft({ ...draft, alternativeMobile });
                setNotice("");
              }}
              editable={!locked}
              keyboardType="phone-pad"
              maxLength={24}
            />
            <Input
              label={t.profileOccupation}
              value={draft.occupation}
              onChangeText={(occupation) => {
                setDraft({ ...draft, occupation });
                setNotice("");
              }}
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
    height: 72,
    width: 72,
    borderRadius: 36,
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
    borderLeftColor: theme.colors.softGreen,
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
