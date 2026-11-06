import { dateLocale } from "../locale";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  View,
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
import { useListing, useListingOffers } from "../listings";
import { useListingClock } from "../hooks/useListingClock";
import { ApiError } from "../api/client";
import { listingName } from "../types/home";
import { theme } from "../theme";
import { listingTagLabel } from "@gaavli/constants";
import { Button, ErrorMessage, Input, SkeletonList } from "../components/ui";
import { Badge, d } from "../components/dashboard/primitives";
import { ProtectedPage } from "../components/dashboard/ProtectedPage";
import { ListingImage } from "../components/dashboard/ListingImage";
import {
  listingPosted,
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
  const invalid = !listingIdSchema.safeParse(id).success;
  const unavailable =
    invalid ||
    (query.error instanceof ApiError && query.error.status === 404) ||
    (query.data?.expiresAt && Date.parse(query.data.expiresAt) <= now);
  const listing =
    query.data && !unavailable ? toHomeListing(query.data, now) : null;
  // Other sellers of this same product, cheapest first.
  const offersQuery = useListingOffers(id, !!listing);
  const offers = offersQuery.data?.offers ?? [];
  const quantityValue = (quantity: number) =>
    `${new Intl.NumberFormat(dateLocale(language)).format(quantity)} ${listingUnit(listing?.unit ?? null, language)}`.trim();
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
  const village = listing
    ? language !== "en"
      ? listing.villageMr
      : listing.village
    : "";
  const unit = listingUnit(listing?.unit ?? null, language);
  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace("/marketplace");
  }
  const footer = !listing ? null : !session ? (
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
  ) : seller ? (
    <View style={s.actions}>
      <View style={s.primaryAction}>
        <Button
          loading={contactBusy}
          disabled={offline || contactBusy || notifyBusy}
          icon={
            <Ionicons
              accessible={false}
              name="call"
              size={18}
              color={theme.colors.onPrimary}
            />
          }
          onPress={() => void revealContact(true)}
        >
          {t.call}
        </Button>
      </View>
      <View style={s.secondaryAction}>
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
  ) : null;
  return (
    <ProtectedPage allowGuest>
      <View style={s.page}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          <View style={s.hero}>
            {listing ? (
              <ListingImage
                listing={listing}
                style={s.heroImage}
                resizeMode="cover"
                iconSize={72}
              />
            ) : (
              <View style={s.heroImage} />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.back}
              onPress={leave}
              style={({ pressed }) => [
                s.back,
                { top: insets.top + 8 },
                pressed && d.pressed,
              ]}
            >
              <Ionicons
                accessible={false}
                name="chevron-back"
                size={22}
                color={theme.colors.heading}
              />
            </Pressable>
          </View>
          <View style={s.sheet}>
            {offline && (
              <Text style={d.description}>
                {listing ? t.listingsOffline : t.listingsOfflineEmpty}
              </Text>
            )}
            {!offline && query.isPending && !invalid && (
              <SkeletonList rows={1} label={t.listingsLoading} />
            )}
            {query.isError && !unavailable && !offline && (
              <>
                <ErrorMessage message={t.listingsFailed} />
                <Button secondary onPress={() => void query.refetch()}>
                  {t.retry}
                </Button>
              </>
            )}
            {unavailable && !listing && (
              <Text style={d.cardTitle}>{t.productUnavailable}</Text>
            )}
            {listing && (
              <>
                <View style={s.titleBlock}>
                  <Text accessibilityRole="header" style={s.name}>
                    {listingName(listing, language)}
                  </Text>
                  <View style={s.metaRow}>
                    <Ionicons
                      accessible={false}
                      name="location-outline"
                      size={16}
                      color={theme.colors.muted}
                    />
                    <Text style={s.meta}>
                      {[village, listingPosted(listing, language)]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  {!!listing.tags?.length && (
                    <View style={s.tags}>
                      {listing.tags.map((tag) => {
                        const label = listingTagLabel(tag, language);
                        return label ? (
                          <View key={tag} style={s.tag}>
                            <Ionicons
                              accessible={false}
                              name="checkmark-circle"
                              size={15}
                              color={theme.colors.success}
                            />
                            <Text style={s.tagText}>{label}</Text>
                          </View>
                        ) : null;
                      })}
                    </View>
                  )}
                </View>
                {listing.isDemo && (
                  <View style={s.demo}>
                    <Badge yellow>{t.demoListing}</Badge>
                    <Text style={d.description}>
                      {t.demoListingDescription}
                    </Text>
                  </View>
                )}
                <View style={s.priceCard}>
                  <View style={s.priceCopy}>
                    <Text style={s.price}>
                      {listing.price === null
                        ? t.rateNotProvided
                        : `₹${listing.price}`}
                    </Text>
                    {listing.price !== null && !!unit && (
                      <Text style={s.priceUnit}>/ {unit}</Text>
                    )}
                  </View>
                  <View style={s.stock}>
                    <Ionicons
                      accessible={false}
                      name="cube-outline"
                      size={18}
                      color={theme.colors.primary}
                    />
                    <Text style={s.stockText}>
                      {listing.availableQuantity === null
                        ? t.detailsNotProvided
                        : quantityValue(listing.availableQuantity)}
                    </Text>
                  </View>
                </View>
                {!!listing.description && (
                  <View style={s.block}>
                    <Text accessibilityRole="header" style={s.blockTitle}>
                      {t.productDescriptionLabel}
                    </Text>
                    <Text style={s.body}>{listing.description}</Text>
                  </View>
                )}
                {offers.length > 1 && (
                  <View style={s.block}>
                    <Text accessibilityRole="header" style={s.blockTitle}>
                      {t.offersTitle}
                    </Text>
                    {!session && <Text style={s.meta}>{t.offerSignIn}</Text>}
                    {offers.map((offer, index) => {
                      const current = offer.id === id;
                      const where =
                        language !== "en"
                          ? offer.village.nameMr
                          : offer.village.name;
                      const rate =
                        offer.price === null
                          ? t.rateNotProvided
                          : `₹${offer.price}${unit ? ` / ${unit}` : ""}`;
                      const person = offer.seller?.name ?? where;
                      const phone = offer.seller?.mobile ?? null;
                      return (
                        <Pressable
                          key={offer.id}
                          accessibilityRole="button"
                          accessibilityLabel={`${person}, ${rate}, ${where}`}
                          disabled={current}
                          onPress={() =>
                            router.replace({
                              pathname: "/product/[id]",
                              params: { id: offer.id },
                            })
                          }
                          style={({ pressed }) => [
                            s.offer,
                            current && s.offerCurrent,
                            pressed && s.pressedOffer,
                          ]}
                        >
                          <View style={s.offerNumber}>
                            <Text style={s.offerNumberText}>
                              {Array.from(person)[0]?.toUpperCase() ?? ""}
                            </Text>
                          </View>
                          <View style={s.offerCopy}>
                            <Text numberOfLines={1} style={s.offerTitle}>
                              {person}
                            </Text>
                            {index === 0 && (
                              <Text numberOfLines={1} style={s.offerBest}>
                                {t.offerCheapest}
                              </Text>
                            )}
                            <Text numberOfLines={1} style={s.meta}>
                              {[
                                offer.seller ? where : null,
                                offer.quantity !== null
                                  ? quantityValue(offer.quantity)
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </Text>
                            {!!phone && (
                              <View style={s.metaRow}>
                                <Ionicons
                                  accessible={false}
                                  name="call-outline"
                                  size={14}
                                  color={theme.colors.primary}
                                />
                                <Text style={s.phone}>{phone}</Text>
                              </View>
                            )}
                          </View>
                          <View style={s.offerRight}>
                            <Text style={s.offerPrice}>{rate}</Text>
                            {!!phone && (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`${t.offerCall}: ${person}`}
                                hitSlop={8}
                                onPress={() =>
                                  void Linking.openURL(`tel:${phone}`).catch(
                                    () => Alert.alert(t.callError),
                                  )
                                }
                                style={({ pressed }) => [
                                  s.offerCall,
                                  pressed && s.pressedOffer,
                                ]}
                              >
                                <Ionicons
                                  accessible={false}
                                  name="call"
                                  size={16}
                                  color={theme.colors.onPrimary}
                                />
                                <Text style={s.offerCallText}>
                                  {t.offerCall}
                                </Text>
                              </Pressable>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {offers.length <= 1 && (
                  <View style={s.sellerCard}>
                    <View style={s.avatar}>
                      <Ionicons
                        accessible={false}
                        name="person"
                        size={22}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={s.sellerCopy}>
                      <Text style={s.sellerLabel}>{t.soldBy}</Text>
                      <Text numberOfLines={1} style={s.sellerName}>
                        {seller ? seller.name : t.contactProtected}
                      </Text>
                      <Text numberOfLines={1} style={s.meta}>
                        {[village, query.data?.village.district]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                      {seller && (
                        <View style={s.metaRow}>
                          <Ionicons
                            accessible={false}
                            name="call-outline"
                            size={15}
                            color={theme.colors.primary}
                          />
                          <Text style={s.phone}>{seller.mobile}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
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
              </>
            )}
          </View>
        </ScrollView>
        {footer && <View style={s.footer}>{footer}</View>}
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
      </View>
    </ProtectedPage>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1 },
  hero: { height: 300, backgroundColor: theme.colors.tint },
  heroImage: {
    width: "100%",
    height: "100%",
    backgroundColor: theme.colors.tint,
  },
  back: {
    position: "absolute",
    left: theme.layout.screenPadding,
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface,
  },
  sheet: {
    flex: 1,
    marginTop: -24,
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
    borderTopLeftRadius: theme.radii.sheet,
    borderTopRightRadius: theme.radii.sheet,
    backgroundColor: theme.colors.background,
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
  },
  titleBlock: { gap: 4 },
  name: { ...theme.type.display, color: theme.colors.heading },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { ...theme.type.caption, color: theme.colors.muted, flexShrink: 1 },
  demo: { gap: 6 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.successBackground,
  },
  tagText: { ...theme.type.micro, color: theme.colors.success },
  priceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  priceCopy: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexShrink: 1,
  },
  price: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  priceUnit: { ...theme.type.body, color: theme.colors.muted },
  stock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.chip,
    backgroundColor: theme.colors.tint,
    flexShrink: 1,
  },
  stockText: { ...theme.type.label, color: theme.colors.primaryDark },
  block: { gap: 6 },
  blockTitle: { ...theme.type.heading, color: theme.colors.heading },
  body: { ...theme.type.body, color: theme.colors.text },
  offer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  offerCurrent: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.tint,
  },
  pressedOffer: { opacity: theme.interaction.pressedOpacity },
  offerNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.steelTint,
    alignItems: "center",
    justifyContent: "center",
  },
  offerNumberText: { ...theme.type.label, color: theme.colors.steel },
  offerCopy: { flex: 1, minWidth: 0 },
  offerTitle: { ...theme.type.subheading, color: theme.colors.heading },
  offerRight: { alignItems: "flex-end" },
  offerPrice: { ...theme.type.subheading, color: theme.colors.saffronText },
  offerBest: { ...theme.type.micro, color: theme.colors.success },
  offerCall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
  },
  offerCallText: { ...theme.type.label, color: theme.colors.onPrimary },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.tint,
  },
  sellerCopy: { flex: 1, minWidth: 0, gap: 1 },
  sellerLabel: { ...theme.type.micro, color: theme.colors.muted },
  sellerName: { ...theme.type.subheading, color: theme.colors.heading },
  phone: { ...theme.type.label, color: theme.colors.heading },
  footer: {
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actions: { flexDirection: "row", gap: 12, alignItems: "stretch" },
  primaryAction: { flex: 3 },
  secondaryAction: { flex: 2 },
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
