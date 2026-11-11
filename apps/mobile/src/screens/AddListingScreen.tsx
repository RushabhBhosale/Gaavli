import { productDisplayName } from "../locale";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import {
  Image,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  pickListingPhoto,
  uploadDraftPhoto,
  removeDraftPhoto,
  localListingPhotoUri,
} from "../storage/listingPhotos";
import { Redirect, useRouter, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LISTING_ASSET_PHOTOS,
  MAX_LISTING_TAGS,
  listingTagLabel,
  listingTagsForGroup,
  type ListingTag,
} from "@gaavli/constants";
import {
  mobileCategoriesSchema,
  mobileUserSchema,
  ownedListingSchema,
  listingIdSchema,
  catalogSearchResponseSchema,
} from "@gaavli/validation";
import { useAppStore } from "../store";
import { showToast } from "../toast";
import { authenticatedApi, saveSession } from "../session";
import { ApiError } from "../api/client";
import { errorMessage } from "../errors";
import { formatMessage, messages } from "../i18n";
import { theme } from "../theme";
import {
  Button,
  ErrorMessage,
  Input,
  DropdownField,
  Screen,
} from "../components/ui";
import { d } from "../components/dashboard/primitives";
import { ListingImage } from "../components/dashboard/ListingImage";
import { AppHeader } from "../components/AppHeader";
import {
  VoiceMicButton,
  voiceErrorText,
  voiceStatusText,
} from "../components/VoiceMicButton";
import { useVoiceSearch } from "../hooks/useVoiceSearch";
import { produceVoiceHints, voiceProductSearch } from "../data/voiceSearch";
import { listingDraftStorage, productMasterCache } from "../storage/sqlite";
import {
  matchesProductSearch,
  searchMasterProducts,
} from "../data/productMaster";
import {
  emptyListingDraft,
  listingDraftSchema,
  ListingFormError,
  newListingOperation,
  prepareListing,
  formFromListing,
  prepareListingEdit,
  listingOperationId,
  selectMasterProduct,
  type ListingDraft,
  type ListingForm,
} from "../data/listingForm";

export default function AddListingScreen() {
  const session = useAppStore((state) => state.session);
  const language = useAppStore((state) => state.language);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const parsed = listingIdSchema.safeParse(id);
  if (!session) return <Redirect href="/register" />;
  if (!session.user.village) return <Redirect href="/village" />;
  if (id !== undefined && !parsed.success)
    return (
      <Screen
        header={
          <AppHeader
            title={messages(language).editListing}
            back="/my-listings"
          />
        }
      >
        <ErrorMessage message={messages(language).editUnavailable} />
      </Screen>
    );
  const editId = parsed.success ? parsed.data : undefined;
  return (
    <ListingFormScreen
      key={`${session.user.id}:${session.user.village.id}:${editId || "new"}`}
      accountId={session.user.id}
      villageId={session.user.village.id}
      editId={editId}
    />
  );
}
function ListingFormScreen({
  accountId,
  villageId,
  editId,
}: {
  accountId: string;
  villageId: string;
  editId?: string;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const { language, offline, session } = useAppStore();
  const t = messages(language);
  const [draft, setDraft] = useState<ListingDraft>(emptyListingDraft);
  const latest = useRef(draft);
  const queue = useRef(Promise.resolve());
  const active = useRef(true);
  const loadVersion = useRef(0);
  const submitting = useRef(false);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [photoSheet, setPhotoSheet] = useState(false);
  const [priceFocused, setPriceFocused] = useState(false);
  const key = `${accountId}:${villageId}${editId ? `:edit:${editId}` : ""}`;
  const categories = useQuery({
    queryKey: ["listing-categories", accountId],
    queryFn: ({ signal }) =>
      authenticatedApi("/categories", mobileCategoriesSchema, { signal }),
    retry: 1,
  });
  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedProductSearch(productSearch.trim()),
      300,
    );
    return () => clearTimeout(timeout);
  }, [productSearch]);
  const products = useQuery({
    queryKey: ["catalog-search", accountId, debouncedProductSearch, offline],
    queryFn: ({ signal }) =>
      searchMasterProducts({
        storage: productMasterCache,
        offline,
        search: debouncedProductSearch,
        signal,
        fetch: (search, signal) =>
          authenticatedApi(
            `/catalog/search?q=${encodeURIComponent(search)}&limit=20`,
            catalogSearchResponseSchema,
            { signal },
          ),
      }),
    enabled: debouncedProductSearch.length > 0,
    networkMode: "always",
    retry: false,
    staleTime: 30_000,
  });
  const productSearchWaiting =
    productSearch.trim() !== debouncedProductSearch ||
    (debouncedProductSearch.length > 0 &&
      (products.isPending || products.isFetching));
  const productSearchMessage = !productSearch.trim()
    ? t.productMasterSearchHint
    : productSearchWaiting
      ? t.productMasterLoading
      : products.isError
        ? t.productMasterUnavailable
        : products.data?.cached
          ? t.productMasterCached
          : products.data && products.data.products.length === 0
            ? t.productMasterNoMatches
            : undefined;
  function loadDraft(replace = false) {
    const version = ++loadVersion.current;
    return listingDraftStorage
      .read(key)
      .then(async (raw) => {
        let saved =
          raw && !replace
            ? listingDraftSchema.parse(JSON.parse(raw))
            : emptyListingDraft;
        if (editId && (!raw || replace)) {
          const row = await authenticatedApi(
            `/listings/mine/${editId}`,
            ownedListingSchema,
          );
          // Active and expired listings can be edited; saving an expired one
          // with a new availability puts it back on sale.
          if (row.villageId !== villageId || row.status !== "active")
            throw new ApiError("INVALID_LISTING_STATE", 409);
          const form = formFromListing(row, language);
          saved = {
            ...emptyListingDraft,
            form,
            editBase: row,
            editInitialForm: form,
            editLanguage: language,
          };
          await listingDraftStorage.write(key, JSON.stringify(saved));
          if (replace)
            await removeDraftPhoto(
              latest.current.form.localPhoto,
              accountId,
              villageId,
            ).catch(() => undefined);
        }
        if (
          editId &&
          (saved.editBase?.id !== editId ||
            saved.editBase?.villageId !== villageId ||
            !saved.editInitialForm ||
            !saved.editLanguage ||
            saved.pending)
        )
          throw new Error("Invalid edit draft");
        if (!editId && (saved.editBase || saved.editPending))
          throw new Error("Invalid create draft");
        if (saved.pending && saved.pending.body.villageId !== villageId)
          throw new Error("Draft village mismatch");
        if (!active.current || version !== loadVersion.current) return;
        setLoadFailed(false);
        setFailure(null);
        setConflict(false);
        latest.current = saved;
        setDraft(saved);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (active.current && version === loadVersion.current) {
          setLoadFailed(true);
          setFailure(
            error instanceof ApiError && error.code === "INVALID_LISTING_STATE"
              ? t.editUnavailable
              : errorMessage(error, language),
          );
        }
      });
  }
  useEffect(() => {
    active.current = true;
    void loadDraft();
    return () => {
      active.current = false;
    };
    // The form remounts for each account/village; never cross-load a draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  function persist(next: ListingDraft) {
    const operation = listingDraftStorage.write(key, JSON.stringify(next));
    queue.current = operation;
    void operation.then(
      () => {
        if (active.current) setSaveFailed(false);
      },
      () => {
        if (active.current) setSaveFailed(true);
      },
    );
    return operation;
  }
  function update<K extends keyof ListingForm>(
    field: K,
    value: ListingForm[K],
  ) {
    if (
      !ready ||
      submitting.current ||
      latest.current.pending ||
      latest.current.editPending
    )
      return;
    const next = {
      ...latest.current,
      form: {
        ...latest.current.form,
        [field]: value,
        ...(field === "photo"
          ? { localPhoto: null, existingPhotoKey: null }
          : {}),
      },
    };
    const previous = latest.current.form.localPhoto;
    latest.current = next;
    setDraft(next);
    setFailure(null);
    void persist(next)
      .then(() =>
        field === "photo"
          ? removeDraftPhoto(previous, accountId, villageId)
          : undefined,
      )
      .catch(() => undefined);
  }
  async function choosePhonePhoto(source: "camera" | "gallery") {
    if (
      !ready ||
      submitting.current ||
      latest.current.pending ||
      latest.current.editPending
    )
      return;
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const photo = await pickListingPhoto(accountId, villageId, source);
      if (!photo) return;
      if (!active.current) {
        await removeDraftPhoto(photo, accountId, villageId);
        return;
      }
      const previous = latest.current.form.localPhoto;
      const next = {
        ...latest.current,
        form: {
          ...latest.current.form,
          photo: "",
          existingPhotoKey: null,
          localPhoto: photo,
        },
      };
      latest.current = next;
      setDraft(next);
      await persist(next);
      await removeDraftPhoto(previous, accountId, villageId).catch(
        () => undefined,
      );
    } catch (error) {
      if (active.current) setFailure(errorMessage(error, language));
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function leave() {
    if (submitting.current) return;
    try {
      if (ready) await persist(latest.current);
      if (router.canGoBack()) router.back();
      else router.replace("/my-listings");
    } catch {
      /* The unsaved warning stays visible. */
    }
  }
  async function publish() {
    if (!ready || offline || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    let createConfirmed = false;
    let attempted = false;
    try {
      let next = latest.current;
      if (!next.pending && !next.editPending) {
        if (!editId && !next.form.productId)
          throw new ListingFormError("productId");
        const category = categories.data?.categories.find(
          (item) => item.id === next.form.categoryId,
        );
        if (!category) throw new ListingFormError("categoryId");
        // Validate before upload. Phone file and upload ID survive interruption.
        prepareListing(
          { ...next.form, localPhoto: null },
          villageId,
          language,
          category.code,
        );
        if (next.form.localPhoto && !next.form.localPhoto.uploadedKey) {
          const uploadedKey = await uploadDraftPhoto(
            next.form.localPhoto,
            accountId,
            villageId,
          );
          next = {
            ...next,
            form: {
              ...next.form,
              localPhoto: { ...next.form.localPhoto, uploadedKey },
            },
          };
          await persist(next);
          latest.current = next;
          setDraft(next);
        }
        next =
          editId && next.editBase && next.editInitialForm
            ? {
                ...next,
                editPending: {
                  key: listingOperationId(),
                  body: prepareListingEdit(
                    next.form,
                    next.editBase,
                    next.editInitialForm,
                    next.editLanguage || language,
                    category.code,
                  ),
                },
              }
            : {
                ...next,
                pending: newListingOperation(
                  prepareListing(next.form, villageId, language, category.code),
                ),
              };
      }
      // Persist exact request and expiry before sending, including across restarts.
      await persist(next);
      latest.current = next;
      setDraft(next);
      const pending = editId ? next.editPending! : next.pending!;
      const actor = useAppStore.getState().session;
      if (actor?.user.id !== accountId || actor.user.village?.id !== villageId)
        throw new ApiError("AUTH_REQUIRED", 401);
      attempted = true;
      await authenticatedApi(
        editId ? `/listings/${editId}` : "/listings",
        ownedListingSchema,
        {
          method: editId ? "PATCH" : "POST",
          headers: { "Idempotency-Key": pending.key },
          body: JSON.stringify(pending.body),
        },
      );
      createConfirmed = true;
      if (!editId) {
        const user = await authenticatedApi("/users/me", mobileUserSchema);
        const current = useAppStore.getState().session;
        if (!current || current.user.id !== accountId || user.id !== accountId)
          return;
        await saveSession({ ...current, user });
      }
      await queue.current;
      await listingDraftStorage.remove(key);
      await removeDraftPhoto(next.form.localPhoto, accountId, villageId).catch(
        () => undefined,
      );
      void client.invalidateQueries({ queryKey: ["own-listings"] });
      void client.invalidateQueries({ queryKey: ["home-listings"] });
      void client.invalidateQueries({ queryKey: ["marketplace-listings"] });
      void client.invalidateQueries({ queryKey: ["listing"] });
      if (active.current) {
        router.replace("/my-listings");
        showToast(
          editId ? t.listingUpdatedSuccess : t.listingAddedSuccess,
          "success",
        );
      }
    } catch (error) {
      if (!active.current) return;
      // Only a definite create rejection unlocks editing. Later profile/storage
      // failures retain the already successful create's key for safe replay.
      if (
        attempted &&
        !createConfirmed &&
        error instanceof ApiError &&
        error.status &&
        error.status >= 400 &&
        error.status < 500 &&
        ![401, 408, 429].includes(error.status)
      ) {
        const next = {
          ...latest.current,
          pending: null,
          editPending: null,
          form: {
            ...latest.current.form,
            localPhoto:
              error.code === "PHOTO_UNAVAILABLE" &&
              latest.current.form.localPhoto
                ? { ...latest.current.form.localPhoto, uploadedKey: null }
                : latest.current.form.localPhoto,
          },
        };
        try {
          await persist(next);
          latest.current = next;
          setDraft(next);
        } catch {
          /* keep retry snapshot */
        }
      }
      if (
        error instanceof ApiError &&
        ["STALE_VERSION", "INVALID_LISTING_STATE"].includes(error.code)
      )
        setConflict(true);
      const message = createConfirmed
        ? editId
          ? t.listingUpdatedFollowupError
          : t.listingAddedFollowupError
        : error instanceof ListingFormError
          ? error.field === "unchanged"
            ? t.noListingChanges
            : error.field === "productId"
              ? t.productMasterRequired
              : error.field === "categoryId"
                ? t.listingCategoryMissing
                : t.listingInvalid
          : error instanceof ApiError && error.code === "DUPLICATE_LISTING"
            ? t.listingDuplicate
            : error instanceof ApiError && error.code === "LISTING_LIMIT"
              ? t.listingLimit
              : errorMessage(error, language);
      setFailure(message);
      showToast(message, "error");
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }
  const locked = busy || !!draft.pending || !!draft.editPending || !ready;
  const form = draft.form;
  const village = session?.user.village;
  const villageName = village
    ? language !== "en"
      ? village.nameMr
      : village.name
    : "";
  const localDigits = (value: string) =>
    language === "en"
      ? value
      : value.replace(/[0-9]/g, (digit) => "०१२३४५६७८९"[Number(digit)]);
  const hasPhoto = !!(form.localPhoto || form.existingPhotoKey || form.photo);
  const unitNames: Record<string, string> = {
    kg: t.unitKg,
    litre: t.unitLitre,
    dozen: t.unitDozen,
    bunch: t.unitBunch,
    pieces: t.unitPieces,
    piece: t.unitPieces,
    ton: t.unitTon,
    bundle: t.unitBundle,
  };
  const units = [
    ...UNITS,
    ...((UNITS as readonly string[]).includes(form.unit) ? [] : [form.unit]),
  ];
  const unitLabel = unitNames[form.unit] || form.unit;
  // The group's own tags, plus any older tag this listing already carries.
  const tagChoices = [
    ...listingTagsForGroup(form.group),
    ...form.tags.filter(
      (tag) => !listingTagsForGroup(form.group).includes(tag),
    ),
  ];
  const tagsFull = form.tags.length >= MAX_LISTING_TAGS;
  function toggleTag(tag: ListingTag) {
    const current = latest.current.form.tags;
    if (current.includes(tag))
      update(
        "tags",
        current.filter((item) => item !== tag),
      );
    else if (current.length < MAX_LISTING_TAGS)
      update("tags", [...current, tag]);
  }
  function pickPhoto(source: "camera" | "gallery") {
    setPhotoSheet(false);
    void choosePhonePhoto(source);
  }
  return (
    <Screen
      header={
        <AppHeader
          title={editId ? t.editListing : t.addListing}
          subtitle={
            villageName
              ? formatMessage(t.listingSellingIn, { village: villageName })
              : undefined
          }
          onBack={() => void leave()}
          backDisabled={busy}
          back="/my-listings"
        />
      }
      footer={
        ready ? (
          <Button
            loading={busy}
            disabled={offline || saveFailed || conflict}
            onPress={() => void publish()}
          >
            {draft.pending || draft.editPending
              ? t.listingRetryPublish
              : editId
                ? t.saveListingChanges
                : t.listingPublish}
          </Button>
        ) : undefined
      }
    >
      {!ready ? (
        <>
          <Text style={d.description}>
            {loadFailed ? t.listingDraftFailed : t.listingDraftLoading}
          </Text>
          {failure && <ErrorMessage message={failure} />}
          {loadFailed && (
            <Button secondary onPress={() => void loadDraft()}>
              {t.retry}
            </Button>
          )}
        </>
      ) : (
        <>
          {saveFailed && (
            <>
              <ErrorMessage message={t.listingDraftUnsaved} />
              <Button
                secondary
                disabled={busy}
                onPress={() =>
                  void persist(latest.current).catch(() => undefined)
                }
              >
                {t.listingSaveDraft}
              </Button>
            </>
          )}
          {!!(draft.pending || draft.editPending) && (
            <Text style={s.warning}>{t.listingPending}</Text>
          )}
          {/* One big photo tile: tap it to take, pick or remove a photo. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              hasPhoto ? t.listingPhotoChange : t.listingPhotoAdd
            }
            accessibilityHint={t.listingPhotoAddHint}
            disabled={locked}
            onPress={() => setPhotoSheet(true)}
            style={({ pressed }) => [
              s.photo,
              !hasPhoto && s.photoEmpty,
              pressed && s.pressed,
            ]}
          >
            {hasPhoto ? (
              <>
                {form.localPhoto ? (
                  <Image
                    source={{
                      uri: localListingPhotoUri(
                        form.localPhoto,
                        accountId,
                        villageId,
                      ),
                    }}
                    style={s.photoImage}
                    resizeMode="cover"
                    accessible={false}
                  />
                ) : (
                  <ListingImage
                    listing={{
                      photoUrl: form.existingPhotoKey
                        ? draft.editBase?.photoUrl || null
                        : null,
                      image:
                        LISTING_ASSET_PHOTOS.find(
                          (photo) => photo.id === form.photo,
                        )?.id || null,
                    }}
                    style={s.photoImage}
                    iconSize={40}
                  />
                )}
                <View style={s.photoBadge}>
                  <Ionicons
                    accessible={false}
                    name="camera"
                    size={16}
                    color={theme.colors.onPrimary}
                  />
                  <Text style={s.photoBadgeText}>{t.listingPhotoChange}</Text>
                </View>
              </>
            ) : (
              <View style={s.photoPrompt}>
                <View style={s.photoIcon}>
                  <Ionicons
                    accessible={false}
                    name="camera-outline"
                    size={30}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={s.photoTitle}>{t.listingPhotoAdd}</Text>
                <Text style={s.hint}>{t.listingPhotoAddHint}</Text>
              </View>
            )}
          </Pressable>
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t.listingStepProduct}</Text>
            <ListingDropdown
              label={t.listingProductName}
              value={form.productId || ""}
              disabled={locked}
              selectedLabel={
                form.productId
                  ? productDisplayName(language, {
                      en: form.productNameEn,
                      mr: form.productNameMr,
                      hi: form.productNameHi,
                    }) || form.name
                  : form.name
              }
              searchable
              remoteSearch
              searchPlaceholder={t.productMasterSearch}
              searchValue={productSearch}
              onSearchChange={setProductSearch}
              searchMessage={productSearchMessage}
              searchSuggestion={
                productSearchWaiting ? undefined : products.data?.didYouMean
              }
              searchError={
                !productSearchWaiting &&
                !!productSearch.trim() &&
                products.isError
              }
              onSearchRetry={() => void products.refetch()}
              searchTexts={Object.fromEntries(
                (products.data?.products || []).map((product) => [
                  product.productId,
                  [product.nameMr, product.nameEn, product.nameHi]
                    .filter(Boolean)
                    .join(" "),
                ]),
              )}
              options={(productSearchWaiting
                ? []
                : products.data?.products || []
              ).map(
                (product) =>
                  [
                    product.productId,
                    productDisplayName(language, {
                      en: product.nameEn,
                      mr: product.nameMr,
                      hi: product.nameHi,
                    }),
                  ] as const,
              )}
              onChange={(id) => {
                const product = products.data?.products.find(
                  (item) => item.productId === id,
                );
                if (
                  !product ||
                  submitting.current ||
                  latest.current.pending ||
                  latest.current.editPending
                )
                  return;
                const next = {
                  ...latest.current,
                  form: selectMasterProduct(
                    latest.current.form,
                    product,
                    language,
                  ),
                };
                latest.current = next;
                setDraft(next);
                setFailure(null);
                void persist(next).catch(() => undefined);
              }}
            />
            {editId && !form.productId && (
              <>
                <Text style={s.hint}>{t.productMasterLegacy}</Text>
                <ListingDropdown
                  label={t.listingGroup}
                  value={form.group}
                  disabled={locked}
                  onChange={(value) => update("group", value)}
                  options={
                    [
                      ["vegetables", t.vegetables],
                      ["fruits", t.fruits],
                      ["grain", t.grains],
                      ["dairy", t.dairy],
                      ["homemade", t.homemade],
                      ["other", t.listingOtherGroup],
                    ] as const
                  }
                />
              </>
            )}
            <Text style={s.label}>{t.listingFreshness}</Text>
            {categories.isPending && (
              <Text style={s.hint}>{t.listingsLoading}</Text>
            )}
            {categories.isError && (
              <>
                <ErrorMessage message={t.listingCategoryMissing} />
                <Button secondary onPress={() => void categories.refetch()}>
                  {t.retry}
                </Button>
              </>
            )}
            <View style={s.wrap}>
              {categories.data?.categories.map((item) => {
                const on = item.id === form.categoryId;
                const life = item.defaultShelfLife.trim();
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on, disabled: locked }}
                    disabled={locked}
                    onPress={() => update("categoryId", item.id)}
                    style={({ pressed }) => [
                      s.choice,
                      on && s.choiceOn,
                      pressed && s.pressed,
                    ]}
                  >
                    <Text style={[s.choiceText, on && s.choiceTextOn]}>
                      {language !== "en" ? item.nameMr : item.name}
                    </Text>
                    {!!life && (
                      <Text style={[s.choiceSub, on && s.choiceTextOn]}>
                        {language !== "en"
                          ? localDigits(
                              life
                                .replace(/\bdays?\b/gi, t.shelfDaysUnit)
                                .replace(
                                  /\bstanding\b/gi,
                                  t.shelfStandingLabel,
                                ),
                            )
                          : life}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t.listingStepStock}</Text>
            <Input
              label={t.listingQuantityLabel}
              value={form.quantity}
              editable={!locked}
              keyboardType="decimal-pad"
              maxLength={40}
              placeholder={localDigits("0")}
              onChangeText={(value) => update("quantity", value)}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              accessibilityLabel={t.listingUnit}
              contentContainerStyle={s.units}
            >
              {units.map((unit) => {
                const on = unit === form.unit;
                return (
                  <Pressable
                    key={unit}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on, disabled: locked }}
                    disabled={locked}
                    onPress={() => update("unit", unit)}
                    style={({ pressed }) => [
                      s.unit,
                      on && s.choiceOn,
                      pressed && s.pressed,
                    ]}
                  >
                    <Text style={[s.choiceText, on && s.choiceTextOn]}>
                      {unitNames[unit] || unit}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={s.field}>
              <Text style={s.label}>{t.listingPrice}</Text>
              <View
                style={[
                  s.price,
                  priceFocused && s.priceFocused,
                  locked && s.dim,
                ]}
              >
                <Text style={s.rupee}>₹</Text>
                <TextInput
                  accessibilityLabel={t.listingPrice}
                  value={form.price}
                  editable={!locked}
                  keyboardType="decimal-pad"
                  maxLength={40}
                  placeholder={localDigits("0")}
                  placeholderTextColor={theme.colors.placeholder}
                  onFocus={() => setPriceFocused(true)}
                  onBlur={() => setPriceFocused(false)}
                  onChangeText={(value) => update("price", value)}
                  style={s.priceInput}
                />
                <Text numberOfLines={1} style={s.per}>
                  {formatMessage(t.listingPricePer, { unit: unitLabel })}
                </Text>
              </View>
            </View>
          </View>
          {(!!form.productId || !!editId) && (
            <View style={s.section}>
              <View>
                <Text style={s.sectionTitle}>{t.listingTagsTitle}</Text>
                <Text style={s.hint}>
                  {formatMessage(t.listingTagsHint, {
                    count: localDigits(String(MAX_LISTING_TAGS)),
                  })}
                </Text>
              </View>
              <View style={s.wrap}>
                {tagChoices.map((tag) => {
                  const on = form.tags.includes(tag);
                  const unavailable = locked || (!on && tagsFull);
                  return (
                    <Pressable
                      key={tag}
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: on,
                        disabled: unavailable,
                      }}
                      disabled={unavailable}
                      onPress={() => toggleTag(tag)}
                      style={({ pressed }) => [
                        s.tag,
                        on && s.choiceOn,
                        !on && tagsFull && s.dim,
                        pressed && s.pressed,
                      ]}
                    >
                      <Ionicons
                        accessible={false}
                        name={on ? "checkmark-circle" : "add"}
                        size={18}
                        color={on ? theme.colors.primary : theme.colors.steel}
                      />
                      <Text style={[s.choiceText, on && s.choiceTextOn]}>
                        {listingTagLabel(tag, language)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
          {failure && <ErrorMessage message={failure} />}
          {editId && conflict && !draft.editPending && (
            <Button
              secondary
              disabled={busy}
              onPress={() =>
                Alert.alert(t.reloadListing, t.reloadListingQuestion, [
                  { text: t.sellerNo, style: "cancel" },
                  {
                    text: t.sellerYes,
                    onPress: () => {
                      setReady(false);
                      void loadDraft(true);
                    },
                  },
                ])
              }
            >
              {t.reloadListing}
            </Button>
          )}
        </>
      )}
      <Modal
        visible={photoSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoSheet(false)}
      >
        <Pressable
          accessibilityLabel={t.cancel}
          style={s.sheetOverlay}
          onPress={() => setPhotoSheet(false)}
        >
          <Pressable accessibilityViewIsModal style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text accessibilityRole="header" style={s.sectionTitle}>
              {hasPhoto ? t.listingPhotoChange : t.listingPhotoAdd}
            </Text>
            <SheetAction
              icon="camera-outline"
              label={t.takeListingPhoto}
              onPress={() => pickPhoto("camera")}
            />
            <SheetAction
              icon="images-outline"
              label={t.chooseListingGallery}
              onPress={() => pickPhoto("gallery")}
            />
            {hasPhoto && (
              <SheetAction
                danger
                icon="trash-outline"
                label={t.removeListingPhoto}
                onPress={() => {
                  setPhotoSheet(false);
                  update("photo", "");
                }}
              />
            )}
            <Button ghost onPress={() => setPhotoSheet(false)}>
              {t.cancel}
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
const VOICE_HINTS = produceVoiceHints();
// Say the product instead of typing it: tap the mic, or hold it while speaking.
function DropdownVoice({ onText }: { onText: (text: string) => void }) {
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const voice = useVoiceSearch({
    language,
    scope: "add-product",
    hints: VOICE_HINTS,
    onResult: (transcript) => {
      const spoken = voiceProductSearch(transcript, language);
      if (spoken.text) onText(spoken.text);
    },
  });
  const note =
    voiceErrorText(t, voice.error) ?? voiceStatusText(t, voice.status);
  return (
    <View style={s.voice}>
      <VoiceMicButton
        status={voice.status}
        onStart={voice.start}
        onFinish={voice.finish}
        onCancel={voice.cancel}
        t={t}
        style={s.voiceButton}
      />
      {!!note && (
        <Text accessibilityLiveRegion="polite" style={s.voiceNote}>
          {note}
        </Text>
      )}
    </View>
  );
}
const UNITS = [
  "kg",
  "litre",
  "dozen",
  "bunch",
  "pieces",
  "ton",
  "bundle",
] as const;
function SheetAction({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.sheetRow, pressed && s.pressed]}
    >
      <View style={[s.sheetIcon, danger && s.sheetIconDanger]}>
        <Ionicons
          accessible={false}
          name={icon}
          size={22}
          color={danger ? theme.colors.error : theme.colors.steel}
        />
      </View>
      <Text style={[s.sheetText, danger && s.sheetTextDanger]}>{label}</Text>
    </Pressable>
  );
}
function ListingDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  placeholder,
  searchable = false,
  remoteSearch = false,
  searchTexts = {},
  searchPlaceholder,
  searchValue,
  onSearchChange,
  searchMessage,
  searchSuggestion,
  searchError = false,
  onSearchRetry,
  selectedLabel,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
  disabled: boolean;
  placeholder?: string;
  searchable?: boolean;
  remoteSearch?: boolean;
  searchTexts?: Record<string, string>;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchMessage?: string;
  searchSuggestion?: string | null;
  searchError?: boolean;
  onSearchRetry?: () => void;
  selectedLabel?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const selected =
    selectedLabel || options.find(([id]) => id === value)?.[1] || undefined;
  const currentSearch = searchValue ?? search;
  const visibleOptions = remoteSearch
    ? options
    : options.filter(([id, text]) =>
        matchesProductSearch(`${text} ${searchTexts[id] || ""}`, search),
      );
  const unavailable = disabled || (!searchable && !options.length);
  function close() {
    setOpen(false);
    if (searchable) {
      setSearch("");
      onSearchChange?.("");
    }
  }
  return (
    <>
      <DropdownField
        label={label}
        value={selected}
        placeholder={placeholder || label}
        disabled={unavailable}
        expanded={open}
        onPress={() => {
          setSearch("");
          onSearchChange?.("");
          setOpen(true);
        }}
      />
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={s.dropdownOverlay}>
          <View accessibilityViewIsModal style={s.dropdownSheet}>
            <Text accessibilityRole="header" style={s.label}>
              {label}
            </Text>
            {searchable && (
              <View style={s.searchRow}>
                <View style={s.searchField}>
                  <Input
                    label={searchPlaceholder || label}
                    value={currentSearch}
                    onChangeText={(value) => {
                      setSearch(value);
                      onSearchChange?.(value);
                    }}
                    maxLength={80}
                    autoCapitalize="none"
                  />
                </View>
                <DropdownVoice
                  onText={(text) => {
                    setSearch(text);
                    onSearchChange?.(text);
                  }}
                />
              </View>
            )}
            <ScrollView keyboardShouldPersistTaps="handled">
              {searchMessage &&
                (searchError ? (
                  <ErrorMessage message={searchMessage} />
                ) : (
                  <Text style={d.description}>{searchMessage}</Text>
                ))}
              {searchSuggestion ? (
                <Button
                  secondary
                  onPress={() => {
                    setSearch(searchSuggestion);
                    onSearchChange?.(searchSuggestion);
                  }}
                >
                  {formatMessage(t.productMasterDidYouMean, {
                    term: searchSuggestion,
                  })}
                </Button>
              ) : null}
              {searchError && onSearchRetry && (
                <Button secondary onPress={onSearchRetry}>
                  {t.retry}
                </Button>
              )}
              {!remoteSearch && !visibleOptions.length && (
                <Text style={d.description}>{t.productMasterNoMatches}</Text>
              )}
              {visibleOptions.map(([id, text]) => (
                <Pressable
                  key={id}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: id === value,
                    disabled: unavailable,
                  }}
                  disabled={unavailable}
                  onPress={() => {
                    onChange(id);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    s.dropdownOption,
                    id === value && s.selected,
                    pressed && s.pressed,
                  ]}
                >
                  <Text style={[s.optionText, { flex: 1 }]}>{text}</Text>
                  {id === value && (
                    <Ionicons
                      accessible={false}
                      name="checkmark"
                      size={22}
                      color={theme.colors.heading}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Button secondary onPress={close}>
              {t.cancel}
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  searchRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  searchField: { flex: 1, minWidth: 0 },
  voice: { alignItems: "center", gap: 2 },
  voiceButton: { width: 52, height: 52, borderRadius: 12 },
  voiceNote: { ...theme.type.micro, color: theme.colors.saffronText },
  // White cards group the form into three short steps.
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 14,
  },
  sectionTitle: { ...theme.type.heading, color: theme.colors.heading },
  label: { ...theme.type.label, color: theme.colors.text },
  hint: { ...theme.type.caption, color: theme.colors.muted },
  field: { gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  // Photo tile: the picture itself, or a dashed saffron prompt.
  photo: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: theme.radii.artwork,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceMuted,
  },
  photoEmpty: {
    backgroundColor: theme.colors.tint,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.saffronBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: { width: "100%", height: "100%" },
  photoPrompt: { alignItems: "center", gap: 6, padding: 16 },
  photoIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  photoTitle: { ...theme.type.subheading, color: theme.colors.saffronText },
  photoBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.overlay,
  },
  photoBadgeText: {
    ...theme.type.micro,
    color: theme.colors.onPrimary,
  },
  // Selectable pills shared by freshness, unit and tags.
  choice: {
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
  },
  choiceOn: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.tint,
  },
  choiceText: { ...theme.type.label, color: theme.colors.text },
  choiceSub: { ...theme.type.caption, color: theme.colors.muted },
  choiceTextOn: { color: theme.colors.saffronText },
  units: { gap: 8, paddingRight: 4 },
  unit: {
    minHeight: 44,
    minWidth: 56,
    paddingHorizontal: 14,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  price: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  priceFocused: { borderColor: theme.colors.focusBorder, borderWidth: 1.5 },
  rupee: { ...theme.type.heading, color: theme.colors.saffronText },
  priceInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  per: { ...theme.type.caption, color: theme.colors.muted, maxWidth: "45%" },
  dim: { opacity: theme.interaction.disabledOpacity },
  // Bottom sheet for the photo options.
  sheetOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radii.sheet,
    borderTopRightRadius: theme.radii.sheet,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 6,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    marginBottom: 8,
  },
  sheetRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 6,
  },
  sheetIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.steelTint,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetIconDanger: { backgroundColor: theme.colors.errorBackground },
  sheetText: { ...theme.type.subheading, color: theme.colors.text },
  sheetTextDanger: { color: theme.colors.error },
  // Product search sheet.
  dropdownOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "center",
    padding: 20,
  },
  dropdownSheet: {
    maxHeight: "80%",
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.sheet,
    padding: 20,
    gap: 16,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: theme.layout.touchTarget,
    padding: 14,
    borderRadius: theme.radii.control,
  },
  selected: {
    backgroundColor: theme.colors.tint,
    borderColor: theme.colors.primary,
  },
  optionText: { color: theme.colors.text, fontSize: 14, flexShrink: 1 },
  warning: {
    backgroundColor: theme.colors.warningBackground,
    color: theme.colors.warning,
    padding: 12,
    borderRadius: theme.radii.control,
    lineHeight: 23,
  },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
