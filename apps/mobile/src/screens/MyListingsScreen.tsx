import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { OwnedListing } from "@gaavli/types";
import { deletedListingSchema, ownedListingSchema } from "@gaavli/validation";
import { useAppStore } from "../store";
import { useOwnListings } from "../listings";
import { messages } from "../i18n";
import { theme } from "../theme";
import {
  BackButton,
  Button,
  ErrorMessage,
  OfflineBanner,
} from "../components/ui";
import { matchesProductSearch } from "../data/productMaster";
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
  const [tab, setTab] = useState<
    "all" | "active" | "sold_out" | "drafts" | "expired"
  >("all");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);
  const [menu, setMenu] = useState<OwnedListing | null>(null);
  const [target, setTarget] = useState<PendingListingDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const submitting = useRef(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const now = useListingClock();
  const query = useOwnListings(tab === "drafts" ? "all" : tab, true, search);
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
    enabled: !!accountId && !!villageId,
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
  const summary = query.data?.pages[0]?.summary;
  const number = new Intl.NumberFormat(
    language === "mr" ? "mr-IN-u-nu-deva" : "en-IN",
  );
  const count = (value: number | undefined) =>
    value === undefined ? "—" : number.format(value);
  const matchingDrafts = drafts.data?.filter(({ draft }) =>
    matchesProductSearch(
      `${draft.form.name} ${draft.form.productNameEn || ""} ${draft.form.productNameMr || ""}`,
      search,
    ),
  );
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
  async function markSold(item: OwnedListing) {
    if (submitting.current || offline || !accountId) return;
    submitting.current = true;
    setSellingId(item.id);
    setFailure(null);
    try {
      if (useAppStore.getState().session?.user.id !== accountId)
        throw new ApiError("AUTH_REQUIRED", 401);
      await authenticatedApi(
        `/listings/${item.id}/sold-out`,
        ownedListingSchema,
        {
          method: "POST",
          headers: { "Idempotency-Key": listingOperationId() },
          body: JSON.stringify({ version: item.version }),
        },
      );
      void client.invalidateQueries({ queryKey: ["own-listings"] });
      void client.invalidateQueries({ queryKey: ["home-listings"] });
      void client.invalidateQueries({ queryKey: ["marketplace-listings"] });
      void client.invalidateQueries({ queryKey: ["listing"] });
      showToast(t.markedSoldSuccess, "success");
    } catch (error) {
      if (useAppStore.getState().session?.user.id !== accountId) return;
      const message = errorMessage(error, language);
      setFailure(message);
      showToast(message, "error");
    } finally {
      submitting.current = false;
      setSellingId(null);
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
      ) : search ? (
        <Text style={s.muted}>{t.noListingMatches}</Text>
      ) : tab === "expired" ? (
        <Text style={s.muted}>{t.noExpiredProducts}</Text>
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
      <View style={s.banner}>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={s.headerArt}
        >
          <Image
            source={require("../../assets/seller-products-header.png")}
            style={s.sceneImage}
            resizeMode="cover"
          />
        </View>
        <View style={s.headerRow}>
          <BackButton label={t.back} onPress={() => router.replace("/home")} />
          <View style={s.headerCopy}>
            <Text accessibilityRole="header" style={s.headerTitle}>
              {t.myProducts}
            </Text>
            <Text style={s.headerSubtitle}>{t.manageProductsSubtitle}</Text>
          </View>
        </View>
      </View>
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons
            name="search-outline"
            size={21}
            color={theme.colors.muted}
          />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder={t.sellerProductSearch}
            accessibilityLabel={t.sellerProductSearch}
            placeholderTextColor={theme.colors.placeholder}
            style={s.searchInput}
            maxLength={100}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {!!searchText && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.clearProductSearch}
              onPress={() => setSearchText("")}
              style={s.clearSearch}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.muted}
              />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.voiceSearch}
            accessibilityHint={t.voiceSearchUnavailable}
            onPress={() => Alert.alert(t.voiceSearch, t.voiceSearchUnavailable)}
            style={s.voiceSearch}
          >
            <Ionicons
              name="mic-outline"
              size={22}
              color={theme.colors.primary}
            />
          </Pressable>
        </View>
      </View>
      <View style={s.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabs}
        >
          {(
            [
              ["all", t.allProducts, summary?.total],
              ["active", t.activeProducts, summary?.active],
              ["drafts", t.savedProducts, drafts.data?.length],
              ["expired", t.expiredProducts, summary?.expired],
              ["sold_out", t.soldProducts, summary?.soldOut],
            ] as const
          ).map(([value, label, total]) => (
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
              <Text style={[s.tabText, tab === value && s.selectedText]}>
                {label} ({count(total)})
              </Text>
            </Pressable>
          ))}
        </ScrollView>
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
          {matchingDrafts?.map(({ key, draft }) => (
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
          {matchingDrafts && !drafts.isError && !matchingDrafts.length && (
            <Text style={s.muted}>
              {search ? t.noListingMatches : t.noSavedProducts}
            </Text>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.content}
          ListHeaderComponent={errors}
          ListEmptyComponent={empty}
          renderItem={({ item }) => {
            const expired =
              item.status === "expired" ||
              (item.status === "active" &&
                !!item.expiresAt &&
                Date.parse(item.expiresAt) <= now);
            const statusLabel = expired
              ? t.expiredProducts
              : item.status === "sold_out"
                ? t.soldProducts
                : item.status === "active"
                  ? t.activeProducts
                  : null;
            const canMarkSold = item.status === "active" && !expired;
            const name =
              language === "mr"
                ? item.productNameMr || item.productName
                : item.productName;
            return (
              <View style={s.card}>
                <ListingImage
                  listing={{ photoUrl: item.photoUrl, image: null }}
                  style={s.image}
                />
                <View style={s.info}>
                  <Text style={s.productTitle} numberOfLines={2}>
                    {name}
                  </Text>
                  <Text style={s.rate} numberOfLines={1}>
                    {item.price === null
                      ? t.rateNotProvided
                      : `₹${new Intl.NumberFormat(language === "mr" ? "mr-IN" : "en-IN").format(item.price)} / ${listingUnit(item.unit, language)}`}
                  </Text>
                </View>
                <View style={s.actions}>
                  <View style={s.actionRow}>
                    {statusLabel && (
                      <View
                        style={[
                          s.statusPill,
                          expired
                            ? s.statusExpired
                            : item.status === "sold_out"
                              ? s.statusSold
                              : s.statusActive,
                        ]}
                      >
                        <View
                          style={[
                            s.statusDot,
                            expired
                              ? s.dotExpired
                              : item.status === "sold_out"
                                ? s.dotSold
                                : s.dotActive,
                          ]}
                        />
                        <Text
                          numberOfLines={1}
                          style={[
                            s.statusText,
                            expired
                              ? s.statusTextExpired
                              : item.status === "sold_out"
                                ? s.statusTextSold
                                : s.statusTextActive,
                          ]}
                        >
                          {statusLabel}
                        </Text>
                      </View>
                    )}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${t.listingActions}: ${name}`}
                      disabled={busy || sellingId === item.id}
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
                  {canMarkSold && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: offline || busy || !!sellingId,
                        busy: sellingId === item.id,
                      }}
                      disabled={offline || busy || !!sellingId}
                      onPress={() =>
                        Alert.alert(t.markAsSold, t.markAsSoldQuestion, [
                          { text: t.cancel, style: "cancel" },
                          {
                            text: t.markAsSold,
                            onPress: () => void markSold(item),
                          },
                        ])
                      }
                      style={({ pressed }) => [
                        s.soldButton,
                        (offline || busy || !!sellingId) && s.soldDisabled,
                        pressed && s.soldPressed,
                      ]}
                    >
                      <Ionicons
                        name="cart-outline"
                        size={16}
                        color={theme.colors.onPrimary}
                      />
                      <Text style={s.soldText} numberOfLines={1}>{t.markAsSold}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
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
      <View style={s.top}>
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
  banner: {
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
    minHeight: 84,
    backgroundColor: theme.colors.background,
    borderBottomLeftRadius: theme.radii.card,
    borderBottomRightRadius: theme.radii.card,
    overflow: "hidden",
    paddingVertical: 6,
    paddingLeft: 4,
    paddingRight: 110,
    justifyContent: "center",
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  headerCopy: { flex: 1, minWidth: 0, gap: 2 },
  headerTitle: {
    fontSize: 22,
    lineHeight: 34,
    fontWeight: "700",
    color: theme.colors.heading,
    includeFontPadding: true,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 21,
    color: theme.colors.muted,
  },
  headerArt: {
    position: "absolute",
    width: 190,
    height: 92,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  sceneImage: {
    position: "absolute",
    width: 260,
    height: 173,
    right: -20,
    bottom: -20,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  searchBox: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
  },
  clearSearch: {
    minWidth: 40,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceSearch: {
    minWidth: theme.layout.touchTarget,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
  },
  tabsContainer: { flexShrink: 0 },
  selectedText: { color: theme.colors.surface, fontWeight: "600" },
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
    lineHeight: 30,
    includeFontPadding: true,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  iconButton: {
    marginLeft: "auto",
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accentBackground,
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    backgroundColor: theme.illustration.tree,
    borderColor: theme.illustration.tree,
  },
  tabText: {
    color: theme.colors.text,
    fontSize: 14,
    includeFontPadding: true,
    paddingVertical: 2,
  },
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
    width: 64,
    height: 64,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.tint,
  },
  info: { flex: 1, minWidth: 0, gap: 4 },
  productTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  rate: { color: theme.colors.heading, fontSize: 16, fontWeight: "700" },
  actions: { alignItems: "flex-end", gap: 8, maxWidth: "46%" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  statusPill: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
  },
  statusActive: { backgroundColor: theme.colors.tint },
  statusExpired: { backgroundColor: theme.colors.warningBackground },
  statusSold: { backgroundColor: theme.colors.accentBackground },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: theme.colors.primary },
  dotExpired: { backgroundColor: theme.colors.warning },
  dotSold: { backgroundColor: theme.colors.accent },
  statusText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  statusTextActive: { color: theme.colors.heading },
  statusTextExpired: { color: theme.colors.warning },
  statusTextSold: { color: theme.colors.heading },
  soldButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.primary,
  },
  soldDisabled: { opacity: theme.interaction.disabledOpacity },
  soldPressed: { opacity: theme.interaction.pressedOpacity },
  soldText: {
    flexShrink: 1,
    color: theme.colors.onPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  more: {
    minWidth: 32,
    minHeight: 32,
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
