import { useEffect, useRef, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
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
import { mobileUserSchema, villagePageSchema } from "@gaavli/validation";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import {
  ActionCard,
  BackButton,
  Button,
  DropdownField,
  ErrorMessage,
  LoadingState,
  LocationPin,
  OfflineBanner,
  styles,
} from "../components/ui";
import { theme } from "../theme";
import { authenticatedApi, saveSession } from "../session";
import { errorMessage } from "../errors";

export default function VillageScreen() {
  const router = useRouter();
  const { language, session, offline } = useAppStore();
  const t = messages(language);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selected, setSelected] = useState<MobileVillage | null>(null);
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
    queryKey: ["mobile-villages", session?.user.id, "", coordinates],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: "20",
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
    enabled: !!session && !offline && !!coordinates,
  });
  // A failed/empty nearby lookup must leave the complete manual dropdown available.
  const nearbyUnavailable =
    !!coordinates &&
    (nearbyQuery.isError || nearbyQuery.data?.pages[0]?.total === 0);
  const manualQuery = useInfiniteQuery({
    queryKey: ["mobile-villages", session?.user.id, "", null],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      authenticatedApi(
        `/villages?page=${pageParam}&limit=20`,
        villagePageSchema,
        { signal },
      ),
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    enabled: !!session && !offline && (!coordinates || nearbyUnavailable),
  });
  const query = coordinates && !nearbyUnavailable ? nearbyQuery : manualQuery;
  const showLocationError = locationError || nearbyUnavailable;
  if (!session) return <Redirect href="/register" />;
  const villages = [
    ...new Map(
      query.data?.pages
        .flatMap((page) => page.villages)
        .map((village) => [village.id, village]),
    ).values(),
  ];
  const villageName = (village: MobileVillage) =>
    language === "mr" ? village.nameMr : village.name;
  function openPicker() {
    generation.current++;
    setLocating(false);
    setCoordinates(null);
    setLocationError(false);
    setPickerOpen(true);
  }
  async function locate() {
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
    if (!selected || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setFailure(null);
    try {
      const user = await authenticatedApi("/users/me", mobileUserSchema, {
        method: "PATCH",
        body: JSON.stringify({ villageId: selected.id }),
      });
      const current = useAppStore.getState().session;
      if (!current) return;
      await saveSession({ ...current, user });
      router.replace("/home");
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
              else if (session.user.village) router.replace("/home");
            }}
          />
          <Text accessibilityRole="header" style={styles.title}>
            {t.villageTitle}
          </Text>
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
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={s.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.close}
            style={StyleSheet.absoluteFill}
            onPress={() => setPickerOpen(false)}
          />
          <SafeAreaView
            edges={["bottom"]}
            style={s.sheet}
            accessibilityViewIsModal
          >
            <View style={s.sheetHeader}>
              <Text accessibilityRole="header" style={s.sheetTitle}>
                {t.villageTitle}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.close}
                onPress={() => setPickerOpen(false)}
                style={s.close}
              >
                <Text accessible={false} style={s.closeText}>
                  ×
                </Text>
              </Pressable>
            </View>
            {coordinates && !nearbyUnavailable && (
              <Text style={s.hint}>{t.locationHelp}</Text>
            )}
            {showLocationError && <ErrorMessage message={t.locationFailed} />}
            {offline && <Text style={s.hint}>{t.offlineAction}</Text>}
            {query.isPending && !offline && <LoadingState label={t.loading} />}
            {!!query.error && (
              <View style={s.retry}>
                <ErrorMessage message={errorMessage(query.error, language)} />
                <Button disabled={offline} onPress={() => void query.refetch()}>
                  {t.retry}
                </Button>
              </View>
            )}
            <FlatList
              data={villages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s.options}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected?.id === item.id }}
                  onPress={() => {
                    setSelected(item);
                    setFailure(null);
                    setPickerOpen(false);
                  }}
                  style={[
                    s.option,
                    selected?.id === item.id && s.optionSelected,
                  ]}
                >
                  <View style={s.optionCopy}>
                    <Text style={s.optionName}>{villageName(item)}</Text>
                    <Text style={s.optionDetail}>
                      {[item.taluka, item.district, item.pinCode]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  {selected?.id === item.id && (
                    <Text accessibilityLabel={t.selected} style={s.check}>
                      ✓
                    </Text>
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                query.isSuccess ? (
                  <Text style={s.hint}>{t.noVillages}</Text>
                ) : null
              }
              ListFooterComponent={
                query.hasNextPage ? (
                  <Button
                    secondary
                    loading={query.isFetchingNextPage}
                    disabled={offline}
                    onPress={() => void query.fetchNextPage()}
                  >
                    {t.loadMore}
                  </Button>
                ) : null
              }
            />
          </SafeAreaView>
        </View>
      </Modal>
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
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.sheet,
    borderTopRightRadius: theme.radii.sheet,
    height: "72%",
    paddingHorizontal: theme.spacing,
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 22,
    lineHeight: 32,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  close: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 30, color: theme.colors.muted },
  hint: {
    fontSize: 15,
    lineHeight: 23,
    color: theme.colors.muted,
    paddingVertical: 12,
  },
  retry: { gap: 12, paddingVertical: 12 },
  options: { gap: 10, paddingVertical: 16 },
  option: {
    minHeight: 72,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.control,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionSelected: {
    borderColor: theme.colors.focusBorder,
    backgroundColor: theme.colors.tint,
  },
  optionCopy: { flex: 1, gap: 4 },
  optionName: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
    fontWeight: "600",
  },
  optionDetail: { fontSize: 13, lineHeight: 20, color: theme.colors.muted },
  check: { color: theme.colors.primary, fontSize: 24 },
});
