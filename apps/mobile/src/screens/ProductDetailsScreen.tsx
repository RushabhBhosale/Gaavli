import { useCallback, useEffect, useRef, useState } from "react";
import {
  Linking,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useAppStore } from "../store";
import { showGuestSignUpPrompt } from "../components/guestSignUpPrompt";
import { formatMessage, messages } from "../i18n";
import {
  listingIdSchema,
  sellerContactSchema,
  sellerDetailsSchema,
  notifySellerResultSchema,
} from "@gaavli/validation";
import {
  sendSellerNotification,
  parseSavedSellerNotification,
  sellerNotificationStorageKey,
  prepareSellerRequest,
  type PendingSellerNotification,
} from "../data/notifySeller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listingDraftStorage } from "../storage/sqlite";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedApi } from "../session";
import { errorMessage } from "../errors";
import { toHomeListing } from "../data/listings";
import { useListing } from "../listings";
import { useListingClock } from "../hooks/useListingClock";
import { ApiError } from "../api/client";
import { listingName } from "../types/home";
import { theme } from "../theme";
import { Button, ErrorMessage, Input, Screen } from "../components/ui";
import { Badge, Panel, d } from "../components/dashboard/primitives";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { ListingImage } from "../components/dashboard/ListingImage";
import {
  listingPosted,
  listingRate,
  listingQuantity,
  listingUnit,
} from "../components/dashboard/listingText";

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAppStore((state) => state.session);
  return (
    <ProductDetailsContent
      key={`${session?.user.id}:${session?.user.village?.id}:${id}`}
      id={id}
    />
  );
}

function ProductDetailsContent({ id }: { id: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const { language, offline, session } = useAppStore();
  const mounted = useRef(true);
  const submitting = useRef(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [notifyModal, setNotifyModal] = useState<"confirm" | "success" | null>(
    null,
  );
  const [notifySummary, setNotifySummary] = useState({
    seller: "",
    product: "",
  });
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [requestQuantity, setRequestQuantity] = useState("");
  const [notifyPending, setNotifyPending] =
    useState<PendingSellerNotification | null>(null);
  const [notifyReady, setNotifyReady] = useState(false);
  const notifying = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      // The product can stay mounted behind registration while the session changes.
      if (
        session?.user.village &&
        useAppStore.getState().contactReturnListingId === id
      )
        useAppStore.getState().setContactReturn(null);
    }, [session?.user.village, id]),
  );
  const t = messages(language);
  const query = useListing(id);
  const now = useListingClock();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 340 || fontScale > 1.2;
  const invalid = !listingIdSchema.safeParse(id).success;
  const unavailable =
    invalid ||
    (query.error instanceof ApiError && query.error.status === 404) ||
    (query.data?.expiresAt && Date.parse(query.data.expiresAt) <= now);
  const listing =
    query.data && !unavailable ? toHomeListing(query.data, now) : null;
  const quantityValue = (quantity: number) =>
    `${new Intl.NumberFormat(language === "mr" ? "mr-IN" : "en-IN").format(quantity)} ${listingUnit(listing?.unit ?? null, language)}`.trim();
  const contactKey = [
    "seller-contact",
    session?.user.id,
    session?.user.village?.id,
    id,
  ];
  const restoredContact = useQuery({
    queryKey: contactKey,
    enabled: !!session?.user.village && !!listing && !offline,
    queryFn: ({ signal }) =>
      authenticatedApi(`/listings/${id}/contact`, sellerDetailsSchema, {
        signal,
      }),
    gcTime: 0,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });
  const savedContact = restoredContact.data;
  const denied =
    restoredContact.error instanceof ApiError &&
    [401, 403, 404, 422].includes(restoredContact.error.status ?? 0);
  const seller = listing && !denied ? savedContact?.seller || null : null;
  async function revealContact(call: boolean) {
    if (submitting.current || offline || !listing || invalid) return;
    submitting.current = true;
    setContactBusy(true);
    setContactError(null);
    const accountId = session?.user.id;
    const villageId = session?.user.village?.id;
    const isCurrent = () =>
      mounted.current &&
      useAppStore.getState().session?.user.id === accountId &&
      useAppStore.getState().session?.user.village?.id === villageId;
    let revealed = false;
    try {
      const data = await authenticatedApi(
        `/listings/${id}/interested`,
        sellerContactSchema,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      if (!isCurrent() || data.listingId !== id) return;
      await client.cancelQueries({ queryKey: contactKey });
      if (!isCurrent()) return;
      client.setQueryData(contactKey, data);
      revealed = true;
      if (call) await Linking.openURL(`tel:${data.seller.mobile}`);
    } catch (error) {
      if (isCurrent()) {
        // Keep already revealed details through dialer returns and network failures.
        if (
          !revealed &&
          error instanceof ApiError &&
          [401, 403, 404, 422].includes(error.status ?? 0)
        ) {
          void client.resetQueries({ queryKey: contactKey, exact: true });
          void query.refetch();
        }
        setContactError(revealed ? t.callError : errorMessage(error, language));
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setContactBusy(false);
    }
  }
  async function openNotify() {
    if (!seller || !listing || !session || notifying.current) return;
    const accountId = session.user.id;
    setNotifySummary({
      seller: seller.name,
      product: listingName(listing, language),
    });
    setNotifyError(null);
    setNotifyReady(false);
    setNotifyModal("confirm");
    try {
      const raw = await listingDraftStorage.read(
        sellerNotificationStorageKey(accountId, id),
      );
      if (
        !mounted.current ||
        useAppStore.getState().session?.user.id !== accountId
      )
        return;
      const pending = raw ? parseSavedSellerNotification(raw) : null;
      setNotifyPending(pending);
      setRequestQuantity(
        pending?.body.quantity !== undefined
          ? String(pending.body.quantity)
          : "",
      );
      setNotifyReady(true);
    } catch (error) {
      if (mounted.current) setNotifyError(errorMessage(error, language));
    }
  }
  async function notifySeller() {
    if (
      notifying.current ||
      offline ||
      !seller ||
      !listing ||
      !session ||
      !notifyReady
    )
      return;
    let body: PendingSellerNotification["body"];
    try {
      if (!notifyPending && !listing.unit)
        throw new Error("REQUEST_QUANTITY_INVALID");
      body =
        notifyPending?.body ||
        prepareSellerRequest(
          requestQuantity,
          query.data?.quantity ?? null,
          listing.minimumPurchaseQuantity ?? null,
        );
    } catch {
      setNotifyError(t.requestQuantityError);
      return;
    }
    notifying.current = true;
    setNotifyBusy(true);
    setNotifyError(null);
    const accountId = session.user.id;
    const villageId = session.user.village?.id;
    const isCurrent = () =>
      mounted.current &&
      useAppStore.getState().session?.user.id === accountId &&
      useAppStore.getState().session?.user.village?.id === villageId;
    try {
      // Notify is an explicit interest action; merely opening details is not.
      await authenticatedApi(
        `/listings/${id}/interested`,
        sellerContactSchema,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      if (!isCurrent()) return;
      const result = await sendSellerNotification({
        accountId,
        listingId: id,
        storage: listingDraftStorage,
        isCurrent,
        body,
        onStaged: (pending) => {
          if (isCurrent()) setNotifyPending(pending);
        },
        send: (key, stagedBody) =>
          authenticatedApi(
            `/listings/${id}/notify-farmer`,
            notifySellerResultSchema,
            {
              method: "POST",
              headers: { "Idempotency-Key": key },
              body: JSON.stringify(stagedBody),
            },
          ),
      });
      if (!result || !isCurrent()) return;
      setNotifyModal("success");
      setNotifyPending(null);
      void client.invalidateQueries({ queryKey: ["notifications"] });
      void client.invalidateQueries({ queryKey: ["notification-unread"] });
      void client.invalidateQueries({ queryKey: ["activity-requests"] });
    } catch (error) {
      if (isCurrent()) {
        if (
          error instanceof ApiError &&
          [401, 403, 404, 422].includes(error.status ?? 0)
        ) {
          void client.resetQueries({ queryKey: contactKey, exact: true });
          void query.refetch();
        }
        if (
          error instanceof ApiError &&
          error.status &&
          error.status >= 400 &&
          error.status < 500 &&
          ![401, 408, 429].includes(error.status)
        ) {
          try {
            await listingDraftStorage.remove(
              sellerNotificationStorageKey(accountId, id),
            );
            if (isCurrent()) setNotifyPending(null);
          } catch {
            /* Retain the exact staged request. */
          }
        }
        if (isCurrent())
          setNotifyError(
            error instanceof Error &&
              error.message === "REQUEST_PENDING_CHANGED"
              ? t.requestPendingMessage
              : errorMessage(error, language),
          );
      }
    } finally {
      notifying.current = false;
      if (mounted.current) setNotifyBusy(false);
    }
  }
  return (
    <ProtectedPage allowGuest>
      <Screen>
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.back}
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/marketplace")
            }
            style={({ pressed }) => [s.back, pressed && d.pressed]}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </Pressable>
          <Text accessibilityRole="header" style={s.title}>
            {t.productDetails}
          </Text>
        </View>
        {offline && (
          <Text style={d.description}>
            {listing ? t.listingsOffline : t.listingsOfflineEmpty}
          </Text>
        )}
        {!offline && query.isPending && !invalid && (
          <Text style={d.description}>{t.listingsLoading}</Text>
        )}
        {query.isError && !unavailable && !offline && (
          <>
            <ErrorMessage message={t.listingsFailed} />
            <Button secondary onPress={() => void query.refetch()}>
              {t.retry}
            </Button>
          </>
        )}
        {listing ? (
          <>
            <View style={s.productSection}>
              <ListingImage
                listing={listing}
                style={s.image}
                resizeMode="cover"
              />
              <Text accessibilityRole="header" style={s.name}>
                {listingName(listing, language)}
              </Text>
              <View style={s.priceBadge}>
                <Text style={s.price}>{listingRate(listing, language)}</Text>
              </View>
              {listing.isDemo && (
                <>
                  <Badge yellow>{t.demoListing}</Badge>
                  <Text style={d.description}>{t.demoListingDescription}</Text>
                </>
              )}
              <View style={s.details}>
                {[
                  [
                    t.availableQuantityLabel,
                    listing.availableQuantity === null
                      ? t.detailsNotProvided
                      : quantityValue(listing.availableQuantity),
                  ],
                  [
                    t.villageLabel,
                    language === "mr" ? listing.villageMr : listing.village,
                  ],
                  [t.postedLabel, listingPosted(listing, language)],
                ].map(([label, value]) => (
                  <View key={label} style={[s.detailRow, stacked && s.stacked]}>
                    <Text style={[s.detailLabel, stacked && s.stackedColumn]}>
                      {label}
                    </Text>
                    <Text style={[s.detailValue, stacked && s.stackedColumn]}>
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={s.descriptionSection}>
                <Text accessibilityRole="header" style={s.descriptionTitle}>
                  {t.productDescriptionLabel}
                </Text>
                <Text style={d.description}>
                  {listing.description || t.detailsNotProvided}
                </Text>
              </View>
            </View>
            <Panel style={s.seller}>
              <Text accessibilityRole="header" style={s.descriptionTitle}>
                {t.sellerInformation}
              </Text>
              <View style={s.sellerRow}>
                <View style={s.avatar}>
                  <Ionicons
                    name="person-outline"
                    size={26}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={s.sellerCopy}>
                  <Text style={s.sellerName}>
                    {seller ? seller.name : t.contactProtected}
                  </Text>
                  <View style={s.villageRow}>
                    <Ionicons
                      name="location-outline"
                      size={15}
                      color={theme.colors.muted}
                    />
                    <Text style={s.villageText}>
                      {[
                        language === "mr" ? listing.villageMr : listing.village,
                        query.data?.village.district,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </View>
                  {seller && (
                    <View style={s.contactRow}>
                      <Ionicons
                        name="call-outline"
                        size={15}
                        color={theme.colors.primary}
                      />
                      <Text style={s.phone}>{seller.mobile}</Text>
                    </View>
                  )}
                </View>
              </View>
              {!!session && !seller && restoredContact.isPending && (
                <Text style={d.description}>
                  {offline ? t.offlineAction : t.listingsLoading}
                </Text>
              )}
              {!seller && restoredContact.isError && (
                <>
                  <ErrorMessage
                    message={errorMessage(restoredContact.error, language)}
                  />
                  <Button
                    secondary
                    disabled={offline}
                    onPress={() => void restoredContact.refetch()}
                  >
                    {t.retry}
                  </Button>
                </>
              )}
              {contactError && <ErrorMessage message={contactError} />}
              {seller && (
                <View style={s.sellerActions}>
                  <View style={s.sellerAction}>
                    <Button
                      outlined
                      loading={contactBusy}
                      disabled={offline || contactBusy || notifyBusy}
                      icon={
                        <Ionicons
                          accessible={false}
                          name="call-outline"
                          size={18}
                          color={theme.colors.heading}
                        />
                      }
                      onPress={() => void revealContact(true)}
                    >
                      {t.call}
                    </Button>
                  </View>
                  <View style={s.sellerAction}>
                    <Button
                      outlined
                      loading={notifyBusy}
                      disabled={offline || contactBusy || notifyBusy}
                      icon={
                        <Ionicons
                          accessible={false}
                          name="notifications-outline"
                          size={18}
                          color={theme.colors.heading}
                        />
                      }
                      onPress={() => void openNotify()}
                    >
                      {t.notify}
                    </Button>
                  </View>
                </View>
              )}
              {!session && (
                <Button
                  onPress={() => {
                    showGuestSignUpPrompt(language, () => {
                      useAppStore.getState().setAuthMode("register");
                      useAppStore.getState().setContactReturn(id);
                      router.push("/register");
                    });
                  }}
                >
                  {t.contactSeller}
                </Button>
              )}
            </Panel>
          </>
        ) : unavailable ? (
          <Text style={d.cardTitle}>{t.productUnavailable}</Text>
        ) : null}
        <Modal
          visible={notifyModal !== null}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (!notifying.current) setNotifyModal(null);
          }}
        >
          <View
            style={[
              s.modalOverlay,
              { paddingBottom: Math.max(24, insets.bottom + 12) },
            ]}
          >
            <View style={s.modalSheet} accessibilityViewIsModal>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.closeDialog}
                disabled={notifyBusy}
                style={s.modalClose}
                onPress={() => setNotifyModal(null)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
              <ScrollView
                contentContainerStyle={s.modalContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                <View style={s.modalIcon}>
                  <Ionicons
                    name={
                      notifyModal === "success"
                        ? "checkmark-circle"
                        : "alert-circle-outline"
                    }
                    size={60}
                    color={theme.colors.icon}
                  />
                </View>
                <Text accessibilityRole="header" style={s.modalTitle}>
                  {notifyModal === "success"
                    ? t.sellerNotified
                    : t.notifySellerTitle}
                </Text>
                {notifyModal === "confirm" ? (
                  <>
                    <Text style={s.modalQuestion}>
                      {formatMessage(t.notifySellerQuestion, {
                        seller: notifySummary.seller,
                      })}
                    </Text>
                    <Text style={s.modalDescription}>
                      {formatMessage(
                        notifyPending && !notifyPending.body.callbackConsent
                          ? t.notifyLegacyExplanation
                          : t.notifySellerExplanation,
                        notifySummary,
                      )}
                    </Text>
                    {!notifyReady && (
                      <Text style={s.modalDescription}>
                        {t.requestPreparing}
                      </Text>
                    )}
                    {(notifyPending?.body.quantity !== undefined ||
                      !notifyPending) && (
                      <Input
                        label={`${t.requestQuantityLabel} *${listing?.unit ? ` (${listingUnit(listing.unit, language)})` : ""}`}
                        value={requestQuantity}
                        keyboardType="decimal-pad"
                        maxLength={30}
                        editable={notifyReady && !notifyBusy && !notifyPending}
                        onChangeText={(value) => {
                          setRequestQuantity(value);
                          setNotifyError(null);
                        }}
                      />
                    )}
                    {listing && (
                      <Text style={s.modalDescription}>
                        {listingQuantity(listing, language)}
                      </Text>
                    )}
                    {notifyPending && (
                      <Text style={s.modalDescription}>
                        {notifyPending.body.quantity === undefined
                          ? t.requestPendingLegacy
                          : t.requestPendingMessage}
                      </Text>
                    )}
                    {!listing?.unit && !notifyPending && (
                      <ErrorMessage message={t.requestUnitUnavailable} />
                    )}
                    {offline && (
                      <Text style={s.modalDescription}>{t.offlineAction}</Text>
                    )}
                    {notifyError && <ErrorMessage message={notifyError} />}
                    {(!listing || !seller) && (
                      <ErrorMessage message={t.productUnavailable} />
                    )}
                    <Button
                      disabled={
                        offline ||
                        notifyBusy ||
                        !notifyReady ||
                        !listing ||
                        !seller ||
                        (!notifyPending && !listing?.unit)
                      }
                      loading={notifyBusy}
                      onPress={() => void notifySeller()}
                    >
                      {t.notifySellerTitle}
                    </Button>
                    {!notifyReady && notifyError && (
                      <Button secondary onPress={() => void openNotify()}>
                        {t.retry}
                      </Button>
                    )}
                    <Button
                      secondary
                      disabled={notifyBusy}
                      onPress={() => setNotifyModal(null)}
                    >
                      {t.cancel}
                    </Button>
                  </>
                ) : (
                  <>
                    <Text style={s.modalDescription}>
                      {formatMessage(t.sellerNotifiedExplanation, {
                        ...notifySummary,
                        activity: t.myActivity,
                      })}
                    </Text>
                    <Button
                      disabled={offline || contactBusy || !listing || !seller}
                      onPress={() => {
                        setNotifyModal(null);
                        void revealContact(true);
                      }}
                    >
                      {t.callAgain}
                    </Button>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Screen>
    </ProtectedPage>
  );
}
const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  back: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  title: {
    flex: 1,
    color: theme.colors.heading,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
  },
  productSection: { gap: 12 },
  stacked: { flexDirection: "column", gap: 4 },
  stackedColumn: { flex: 0, width: "100%" },
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: theme.colors.tint,
    borderRadius: theme.radii.card,
  },
  name: {
    color: theme.colors.heading,
    fontSize: 25,
    lineHeight: 34,
    fontWeight: "700",
  },
  priceBadge: {
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.accentBackground,
  },
  price: {
    color: theme.colors.heading,
    fontSize: 23,
    lineHeight: 31,
    fontWeight: "700",
  },
  details: { gap: 10, paddingTop: 4 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  detailLabel: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  detailValue: {
    flex: 1,
    color: theme.colors.heading,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
  },
  descriptionSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
    gap: 8,
  },
  descriptionTitle: {
    color: theme.colors.heading,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
  },
  seller: { gap: 16 },
  sellerActions: { flexDirection: "row", alignItems: "stretch", gap: 12 },
  sellerAction: { flex: 1 },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.tint,
  },
  sellerCopy: { flex: 1, gap: 2 },
  sellerName: {
    color: theme.colors.heading,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  villageRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  villageText: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  phone: {
    flex: 1,
    color: theme.colors.heading,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: theme.colors.overlay,
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  modalSheet: {
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    maxHeight: "85%",
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.sheet,
  },
  modalClose: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignSelf: "flex-end",
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
  },
  modalContent: { padding: 24, paddingTop: 0, gap: 16 },
  modalIcon: { alignItems: "center" },
  modalTitle: {
    color: theme.colors.heading,
    fontSize: 23,
    lineHeight: 32,
    fontWeight: "700",
    textAlign: "center",
  },
  modalQuestion: {
    color: theme.colors.heading,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
    textAlign: "center",
  },
  modalDescription: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
});
