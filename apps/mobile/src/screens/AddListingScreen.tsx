import { useEffect, useRef, useState } from "react";
import {
  Image,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { LISTING_ASSET_PHOTOS } from "@gaavli/constants";
import {
  mobileCategoriesSchema,
  mobileUserSchema,
  ownedListingSchema,
  listingIdSchema,
  productMasterPageSchema,
} from "@gaavli/validation";
import { useAppStore } from "../store";
import { showToast } from "../toast";
import { authenticatedApi, saveSession } from "../session";
import { ApiError } from "../api/client";
import { errorMessage } from "../errors";
import { messages } from "../i18n";
import { theme } from "../theme";
import {
  BackButton,
  Button,
  ErrorMessage,
  Input,
  DropdownField,
  Screen,
} from "../components/ui";
import { d } from "../components/dashboard/primitives";
import { ListingImage } from "../components/dashboard/ListingImage";
import { listingDraftStorage, productMasterCache } from "../storage/sqlite";
import {
  loadMasterProducts,
  matchesProductSearch,
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
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const parsed = listingIdSchema.safeParse(id);
  if (!session) return <Redirect href="/register" />;
  if (!session.user.village) return <Redirect href="/village" />;
  if (id !== undefined && !parsed.success)
    return (
      <Screen>
        <BackButton
          label={messages(language).back}
          onPress={() => router.replace("/my-listings")}
        />
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
  const key = `${accountId}:${villageId}${editId ? `:edit:${editId}` : ""}`;
  const categories = useQuery({
    queryKey: ["listing-categories", accountId],
    queryFn: ({ signal }) =>
      authenticatedApi("/categories", mobileCategoriesSchema, { signal }),
    retry: 1,
  });
  const products = useQuery({
    queryKey: ["product-master", accountId, offline],
    queryFn: () =>
      loadMasterProducts({
        storage: productMasterCache,
        offline,
        fetch: () =>
          authenticatedApi("/product-master", productMasterPageSchema),
      }),
    networkMode: "always",
    retry: false,
    refetchOnMount: "always",
  });
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
          if (
            row.villageId !== villageId ||
            row.status !== "active" ||
            (row.expiresAt && Date.parse(row.expiresAt) <= Date.now())
          )
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
  const category = categories.data?.categories.find(
    (item) => item.id === form.categoryId,
  );
  return (
    <Screen>
      <View style={s.header}>
        <BackButton
          label={t.back}
          disabled={busy}
          onPress={() => void leave()}
        />
        <Text accessibilityRole="header" style={d.sectionTitle}>
          {editId ? t.editListing : t.addListing}
        </Text>
      </View>
      <View style={s.panel}>
        <Text style={d.cardTitle}>
          {session?.user.village
            ? language === "mr"
              ? session.user.village.nameMr
              : session.user.village.name
            : ""}
        </Text>
        <Text style={d.description}>{t.listingVillageHelp}</Text>
      </View>
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
          <ListingDropdown
            label={t.listingProductName}
            value={form.productId || ""}
            disabled={locked}
            selectedLabel={
              form.productId
                ? (language === "mr"
                    ? form.productNameMr
                    : form.productNameEn) || form.name
                : form.name
            }
            searchable
            searchPlaceholder={t.productMasterSearch}
            searchTexts={Object.fromEntries(
              (products.data?.products || []).map((product) => [
                product.productId,
                `${product.nameMr} ${product.nameEn}`,
              ]),
            )}
            options={(products.data?.products || []).map(
              (product) =>
                [
                  product.productId,
                  language === "mr" ? product.nameMr : product.nameEn,
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
          {products.isPending && (
            <Text style={d.description}>{t.productMasterLoading}</Text>
          )}
          {products.isError && (
            <>
              <ErrorMessage message={t.productMasterUnavailable} />
              <Button secondary onPress={() => void products.refetch()}>
                {t.retry}
              </Button>
            </>
          )}
          {products.data?.cached && (
            <Text style={d.description}>{t.productMasterCached}</Text>
          )}
          {products.data && !products.data.products.length && (
            <Text style={d.description}>{t.productMasterEmpty}</Text>
          )}
          {editId && !form.productId && (
            <Text style={d.description}>{t.productMasterLegacy}</Text>
          )}
          <Text style={s.label}>{t.listingPhoto}</Text>
          <View style={s.photoRow}>
            <View style={s.photoSlot}>
              {form.localPhoto ? (
                <Image
                  source={{
                    uri: localListingPhotoUri(
                      form.localPhoto,
                      accountId,
                      villageId,
                    ),
                  }}
                  style={s.photoPreview}
                  resizeMode="contain"
                  accessibilityLabel={t.listingPhoto}
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
                  style={s.photoPreview}
                  resizeMode="contain"
                />
              )}
            </View>
            <View style={s.photoActions}>
              <Text style={d.description}>{t.listingPhotoHelp}</Text>
              <Button
                secondary
                disabled={locked}
                onPress={() => void choosePhonePhoto("camera")}
              >
                {t.takeListingPhoto}
              </Button>
              <Button
                secondary
                disabled={locked}
                onPress={() => void choosePhonePhoto("gallery")}
              >
                {t.chooseListingGallery}
              </Button>
            </View>
          </View>
          {editId && !form.productId ? (
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
          ) : null}
          {categories.isPending && (
            <Text style={d.description}>{t.listingsLoading}</Text>
          )}
          {categories.isError && (
            <>
              <ErrorMessage message={t.listingCategoryMissing} />
              <Button secondary onPress={() => void categories.refetch()}>
                {t.retry}
              </Button>
            </>
          )}
          <ListingDropdown
            label={t.listingCategory}
            value={form.categoryId}
            disabled={locked}
            placeholder={t.listingCategoryMissing}
            onChange={(value) => update("categoryId", value)}
            options={
              categories.data?.categories.map(
                (item) =>
                  [
                    item.id,
                    `${language === "mr" ? item.nameMr : item.name} (${language === "mr" ? item.defaultShelfLife.replace(/\bdays?\b/gi, "दिवस") : item.defaultShelfLife})`,
                  ] as const,
              ) ?? []
            }
          />
          <View style={s.quantityRow}>
            <View style={s.quantityField}>
              <Input
                label={t.listingQuantityLabel}
                value={form.quantity}
                editable={!locked}
                keyboardType="decimal-pad"
                maxLength={40}
                onChangeText={(value) => update("quantity", value)}
              />
            </View>
            <View style={s.unitField}>
              <ListingDropdown
                label={t.listingUnit}
                value={form.unit}
                disabled={locked}
                onChange={(value) => update("unit", value)}
                options={
                  [
                    ["kg", t.unitKg],
                    ["litre", t.unitLitre],
                    ["dozen", t.unitDozen],
                    ["bunch", t.unitBunch],
                    ["pieces", t.unitPieces],
                    ["piece", t.unitPieces],
                    ["ton", t.unitTon],
                    ["bundle", t.unitBundle],
                    ...(![
                      "kg",
                      "litre",
                      "dozen",
                      "bunch",
                      "pieces",
                      "piece",
                      "ton",
                      "bundle",
                    ].includes(form.unit)
                      ? [[form.unit, form.unit] as const]
                      : []),
                  ] as const
                }
              />
            </View>
          </View>
          <Input
            label={t.listingPrice}
            value={form.price}
            editable={!locked}
            keyboardType="decimal-pad"
            maxLength={40}
            onChangeText={(value) => update("price", value)}
          />
          <Input
            label={t.listingMinimum}
            value={form.minimum}
            editable={!locked}
            keyboardType="decimal-pad"
            maxLength={40}
            onChangeText={(value) => update("minimum", value)}
          />
          {category?.code === "RECURRING_SUPPLY" ? (
            <Text style={d.description}>{t.listingStanding}</Text>
          ) : (
            <Input
              label={t.listingDays}
              value={form.days}
              editable={!locked}
              keyboardType="number-pad"
              maxLength={3}
              onChangeText={(value) => update("days", value)}
            />
          )}
          <Text style={s.label}>{t.listingFulfillment}</Text>
          <View style={s.choices}>
            <Choice
              checkbox
              label={t.farmPickup}
              selected={form.farmPickup}
              disabled={locked}
              onPress={() => update("farmPickup", !form.farmPickup)}
            />
            <Choice
              checkbox
              label={t.localTransport}
              selected={form.localTransport}
              disabled={locked}
              onPress={() => update("localTransport", !form.localTransport)}
            />
          </View>
          <Input
            label={t.listingDescription}
            value={form.description}
            editable={!locked}
            multiline
            maxLength={2000}
            style={{ minHeight: 110, textAlignVertical: "top" }}
            onChangeText={(value) => update("description", value)}
          />
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
          <Button
            loading={busy}
            disabled={offline || !ready || saveFailed || conflict}
            onPress={() => void publish()}
          >
            {draft.pending || draft.editPending
              ? t.listingRetryPublish
              : editId
                ? t.saveListingChanges
                : t.listingPublish}
          </Button>
        </>
      )}
    </Screen>
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
  searchTexts = {},
  searchPlaceholder,
  selectedLabel,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
  disabled: boolean;
  placeholder?: string;
  searchable?: boolean;
  searchTexts?: Record<string, string>;
  searchPlaceholder?: string;
  selectedLabel?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const selected =
    selectedLabel || options.find(([id]) => id === value)?.[1] || undefined;
  const visibleOptions = options.filter(([id, text]) =>
    matchesProductSearch(`${text} ${searchTexts[id] || ""}`, search),
  );
  const unavailable = disabled || !options.length;
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
          setOpen(true);
        }}
      />
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.dropdownOverlay}>
          <View accessibilityViewIsModal style={s.dropdownSheet}>
            <Text accessibilityRole="header" style={s.label}>
              {label}
            </Text>
            {searchable && (
              <Input
                label={searchPlaceholder || label}
                value={search}
                onChangeText={setSearch}
                maxLength={100}
                autoCapitalize="none"
              />
            )}
            <ScrollView keyboardShouldPersistTaps="handled">
              {!visibleOptions.length && (
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
            <Button secondary onPress={() => setOpen(false)}>
              {t.cancel}
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}
function Choice({
  label,
  selected,
  disabled,
  onPress,
  checkbox = false,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  checkbox?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={checkbox ? "checkbox" : "radio"}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.choice,
        selected && s.selected,
        disabled && s.disabled,
        pressed && s.pressed,
      ]}
    >
      <Ionicons
        accessible={false}
        name={
          checkbox
            ? selected
              ? "checkbox"
              : "square-outline"
            : selected
              ? "radio-button-on"
              : "radio-button-off"
        }
        size={20}
        color={selected ? theme.colors.primary : theme.colors.muted}
      />
      <Text style={s.optionText}>{label}</Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  quantityRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  quantityField: { flex: 1.3, minWidth: 0 },
  unitField: { flex: 1, minWidth: 0 },
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
  panel: {
    backgroundColor: theme.colors.tint,
    borderRadius: theme.radii.card,
    padding: 16,
    gap: 8,
  },
  label: { fontSize: 16, fontWeight: "600", color: theme.colors.heading },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  choice: {
    minHeight: theme.layout.touchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surface,
    maxWidth: "100%",
  },
  selected: {
    backgroundColor: theme.colors.tint,
    borderColor: theme.colors.primary,
  },
  optionText: { color: theme.colors.text, fontSize: 14, flexShrink: 1 },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  photoSlot: { flex: 1, minWidth: 0 },
  photoPreview: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.tint,
  },
  photoActions: { flex: 1, minWidth: 0, gap: 8 },
  warning: {
    backgroundColor: theme.colors.warningBackground,
    color: theme.colors.warning,
    padding: 12,
    borderRadius: theme.radii.control,
    lineHeight: 23,
  },
  disabled: { opacity: theme.interaction.disabledOpacity },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
