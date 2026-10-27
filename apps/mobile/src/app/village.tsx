import { useEffect, useRef, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useInfiniteQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import type { MobileVillage } from "@gaavli/types";
import {
  mobileUserSchema,
  personNameSchema,
  villagePageSchema,
} from "@gaavli/validation";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import {
  ActionCard,
  BackButton,
  Button,
  DropdownField,
  ErrorMessage,
  Input,
  LocationPin,
  OfflineBanner,
  styles,
} from "../components/ui";
import { theme } from "../theme";
import { authenticatedApi, saveSession } from "../session";
import { postAuthHref } from "../storage/preferences";
import { errorMessage } from "../errors";
import { VillagePicker, useVillageSearch } from "../components/VillagePicker";
import { selectBrowsingVillage } from "../storage/browsingVillage";
import { preferenceStorage } from "../storage/sqlite";

export default function VillageScreen() {
  const router = useRouter();
  const { language, session, offline } = useAppStore();
  const t = messages(language);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { search, setSearch, debouncedSearch, searchPending } =
    useVillageSearch();
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const browsingVillage = useAppStore((state) => state.browsingVillage);
  const [selected, setSelected] = useState<MobileVillage | null>(
    session?.user.village ?? browsingVillage,
  );
  const needsNames = !session?.user.firstName || !session?.user.lastName;
  const [firstName, setFirstName] = useState(session?.user.firstName || "");
  const [lastName, setLastName] = useState(session?.user.lastName || "");
  const [nameErrors, setNameErrors] = useState<{
    firstName?: string;
    lastName?: string;
  }>({});
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const generation = useRef(0);
  const submitting = useRef(false);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const nearbyQuery = useInfiniteQuery({
    queryKey: [
      "mobile-villages",
      session?.user.id,
      debouncedSearch,
      coordinates,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: "20",
        search: debouncedSearch,
      });
      if (coordinates) {
        params.set("latitude", String(coordinates.latitude));
        params.set("longitude", String(coordinates.longitude));
      }
      return authenticatedApi(`/villages?${params}`, villagePageSchema, {
        signal,
      });
    },
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    enabled: pickerOpen && !!session && !offline && !!coordinates,
  });
  // A failed/empty nearby lookup must leave the complete manual dropdown available.
  const nearbyUnavailable =
    !!coordinates &&
    (nearbyQuery.isError ||
      (!debouncedSearch && nearbyQuery.data?.pages[0]?.total === 0));
  const manualQuery = useInfiniteQuery({
    queryKey: ["mobile-villages", session?.user.id, debouncedSearch, null],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      authenticatedApi(
        `/villages?page=${pageParam}&limit=20&search=${encodeURIComponent(debouncedSearch)}`,
        villagePageSchema,
        { signal },
      ),
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    enabled:
      pickerOpen &&
      !!session &&
      !offline &&
      (!coordinates || nearbyUnavailable),
  });
  const query = coordinates && !nearbyUnavailable ? nearbyQuery : manualQuery;
  const showLocationError = locationError || nearbyUnavailable;
  if (!session) return <Redirect href="/register" />;
  const villageName = (village: MobileVillage) =>
    language === "mr" ? village.nameMr : village.name;
  function openPicker() {
    setSearch("");
    generation.current++;
    setLocating(false);
    setCoordinates(null);
    setLocationError(false);
    setPickerOpen(true);
  }
  async function locate() {
    setSearch("");
    const current = ++generation.current;
    setLocating(true);
    setLocationError(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        (async () => {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (permission.status !== "granted") throw new Error("denied");
          return Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        })(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error("location-timeout")),
            20000,
          );
        }),
      ]);
      if (generation.current === current) {
        setCoordinates({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        });
        setPickerOpen(true);
      }
    } catch {
      if (generation.current === current) {
        setCoordinates(null);
        setLocationError(true);
      }
    } finally {
      if (timer) clearTimeout(timer);
      if (generation.current === current) setLocating(false);
    }
  }
  async function confirm() {
    if (!session || !selected || submitting.current) return;
    const names = needsNames
      ? {
          firstName: personNameSchema.safeParse(firstName),
          lastName: personNameSchema.safeParse(lastName),
        }
      : null;
    if (
      names &&
      (!names.firstName.success ||
        !names.lastName.success ||
        names.firstName.data.length + names.lastName.data.length + 1 > 100)
    ) {
      setNameErrors({
        firstName: names.firstName.success ? "" : t.nameError,
        lastName:
          names.lastName.success &&
          names.firstName.success &&
          names.firstName.data.length + names.lastName.data.length + 1 > 100
            ? t.fullNameError
            : names.lastName.success
              ? ""
              : t.nameError,
      });
      return;
    }
    submitting.current = true;
    setSaving(true);
    setFailure(null);
    try {
      const user = await authenticatedApi("/users/me", mobileUserSchema, {
        method: "PATCH",
        body: JSON.stringify({
          villageId: selected.id,
          ...(names?.firstName.success && names.lastName.success
            ? {
                firstName: names.firstName.data,
                lastName: names.lastName.data,
              }
            : {}),
        }),
      });
      const current = useAppStore.getState().session;
      if (!current || current.user.id !== session.user.id) return;
      await saveSession({ ...current, user });
      // An explicit Settings change selects the same village for discovery.
      // Initial registration keeps any existing guest browsing choice.
      if (session.user.village && user.village) {
        await selectBrowsingVillage(
          preferenceStorage,
          user.village,
          useAppStore.getState().setBrowsingVillage,
        );
      }
      router.replace(
        postAuthHref(
          user,
          useAppStore.getState().contactReturnListingId,
          useAppStore.getState().authMode === "login",
        ),
      );
    } catch (error) {
      setFailure(error);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  return (
    <SafeAreaView style={s.screen}>
      {offline && <OfflineBanner message={t.offline} />}
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.form}>
          <BackButton
            label={t.back}
            disabled={saving}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else if (session.user.village)
                router.replace(postAuthHref(session.user));
            }}
          />
          <Text accessibilityRole="header" style={styles.title}>
            {t.villageTitle}
          </Text>
          {needsNames && (
            <>
              <Input
                label={t.firstName}
                value={firstName}
                onChangeText={(value) => {
                  setFirstName(value);
                  setNameErrors((previous) => ({ ...previous, firstName: "" }));
                }}
                error={nameErrors.firstName}
                autoComplete="given-name"
                maxLength={60}
                editable={!saving}
              />
              <Input
                label={t.lastName}
                value={lastName}
                onChangeText={(value) => {
                  setLastName(value);
                  setNameErrors((previous) => ({ ...previous, lastName: "" }));
                }}
                error={nameErrors.lastName}
                autoComplete="family-name"
                maxLength={60}
                editable={!saving}
              />
            </>
          )}
          <DropdownField
            label={t.villageLabel}
            value={selected ? villageName(selected) : undefined}
            placeholder={t.villageTitle}
            expanded={pickerOpen}
            disabled={saving}
            onPress={openPicker}
          />
          <ActionCard
            title={t.useLocation}
            subtitle={t.detectVillage}
            icon={<LocationPin />}
            loading={locating}
            disabled={saving || offline}
            onPress={() => void locate()}
          />
          {showLocationError && <ErrorMessage message={t.locationFailed} />}
          {!!failure && (
            <ErrorMessage message={errorMessage(failure, language)} />
          )}
          <Button
            loading={saving}
            disabled={!selected || offline || locating}
            onPress={() => void confirm()}
          >
            {t.continue}
          </Button>
        </View>
        <View style={s.spacer} />
        <Image
          source={require("../../assets/village-footer.webp")}
          resizeMode="cover"
          accessible={false}
          style={[
            s.illustration,
            {
              height: Math.max(
                140,
                Math.min(200, (height - insets.top - insets.bottom) * 0.24),
              ),
            },
          ]}
        />
      </ScrollView>
      <VillagePicker
        open={pickerOpen}
        selected={selected}
        search={search}
        searchPending={searchPending}
        query={query}
        onSearch={setSearch}
        hint={coordinates && !nearbyUnavailable ? t.locationHelp : undefined}
        locationError={showLocationError ? t.locationFailed : undefined}
        onClose={() => setPickerOpen(false)}
        onSelect={(village) => {
          setSelected(village);
          setFailure(null);
          setPickerOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, paddingBottom: 8 },
  form: {
    paddingHorizontal: theme.layout.screenPadding,
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
    gap: theme.spacing,
    paddingBottom: 16,
  },
  spacer: { flexGrow: 1, minHeight: 24 },
  illustration: { marginHorizontal: 10, borderRadius: theme.radii.artwork },
});
