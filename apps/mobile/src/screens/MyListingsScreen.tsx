import { useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { OwnedListing } from "@gaavli/types";
import { deletedListingSchema } from "@gaavli/validation";
import { useAppStore } from "../store";
import { useOwnListings } from "../listings";
import { formatMessage, messages } from "../i18n";
import { theme } from "../theme";
import { Button, ErrorMessage, OfflineBanner } from "../components/ui";
import { ListingImage } from "../components/dashboard/ListingImage";
import { listingUnit } from "../components/dashboard/listingText";
import { listingDraftStorage } from "../storage/sqlite";
import { listingOperationId, listingDraftSchema } from "../data/listingForm";
import { removeDraftPhoto } from "../storage/listingPhotos";
import {
  pendingListingDeleteSchema,
  savedProductDrafts,
  type PendingListingDelete,
} from "../data/ownedListings";
import { authenticatedApi } from "../session";
import { ApiError } from "../api/client";
import { errorMessage } from "../errors";
import { showToast } from "../toast";
import { useListingClock } from "../hooks/useListingClock";

export default function MyListingsScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const { session, language, offline } = useAppStore();
  const t = messages(language);
  const [tab, setTab] = useState<"active" | "sold_out" | "drafts">("active");
  const [menu, setMenu] = useState<OwnedListing | null>(null);
  const [target, setTarget] = useState<PendingListingDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const now = useListingClock();
  const query = useOwnListings(
    tab === "sold_out" ? "sold_out" : "active",
    tab !== "drafts",
  );
  const accountId = session?.user.id;
  const villageId = session?.user.village?.id;
  const deleteKey = `delete:${accountId}`;
  const pendingQuery = useQuery({
    queryKey: ["pending-listing-delete", accountId],
    networkMode: "always",
    enabled: !!accountId,
    queryFn: async () => {
      const raw = await listingDraftStorage.read(deleteKey);
      return raw ? pendingListingDeleteSchema.parse(JSON.parse(raw)) : null;
    },
    retry: false,
  });
  const drafts = useQuery({
    queryKey: ["saved-product-drafts", accountId, villageId],
    networkMode: "always",
    enabled: tab === "drafts" && !!accountId && !!villageId,
    refetchOnMount: "always",
    retry: false,
    queryFn: async () =>
      savedProductDrafts(
        await listingDraftStorage.list(`${accountId}:${villageId}`),
        accountId!,
        villageId!,
      ),
  });
  if (!session?.user.isSeller) return <Redirect href="/home" />;
  const allItems = query.data?.pages.flatMap((page) => page.listings) ?? [];
  const items = allItems.filter(
    (item) =>
      !deletedIds.includes(item.id) &&
      (tab !== "active" ||
        item.expiresAt === null ||
        Date.parse(item.expiresAt) > now),
  );
  const pending = pendingQuery.data;
  const ready = !!query.data && !query.isError;
  const add = () => router.push("/add-listing");
  const edit = (id: string) =>
    router.push({ pathname: "/add-listing", params: { id } });
  function closeDelete() {
    if (!submitting.current) setTarget(null);
  }
  async function confirmDelete() {
    if (
      !target ||
      submitting.current ||
      offline ||
      pendingQuery.isPending ||
      pendingQuery.isError
    )
      return;
    if (pending && pending.id !== target.id) {
      showToast(t.listingDeletePending, "error");
      return;
    }
    const operation = pending || target;
    submitting.current = true;
    setBusy(true);
    setFailure(null);
    let confirmed = false;
    try {
      await listingDraftStorage.write(deleteKey, JSON.stringify(operation));
      client.setQueryData(["pending-listing-delete", accountId], operation);
      if (useAppStore.getState().session?.user.id !== accountId)
        throw new ApiError("AUTH_REQUIRED", 401);
      await authenticatedApi(
        `/listings/${operation.id}`,
        deletedListingSchema,
        {
          method: "DELETE",
          headers: { "Idempotency-Key": operation.key },
          body: JSON.stringify({ version: operation.version }),
        },
      );
      confirmed = true;
      if (useAppStore.getState().session?.user.id !== accountId) return;
      setDeletedIds((ids) => [...ids, operation.id]);
      const draftVillage = operation.villageId || villageId;
      if (draftVillage && accountId) {
        const editKey = `${accountId}:${draftVillage}:edit:${operation.id}`;
        const raw = await listingDraftStorage.read(editKey);
        if (raw) {
          let photo = null;
          try {
            photo = listingDraftSchema.parse(JSON.parse(raw)).form.localPhoto;
          } catch {
            /* Only this deleted product's draft is removed. */
          }
          await listingDraftStorage.remove(editKey);
          await removeDraftPhoto(photo, accountId, draftVillage).catch(
            () => undefined,
          );
        }
      }
      await listingDraftStorage.remove(deleteKey);
      client.setQueryData(["pending-listing-delete", accountId], null);
      setTarget(null);
      void client.invalidateQueries({ queryKey: ["own-listings"] });
      void client.invalidateQueries({ queryKey: ["home-listings"] });
      void client.invalidateQueries({ queryKey: ["marketplace-listings"] });
      void client.invalidateQueries({ queryKey: ["listing"] });
      void client.invalidateQueries({ queryKey: ["saved-product-drafts"] });
      showToast(t.listingDeletedSuccess, "success");
    } catch (error) {
      if (useAppStore.getState().session?.user.id !== accountId) return;
      if (
        !confirmed &&
        error instanceof ApiError &&
        error.status &&
        error.status >= 400 &&
        error.status < 500 &&
        ![401, 408, 429].includes(error.status)
      ) {
        try {
          await listingDraftStorage.remove(deleteKey);
          client.setQueryData(["pending-listing-delete", accountId], null);
        } catch {
          /* keep the original retry snapshot */
        }
        if (error.code === "STALE_VERSION") {
          setTarget(null);
          void query.refetch();
        }
      }
      const message = confirmed
        ? t.listingDeleteFollowupError
        : errorMessage(error, language);
      setFailure(message);
      showToast(message, "error");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const errors = (
    <>
      {failure && <ErrorMessage message={failure} />}
      {pendingQuery.isError && (
        <>
          <ErrorMessage message={t.genericError} />
          <Button secondary onPress={() => void pendingQuery.refetch()}>
            {t.retry}
          </Button>
        </>
      )}
      {pending && (
        <View style={s.notice}>
          <Text style={s.muted}>{t.listingDeletePending}</Text>
          <Button
            secondary
            disabled={busy || offline}
            onPress={() => {
              setFailure(null);
              setTarget(pending);
            }}
          >
            {t.retry}
          </Button>
        </View>
      )}
      {tab !== "drafts" && query.isError && (
        <>
          <ErrorMessage message={t.ownListingsFailed} />
          <Button secondary onPress={() => void query.refetch()}>
            {t.retry}
          </Button>
        </>
      )}
    </>
  );
  const empty = (
    <View style={s.empty}>
      {!ready ? (
        <Text style={s.muted}>
          {offline
            ? t.listingsOfflineEmpty
            : query.isPending
              ? t.listingsLoading
              : t.ownListingsFailed}
        </Text>
      ) : tab === "sold_out" ? (
        <Text style={s.muted}>{t.noSoldProducts}</Text>
      ) : (
        <>
          <View style={s.art}>
            <Text accessible={false} style={s.sprout}>
              🌱
            </Text>
          </View>
          <Text accessibilityRole="header" style={s.emptyTitle}>
            {t.firstProductTitle}
          </Text>
          <Text style={s.muted}>{t.firstProductDescription}</Text>
          <View style={{ width: "100%" }}>
            <Button onPress={add}>{t.firstProductButton}</Button>
          </View>
        </>
      )}
    </View>
  );
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.safe}>
      {offline && <OfflineBanner message={t.offline} />}
      <View style={s.top}>
        <Text accessibilityRole="header" style={s.heading}>
          {t.myProducts}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.marketplace}
          onPress={() => router.push("/marketplace")}
          style={s.iconButton}
        >
          <Ionicons
            name="storefront-outline"
            size={22}
            color={theme.colors.heading}
          />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={add} style={s.addButton}>
          <Ionicons name="add" size={20} color={theme.colors.onPrimary} />
          <Text style={s.addText}>{t.newProduct}</Text>
        </Pressable>
      </View>
      <View style={s.tabs}>
        {(
          [
            ["active", t.activeProducts],
            ["sold_out", t.soldProducts],
            ["drafts", t.savedProducts],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            onPress={() => {
              setTab(value);
              setFailure(null);
              if (value === "drafts") void drafts.refetch();
            }}
            style={[s.tab, tab === value && s.selected]}
          >
            <Text style={s.tabText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {tab === "drafts" ? (
        <ScrollView contentContainerStyle={s.content}>
          {errors}
          {drafts.isPending && (
            <Text style={s.muted}>{t.listingDraftLoading}</Text>
          )}
          {drafts.isError && (
            <>
              <ErrorMessage message={t.listingDraftFailed} />
              <Button secondary onPress={() => void drafts.refetch()}>
                {t.retry}
              </Button>
            </>
          )}
          {drafts.data?.map(({ key, draft }) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${t.openDraft}: ${draft.form.name || t.untitledDraft}`}
              onPress={() => (draft.editBase ? edit(draft.editBase.id) : add())}
              style={s.card}
            >
              <View style={s.info}>
                <Text style={s.productTitle}>
                  {draft.form.name || t.untitledDraft}
                </Text>
                <Text style={s.muted}>
                  {draft.editBase ? t.editListing : t.openDraft}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={theme.colors.muted}
              />
            </Pressable>
          ))}
          {drafts.data && !drafts.isError && !drafts.data.length && (
            <Text style={s.muted}>{t.noSavedProducts}</Text>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.content}
          ListHeaderComponent={errors}
          ListEmptyComponent={empty}
          renderItem={({ item }) => (
            <View style={s.card}>
              <ListingImage
                listing={{ photoUrl: item.photoUrl, image: null }}
                style={s.image}
              />
              <View style={s.info}>
                <Text style={s.productTitle}>
                  {language === "mr"
                    ? item.productNameMr || item.productName
                    : item.productName}
                </Text>
                <Text style={s.rate}>
                  {item.price === null
                    ? t.rateNotProvided
                    : `₹${new Intl.NumberFormat(language === "mr" ? "mr-IN" : "en-IN").format(item.price)} / ${listingUnit(item.unit, language)}`}
                </Text>
                <Text style={s.quantity}>
                  {item.quantity === null
                    ? t.quantityNotProvided
                    : formatMessage(t.quantityAvailable, {
                        quantity: new Intl.NumberFormat(
                          language === "mr" ? "mr-IN" : "en-IN",
                        ).format(item.quantity),
                        unit: listingUnit(item.unit, language),
                      })}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t.listingActions}: ${language === "mr" ? item.productNameMr || item.productName : item.productName}`}
                disabled={busy}
                onPress={() => {
                  setFailure(null);
                  setMenu(item);
                }}
                style={s.more}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={21}
                  color={theme.colors.muted}
                />
              </Pressable>
            </View>
          )}
          ListFooterComponent={
            query.hasNextPage ? (
              <Button
                secondary
                loading={query.isFetchingNextPage}
                onPress={() => void query.fetchNextPage()}
              >
                {t.loadMore}
              </Button>
            ) : null
          }
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => void query.refetch()}
        />
      )}
      <Modal
        visible={!!menu}
        transparent
        animationType="fade"
        onRequestClose={() => setMenu(null)}
      >
        <View style={s.overlay}>
          <View accessibilityViewIsModal style={s.dialog}>
            <Text accessibilityRole="header" style={s.heading}>
              {t.listingActions}
            </Text>
            <Button
              secondary
              disabled={
                !menu ||
                menu.status !== "active" ||
                menu.villageId !== villageId ||
                !!(menu.expiresAt && Date.parse(menu.expiresAt) <= now)
              }
              onPress={() => {
                if (menu) {
                  edit(menu.id);
                  setMenu(null);
                }
              }}
            >
              {t.editListing}
            </Button>
            <Button
              secondary
              disabled={
                pendingQuery.isPending ||
                pendingQuery.isError ||
                !!(pending && pending.id !== menu?.id)
              }
              onPress={() => {
                if (menu) {
                  setTarget(
                    pending || {
                      id: menu.id,
                      version: menu.version,
                      villageId: menu.villageId,
                      key: listingOperationId(),
                    },
                  );
                  setMenu(null);
                }
              }}
            >
              {t.deleteListing}
            </Button>
            <Button secondary onPress={() => setMenu(null)}>
              {t.cancel}
            </Button>
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!target}
        transparent
        animationType="fade"
        onRequestClose={closeDelete}
      >
        <View style={s.overlay}>
          <View accessibilityViewIsModal style={s.dialog}>
            <Text accessibilityRole="header" style={s.heading}>
              {t.deleteListingQuestion}
            </Text>
            {failure && <ErrorMessage message={failure} />}
            {offline && <Text style={s.muted}>{t.offline}</Text>}
            <View style={s.confirmActions}>
              <View style={{ flex: 1 }}>
                <Button secondary disabled={busy} onPress={closeDelete}>
                  {t.sellerNo}
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  disabled={
                    offline || pendingQuery.isPending || pendingQuery.isError
                  }
                  loading={busy}
                  onPress={() => void confirmDelete()}
                >
                  {t.sellerYes}
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  top: {
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  heading: {
    flexShrink: 1,
    fontSize: 19,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  iconButton: {
    marginLeft: "auto",
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.tint,
    borderRadius: theme.radii.pill,
  },
  addButton: {
    minHeight: theme.layout.touchTarget,
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.control,
    paddingHorizontal: 12,
  },
  addText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.onPrimary,
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
  },
  tab: {
    minHeight: theme.layout.touchTarget,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  selected: {
    backgroundColor: theme.colors.tint,
    borderColor: theme.colors.primary,
  },
  tabText: { color: theme.colors.text, fontSize: 14 },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 6,
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
  },
  image: {
    width: 58,
    height: 58,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.tint,
  },
  info: { flex: 1, gap: 4 },
  productTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  rate: { color: theme.colors.heading, fontSize: 16, fontWeight: "700" },
  quantity: { color: theme.colors.muted, fontSize: 13, lineHeight: 19 },
  more: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { fontSize: 14, lineHeight: 22, color: theme.colors.muted },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingVertical: 60,
  },
  art: {
    width: 106,
    height: 106,
    borderRadius: 53,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.tint,
  },
  sprout: { fontSize: 56 },
  emptyTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: theme.colors.heading,
    textAlign: "center",
  },
  overlay: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: theme.colors.overlay,
  },
  dialog: {
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.sheet,
    padding: 24,
    gap: 16,
  },
  confirmActions: { flexDirection: "row", gap: 12 },
  notice: {
    gap: 10,
    padding: 12,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.warningBackground,
  },
});
