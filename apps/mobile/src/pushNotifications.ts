import { useEffect } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useRootNavigationState, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  pushDeviceStatusSchema,
  pushTestResultSchema,
} from "@gaavli/validation";
import { ApiError } from "./api/client";
import { messages } from "./i18n";
import { useAppActive } from "./notifications";
import { authenticatedApi } from "./session";
import { useAppStore } from "./store";
import { showToast } from "./toast";

const path = "/notifications/push-device";
const supported =
  (Platform.OS === "android" || Platform.OS === "ios") &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

async function firebaseMessaging() {
  if (!supported) return undefined;
  try {
    const api = await import("@react-native-firebase/messaging");
    return { api, messaging: api.getMessaging() };
  } catch {
    // A development client built before Firebase may still load the JS bundle.
    return undefined;
  }
}

type Messaging = NonNullable<Awaited<ReturnType<typeof firebaseMessaging>>>;

async function hasPermission({ api, messaging }: Messaging, prompt: boolean) {
  if (Platform.OS === "android") {
    if (Number(Platform.Version) < 33) return true;
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    return prompt
      ? (await PermissionsAndroid.request(permission)) ===
          PermissionsAndroid.RESULTS.GRANTED
      : PermissionsAndroid.check(permission);
  }
  const status = prompt
    ? await api.requestPermission(messaging)
    : await api.hasPermission(messaging);
  return (
    status === api.AuthorizationStatus.AUTHORIZED ||
    status === api.AuthorizationStatus.PROVISIONAL
  );
}

// Serialize automatic token refresh with the explicit Settings toggle.
let pendingUpdate: Promise<unknown> = Promise.resolve();
function updateForCurrentSession<T>(work: (signal: AbortSignal) => Promise<T>) {
  const token = useAppStore.getState().session?.refreshToken;
  const update = pendingUpdate.then(async () => {
    if (!token || useAppStore.getState().session?.refreshToken !== token)
      throw new Error("AUTH_REQUIRED");
    const controller = new AbortController();
    const stop = useAppStore.subscribe((state) => {
      if (state.session?.refreshToken !== token) controller.abort();
    });
    try {
      return await work(controller.signal);
    } finally {
      stop();
    }
  });
  pendingUpdate = update.catch(() => undefined);
  return update;
}

async function deviceToken({ api, messaging }: Messaging) {
  if (Platform.OS === "ios" && !(await api.getAPNSToken(messaging)))
    await api.registerDeviceForRemoteMessages(messaging);
  return api.getToken(messaging);
}

async function registerDevice(
  firebase: Messaging,
  signal: AbortSignal,
  method: "PUT" | "PATCH",
) {
  return saveToken(await deviceToken(firebase), signal, method);
}

function saveToken(
  token: string,
  signal: AbortSignal,
  method: "PUT" | "PATCH",
) {
  return authenticatedApi(path, pushDeviceStatusSchema, {
    method,
    body: JSON.stringify({ token, language: useAppStore.getState().language }),
    signal,
  });
}

function usePushDeviceStatus() {
  const accountId = useAppStore((state) => state.session?.user.id);
  const offline = useAppStore((state) => state.offline);
  return useQuery({
    queryKey: ["push-device", accountId],
    enabled: supported && !!accountId && !offline,
    queryFn: ({ signal }) =>
      authenticatedApi(path, pushDeviceStatusSchema, { signal }),
    retry: false,
  });
}

export function usePushDeviceSettings() {
  const accountId = useAppStore((state) => state.session?.user.id);
  const client = useQueryClient();
  const status = usePushDeviceStatus();
  const change = useMutation({
    mutationFn: (enabled: boolean) =>
      updateForCurrentSession(async (signal) => {
        if (!enabled)
          return authenticatedApi(path, pushDeviceStatusSchema, {
            method: "DELETE",
            signal,
          });
        const firebase = await firebaseMessaging();
        if (!firebase) throw new Error("PUSH_BUILD_REQUIRED");
        if (!(await hasPermission(firebase, true)))
          throw new Error("PUSH_PERMISSION_REQUIRED");
        return registerDevice(firebase, signal, "PUT");
      }),
    onSuccess(data) {
      if (useAppStore.getState().session?.user.id === accountId)
        client.setQueryData(["push-device", accountId], data);
    },
  });
  const test = useMutation({
    mutationFn: () =>
      updateForCurrentSession(async (signal) => {
        const firebase = await firebaseMessaging();
        if (!firebase) throw new ApiError("PUSH_BUILD_REQUIRED");
        if (!(await hasPermission(firebase, false)))
          throw new ApiError("PUSH_PERMISSION_REQUIRED");
        const token = await deviceToken(firebase);
        const registration = await saveToken(token, signal, "PATCH");
        if (!registration.enabled) throw new ApiError("FCM_DEVICE_UNAVAILABLE");
        return authenticatedApi(`${path}/test`, pushTestResultSchema, {
          method: "POST",
          body: JSON.stringify({ token }),
          signal,
        }).catch(async (error: unknown) => {
          if (
            !signal.aborted &&
            error instanceof ApiError &&
            error.code === "FCM_DEVICE_UNREGISTERED"
          )
            await firebase.api
              .deleteToken(firebase.messaging)
              .catch(() => undefined);
          throw error;
        });
      }),
  });
  return { supported, status, change, test };
}

export function PushNotificationSync() {
  const accountId = useAppStore((state) => state.session?.user.id);
  const ready = useAppStore((state) => state.hydrated);
  const language = useAppStore((state) => state.language);
  const offline = useAppStore((state) => state.offline);
  const enabled = usePushDeviceStatus().data?.enabled;
  const active = useAppActive();
  const navigationKey = useRootNavigationState()?.key;
  const router = useRouter();
  const client = useQueryClient();

  useEffect(() => {
    if (!accountId || !ready || !navigationKey || !supported) return;
    let stopped = false;
    const unsubscribe: (() => void)[] = [];
    const current = () =>
      !stopped && useAppStore.getState().session?.user.id === accountId;
    const refreshInbox = () => {
      for (const key of [
        "notification-unread",
        "notifications",
        "activity-requests",
      ])
        void client.invalidateQueries({ queryKey: [key, accountId] });
    };
    void firebaseMessaging()
      .then(async (firebase) => {
        if (!firebase || !current()) return;
        const { api, messaging } = firebase;
        const open = (message: { data?: Record<string, unknown> } | null) => {
          if (current() && message?.data?.kind === "seller-request") {
            refreshInbox();
            router.navigate("/notifications");
          }
        };
        unsubscribe.push(
          api.onNotificationOpenedApp(messaging, open),
          api.onMessage(messaging, (message) => {
            if (!current()) return;
            const t = messages(useAppStore.getState().language);
            if (message.data?.kind === "firebase-test") {
              if (Platform.OS === "android")
                showToast(t.pushTestReceived, "success");
              return;
            }
            if (message.data?.kind !== "seller-request") return;
            refreshInbox();
            if (Platform.OS === "android")
              showToast(t.pushRequestReceived, "success");
          }),
        );
        open(await api.getInitialNotification(messaging));
      })
      .catch(() => undefined);
    return () => {
      stopped = true;
      unsubscribe.forEach((stop) => stop());
    };
  }, [accountId, client, navigationKey, ready, router]);

  useEffect(() => {
    if (!accountId || !ready || !enabled || !active || offline) return;
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    const sync = (firebase: Messaging, refreshedToken?: string) =>
      updateForCurrentSession(async (signal) => {
        const key = ["push-device", accountId];
        // A toggle may have completed while a refresh was queued.
        if (stopped || !client.getQueryData<{ enabled: boolean }>(key)?.enabled)
          return;
        if (!(await hasPermission(firebase, false))) {
          const data = await authenticatedApi(path, pushDeviceStatusSchema, {
            method: "DELETE",
            signal,
          });
          if (!signal.aborted) client.setQueryData(key, data);
        } else {
          const data = refreshedToken
            ? await saveToken(refreshedToken, signal, "PATCH")
            : await registerDevice(firebase, signal, "PATCH");
          if (!signal.aborted && !data.enabled) client.setQueryData(key, data);
        }
      }).catch(() => undefined);
    void firebaseMessaging()
      .then((firebase) => {
        if (!firebase || stopped) return;
        unsubscribe = firebase.api.onTokenRefresh(
          firebase.messaging,
          (token) => {
            if (!stopped) void sync(firebase, token);
          },
        );
        void sync(firebase);
      })
      .catch(() => undefined);
    return () => {
      stopped = true;
      unsubscribe?.();
    };
  }, [accountId, active, client, enabled, language, offline, ready]);
  return null;
}
