import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import { requestPageSchema, notificationPageSchema } from "@gaavli/validation";
import { authenticatedApi } from "../session";
import { Button, ErrorMessage } from "../components/ui";
import { useAppStore } from "../store";
import { formatMessage, messages } from "../i18n";
import { theme } from "../theme";
import { ListingImage } from "../components/dashboard/ListingImage";
import { PageSceneHeader } from "../components/dashboard/PageSceneHeader";
import { listingUnit } from "../components/dashboard/listingText";
import {
  availableRequestTab,
  requestTabs,
  type RequestTab,
} from "../data/requestTabs";
import { DashboardScreen, Panel, d } from "../components/dashboard/primitives";

export default function ActivityScreen({
  onBack,
  initialDirection,
}: {
  onBack?: () => void;
  initialDirection?: RequestTab;
} = {}) {
  const session = useAppStore((state) => state.session);
  return (
    <ActivityContent
      key={session?.user.id}
      onBack={onBack}
      initialDirection={initialDirection}
    />
  );
}

function ActivityContent({
  onBack,
  initialDirection,
}: {
  onBack?: () => void;
  initialDirection?: RequestTab;
}) {
  const { language, session, offline } = useAppStore();
  const t = messages(language);
  const router = useRouter();
  const isSeller = !!session?.user.isSeller;
  const [selectedTab, setSelectedTab] = useState<RequestTab>(
    initialDirection || "sent",
  );
  const tab = availableRequestTab(isSeller, selectedTab);
  const notificationsActive = tab === "notifications";
  const query = useInfiniteQuery({
    queryKey: ["activity-requests", session?.user.id, tab, "read-only"],
    enabled: !!session && !offline && !notificationsActive,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      authenticatedApi(
        `/requests?direction=${tab}&page=${pageParam}&limit=20&includeMessages=true&includeBuyerMobile=true`,
        requestPageSchema,
        { signal },
      ),
    getNextPageParam: (page) =>
      page.page * page.limit < page.total ? page.page + 1 : undefined,
    retry: false,
  });
  const notices = useInfiniteQuery({
    queryKey: ["notifications", session?.user.id, language, "read-state"],
    enabled: !!session && !offline && notificationsActive,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      authenticatedApi(
        `/notifications?page=${pageParam}&limit=20&language=${language}&includeReadState=true`,
        notificationPageSchema,
        { signal },
      ),
    getNextPageParam: (page) =>
      page.page * page.limit < page.total ? page.page + 1 : undefined,
    retry: false,
  });
  const active = notificationsActive ? notices : query;
  const refetch = active.refetch;
  useFocusEffect(
    useCallback(() => {
      if (session && !offline) void refetch();
    }, [session, offline, refetch]),
  );
  const rows = query.data?.pages.flatMap((page) => page.requests) || [];
  const notifications =
    notices.data?.pages.flatMap((page) => page.notifications) || [];
  const date = (value: string) =>
    new Intl.DateTimeFormat(language === "mr" ? "mr-IN" : "en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  const labels = {
    sent: t.sentRequests,
    received: t.receivedRequests,
    notifications: t.requestNotifications,
  };
  return (
    <DashboardScreen>
      <PageSceneHeader
        title={t.myRequests}
        subtitle={t.activitySubtitle}
        backLabel={t.back}
        onBack={onBack || (() => router.replace("/home"))}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.refreshRequests}
            accessibilityState={{
              disabled: offline || active.isFetching,
              busy: active.isFetching,
            }}
            disabled={offline || active.isFetching}
            onPress={() => void refetch()}
            style={({ pressed }) => [
              s.refresh,
              (offline || active.isFetching) && s.disabled,
              pressed && s.pressed,
            ]}
          >
            <Ionicons
              accessible={false}
              name="refresh-outline"
              size={22}
              color={theme.colors.primaryDark}
            />
          </Pressable>
        }
      />
      <View style={s.tabs} accessibilityRole="tablist">
        {requestTabs(isSeller).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            onPress={() => setSelectedTab(value)}
            style={[s.tab, tab === value && s.selected]}
          >
            <Text style={s.tabText}>{labels[value]}</Text>
          </Pressable>
        ))}
      </View>
      {offline && <Text style={d.description}>{t.offlineAction}</Text>}
      {active.isPending && !offline && (
        <Text style={d.description}>{t.loading}</Text>
      )}
      {active.isError && (
        <>
          <ErrorMessage
            message={
              notificationsActive ? t.notificationsFailed : t.requestsFailed
            }
          />
          <Button secondary disabled={offline} onPress={() => void refetch()}>
            {t.retry}
          </Button>
        </>
      )}
      {active.data &&
        !active.isError &&
        !(notificationsActive ? notifications.length : rows.length) && (
          <Panel>
            <Text style={d.description}>
              {notificationsActive
                ? t.notificationInboxEmpty
                : tab === "sent"
                  ? t.noSentRequests
                  : t.noReceivedRequests}
            </Text>
          </Panel>
        )}
      {!notificationsActive &&
        !query.isError &&
        rows.map((row) => (
          <View key={row.id} style={s.card}>
            <View style={s.productRow}>
              <ListingImage
                listing={{ photoUrl: row.product.photoUrl, image: null }}
                style={s.image}
              />
              <View style={s.copy}>
                <Text style={s.productName}>
                  {(language === "mr"
                    ? row.product.nameMr || row.product.name
                    : row.product.name) || t.productUnavailable}
                </Text>
                <Text style={s.personName}>
                  {row.person.name || t.requestPersonUnavailable}
                </Text>
                {tab === "received" && (
                  <Text style={s.muted}>
                    {row.person.mobile
                      ? `+91 ${row.person.mobile}`
                      : t.contactUnavailable}
                  </Text>
                )}
                {!!row.person.village && (
                  <Text style={s.muted}>
                    {language === "mr"
                      ? row.person.village.nameMr
                      : row.person.village.name}
                  </Text>
                )}
              </View>
            </View>
            {row.quantity !== null && (
              <Text style={s.muted}>
                {formatMessage(t.requestQuantityText, {
                  quantity: new Intl.NumberFormat(
                    language === "mr" ? "mr-IN" : "en-IN",
                  ).format(row.quantity),
                  unit: listingUnit(row.product.unit, language),
                })}
              </Text>
            )}
            {!!row.message && <Text style={s.muted}>{row.message}</Text>}
            <Text style={s.muted}>{date(row.createdAt)}</Text>
          </View>
        ))}
      {notificationsActive &&
        !notices.isError &&
        notifications.map((notice) => (
          <View
            key={notice.id}
            style={[s.card, notice.readAt === null && s.unread]}
          >
            <View style={s.productRow}>
              <Ionicons
                accessible={false}
                name="notifications-outline"
                size={24}
                color={theme.colors.primaryDark}
              />
              <View style={s.copy}>
                <Text style={s.productName}>{notice.title}</Text>
                <Text style={s.muted} numberOfLines={3}>
                  {notice.body}
                </Text>
                <Text style={s.muted}>{date(notice.createdAt)}</Text>
              </View>
              {notice.readAt !== undefined && (
                <View
                  accessibilityLabel={
                    notice.readAt ? t.notificationRead : t.notificationUnread
                  }
                  style={[s.dot, notice.readAt === null && s.unreadDot]}
                />
              )}
            </View>
          </View>
        ))}
      {!active.isError && active.hasNextPage && (
        <Button
          secondary
          disabled={offline}
          loading={active.isFetchingNextPage}
          onPress={() => void active.fetchNextPage()}
        >
          {t.loadMore}
        </Button>
      )}
    </DashboardScreen>
  );
}

const s = StyleSheet.create({
  refresh: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.tint,
  },
  disabled: { opacity: theme.interaction.disabledOpacity },
  pressed: { opacity: theme.interaction.pressedOpacity },
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
  copy: { flex: 1, gap: 4 },
  personName: { fontSize: 14, lineHeight: 22, color: theme.colors.text },
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
  unread: { borderColor: theme.colors.primaryDark },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  unreadDot: { backgroundColor: theme.colors.primaryDark },
});
