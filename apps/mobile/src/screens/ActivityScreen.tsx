import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "expo-router";
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { z } from "zod";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  requestPageSchema,
  requestStateSchema,
  requestContactSchema,
  notificationPageSchema,
  type activityRequestSchema,
} from "@gaavli/validation";
import { authenticatedApi } from "../session";
import { Button, ErrorMessage } from "../components/ui";
import { useAppStore } from "../store";
import { formatMessage, messages } from "../i18n";
import { errorMessage } from "../errors";
import { showToast } from "../toast";
import { theme } from "../theme";
import { ListingImage } from "../components/dashboard/ListingImage";
import { listingUnit } from "../components/dashboard/listingText";
import {
  DashboardScreen,
  Panel,
  SectionHeader,
  d,
} from "../components/dashboard/primitives";

type Request = z.infer<typeof activityRequestSchema>;
type Page = z.infer<typeof requestPageSchema>;
export default function ActivityScreen() {
  const session = useAppStore((state) => state.session);
  return (
    <ActivityContent key={`${session?.user.id}:${session?.user.village?.id}`} />
  );
}
function ActivityContent() {
  const { language, session, offline } = useAppStore();
  const t = messages(language);
  const client = useQueryClient();
  const [direction, setDirection] = useState<"sent" | "received">(() =>
    session?.user.isSeller ? "received" : "sent",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.2;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const query = useInfiniteQuery({
    queryKey: ["activity-requests", session?.user.id, direction],
    enabled: !!session && !offline,
    refetchOnMount: "always",
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      authenticatedApi(
        `/requests?direction=${direction}&page=${pageParam}&limit=20`,
        requestPageSchema,
        { signal },
      ),
    getNextPageParam: (page) =>
      page.page * page.limit < page.total ? page.page + 1 : undefined,
    retry: false,
  });
  const notices = useInfiniteQuery({
    queryKey: ["notifications", session?.user.id, language],
    enabled: !!session && !offline && direction === "received",
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      authenticatedApi(
        `/notifications?page=${pageParam}&limit=20&language=${language}`,
        notificationPageSchema,
        { signal },
      ),
    getNextPageParam: (page) =>
      page.page * page.limit < page.total ? page.page + 1 : undefined,
    retry: false,
  });
  const refetch = query.refetch,
    refetchNotices = notices.refetch;
  useFocusEffect(
    useCallback(() => {
      if (session && !offline) {
        void refetch();
        if (direction === "received") void refetchNotices();
      }
    }, [session, offline, direction, refetch, refetchNotices]),
  );
  const rows = query.data?.pages.flatMap((page) => page.requests) || [];
  async function act(row: Request, action: "call" | "seen" | "responded") {
    if (!session || offline || submitting.current) return;
    submitting.current = true;
    setBusy(row.id);
    setFailure(null);
    const accountId = session.user.id;
    const villageId = session.user.village?.id;
    const current = () =>
      mounted.current &&
      useAppStore.getState().session?.user.id === accountId &&
      useAppStore.getState().session?.user.village?.id === villageId;
    let openingDialer = false;
    try {
      if (!current()) return;
      if (action !== "call" || direction === "received") {
        const state = await authenticatedApi(
          `/requests/${row.id}`,
          requestStateSchema,
          {
            method: "PATCH",
            body: JSON.stringify({
              action: action === "responded" ? "responded" : "seen",
            }),
          },
        );
        if (!current()) return;
        client.setQueriesData<InfiniteData<Page>>(
          { queryKey: ["activity-requests", accountId] },
          (old) =>
            old
              ? {
                  ...old,
                  pages: old.pages.map((page) => ({
                    ...page,
                    requests: page.requests.map((item) =>
                      item.id === state.id ? { ...item, ...state } : item,
                    ),
                  })),
                }
              : old,
        );
        if (action !== "call")
          showToast(
            action === "responded"
              ? t.requestRespondedSuccess
              : t.requestSeenSuccess,
            "success",
          );
      }
      if (action === "call") {
        const contact = await authenticatedApi(
          `/requests/${row.id}/contact`,
          requestContactSchema,
        );
        if (!current() || contact.requestId !== row.id) return;
        openingDialer = true;
        await Linking.openURL(`tel:${contact.mobile}`);
      }
      if (current())
        void client.invalidateQueries({
          queryKey: ["activity-requests", accountId],
        });
    } catch (error) {
      if (current()) {
        setFailure(openingDialer ? t.callError : errorMessage(error, language));
        void query.refetch();
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(null);
    }
  }
  function confirmResponded(row: Request) {
    Alert.alert(t.markResponded, t.markRespondedQuestion, [
      { text: t.cancel, style: "cancel" },
      { text: t.sellerYes, onPress: () => void act(row, "responded") },
    ]);
  }
  return (
    <DashboardScreen>
      <SectionHeader
        title={t.myActivity}
        action={
          !offline && !busy && !query.isFetching ? t.refreshRequests : undefined
        }
        onPress={() => {
          void query.refetch();
          if (direction === "received") void notices.refetch();
        }}
      />
      <View style={s.tabs}>
        {(
          [
            ["sent", t.sentRequests],
            ["received", t.receivedRequests],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{
              selected: direction === value,
              disabled: !!busy,
            }}
            disabled={!!busy}
            onPress={() => {
              setDirection(value);
              setFailure(null);
            }}
            style={[s.tab, direction === value && s.selected]}
          >
            <Text style={s.tabText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {failure && <ErrorMessage message={failure} />}
      {query.isPending && (
        <Text style={d.description}>
          {offline ? t.offlineAction : t.listingsLoading}
        </Text>
      )}
      {query.isError && (
        <>
          <ErrorMessage message={t.requestsFailed} />
          <Button
            secondary
            disabled={offline}
            onPress={() => void query.refetch()}
          >
            {t.retry}
          </Button>
        </>
      )}
      {query.data && !query.isError && !rows.length && (
        <Panel>
          <Text style={d.description}>
            {direction === "sent" ? t.noSentRequests : t.noReceivedRequests}
          </Text>
        </Panel>
      )}
      {rows.map((row) => (
        <View key={row.id} style={s.card}>
          <View style={s.personRow}>
            <View style={s.avatar}>
              <Text accessible={false} style={s.initial}>
                {Array.from(row.person.name || "?")[0]}
              </Text>
            </View>
            <View style={s.personCopy}>
              <Text style={s.personName}>
                {row.person.name || t.requestPersonUnavailable}
              </Text>
              <Text style={s.muted}>
                {row.person.village
                  ? language === "mr"
                    ? row.person.village.nameMr
                    : row.person.village.name
                  : ""}
              </Text>
            </View>
            <Text
              style={[
                s.status,
                row.status === "new" ? s.newStatus : s.seenStatus,
              ]}
            >
              {row.status === "responded"
                ? t.requestResponded
                : row.status === "seen"
                  ? t.requestSeen
                  : direction === "sent"
                    ? t.requestSent
                    : t.requestNew}
            </Text>
          </View>
          <View style={s.productRow}>
            <ListingImage
              listing={{ photoUrl: row.product.photoUrl, image: null }}
              style={s.image}
            />
            <View style={s.personCopy}>
              <Text style={s.productName}>
                {(language === "mr"
                  ? row.product.nameMr || row.product.name
                  : row.product.name) || t.productUnavailable}
              </Text>
              <Text style={s.muted}>
                {row.quantity === null
                  ? t.requestQuantityUnknown
                  : formatMessage(t.requestQuantityText, {
                      quantity: new Intl.NumberFormat(
                        language === "mr" ? "mr-IN" : "en-IN",
                      ).format(row.quantity),
                      unit: listingUnit(row.product.unit, language),
                    })}
              </Text>
            </View>
          </View>
          <Text style={s.muted}>
            {new Intl.DateTimeFormat(language === "mr" ? "mr-IN" : "en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(row.createdAt))}
          </Text>
          <View style={[s.actions, stacked && s.stacked]}>
            <View style={[s.action, stacked && s.stackedAction]}>
              <Button
                disabled={offline || !!busy || !row.canCall}
                loading={busy === row.id}
                icon={
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={theme.colors.onPrimary}
                  />
                }
                onPress={() => void act(row, "call")}
              >
                {direction === "sent" ? t.callAgain : t.callBuyer}
              </Button>
            </View>
            {direction === "received" && row.status !== "responded" && (
              <View style={[s.action, stacked && s.stackedAction]}>
                <Button
                  secondary
                  disabled={offline || !!busy}
                  onPress={() =>
                    row.status === "new"
                      ? void act(row, "seen")
                      : confirmResponded(row)
                  }
                >
                  {row.status === "new" ? t.markSeen : t.markResponded}
                </Button>
              </View>
            )}
          </View>
          {!row.canCall && <Text style={s.muted}>{t.contactUnavailable}</Text>}
        </View>
      ))}
      {query.hasNextPage && (
        <Button
          secondary
          disabled={offline}
          loading={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        >
          {t.loadMore}
        </Button>
      )}
      <Text style={s.muted}>
        {direction === "sent" ? t.sentRequestHelp : t.receivedRequestHelp}
      </Text>
      {direction === "received" && (
        <>
          {notices.isError && (
            <>
              <ErrorMessage message={t.notificationsFailed} />
              <Button
                secondary
                disabled={offline}
                onPress={() => void notices.refetch()}
              >
                {t.retry}
              </Button>
            </>
          )}
          {notices.data?.pages
            .flatMap((page) => page.notifications)
            .filter((notice) => notice.type !== "BUYER_TRIED_CONTACT")
            .map((notice) => (
              <Panel key={notice.id}>
                <Text style={d.cardTitle}>{notice.title}</Text>
                <Text style={d.description}>{notice.body}</Text>
              </Panel>
            ))}
          {notices.hasNextPage && (
            <Button
              secondary
              disabled={offline}
              loading={notices.isFetchingNextPage}
              onPress={() => void notices.fetchNextPage()}
            >
              {t.loadMore}
            </Button>
          )}
        </>
      )}
    </DashboardScreen>
  );
}
const s = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    gap: 6,
    padding: 4,
    backgroundColor: theme.colors.tint,
    borderRadius: theme.radii.control,
  },
  tab: {
    flex: 1,
    minHeight: theme.layout.touchTarget,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.control,
  },
  selected: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.heading,
    textAlign: "center",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.card,
    padding: 14,
    gap: 10,
  },
  personRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  personCopy: { flex: 1, gap: 4 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { color: theme.colors.heading, fontSize: 21, fontWeight: "700" },
  personName: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  productName: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: theme.colors.heading,
  },
  productRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  image: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.tint,
  },
  muted: { color: theme.colors.muted, fontSize: 13, lineHeight: 20 },
  status: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radii.pill,
    color: theme.colors.heading,
  },
  newStatus: { backgroundColor: theme.colors.accentBackground },
  seenStatus: { backgroundColor: theme.colors.tint },
  actions: { flexDirection: "row", gap: 8 },
  stacked: { flexDirection: "column" },
  action: { flex: 1 },
  stackedAction: { flex: 0, width: "100%" },
});
