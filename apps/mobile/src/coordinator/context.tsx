import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { z } from "zod";
import type { MobileVillage } from "@gaavli/types";
import { coordinatorMutationSchema } from "@gaavli/validation";
import { useAppStore } from "../store";
import { authenticatedApi } from "../session";
import { ApiError } from "../api/client";
import { errorMessage } from "../errors";
import { showToast } from "../toast";
import { messages } from "../i18n";
import {
  Screen,
  BackButton,
  Button,
  Card,
  ErrorMessage,
} from "../components/ui";
import { hasCoordinatorRole } from "../data/accountAccess";
import { d } from "../components/dashboard/primitives";
import { PageSceneHeader } from "../components/dashboard/PageSceneHeader";
import {
  pendingCoordinatorSchema,
  sendCoordinatorOperation,
  type PendingCoordinator,
} from "../data/coordinator";
import { coordinatorMessages } from "./i18n";

const useSelection = create<{
  id: string | null;
  select: (id: string) => void;
}>((set) => ({ id: null, select: (id) => set({ id }) }));
const secureOperations = {
  read: (key: string) => SecureStore.getItemAsync(key),
  write: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
type Scope = {
  village: MobileVillage;
  selectVillage: (id: string) => void;
  actorId: string;
  busy: boolean;
  pending: boolean;
  notices: ReactNode;
  write: (
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>,
  ) => Promise<{ id: string; confirmed: true } | null>;
};
const Context = createContext<Scope | null>(null);
export function useCoordinator() {
  const scope = useContext(Context);
  if (!scope) throw new Error("Coordinator context missing");
  return scope;
}
export function CoordinatorPage({
  title,
  showSceneHeader = false,
  back = false,
  compact = false,
  form = false,
  customScreen = false,
  children,
}: {
  title: string;
  showSceneHeader?: boolean;
  back?: boolean;
  compact?: boolean;
  form?: boolean;
  customScreen?: boolean;
  children: ReactNode;
}) {
  const { session, language, offline } = useAppStore();
  const router = useRouter();
  const { id, select } = useSelection();
  const [expanded, setExpanded] = useState(false);
  const villages = session?.user.coordinatorVillages || [];
  const village = villages.find((row) => row.id === id) || villages[0];
  const actorId = session?.user.id || "";
  if (!hasCoordinatorRole(session?.user)) return <Redirect href="/home" />;
  if (!village) {
    const t = coordinatorMessages(language);
    const common = messages(language);
    return (
      <Screen>
        <PageSceneHeader
          title={title}
          subtitle={t.coordinatorSubtitle}
          backLabel={common.back}
          onBack={() => router.replace("/home")}
          edgeInset={24}
          topInset={24}
        />
        <Card>
          <Text style={d.sectionTitle}>{session?.user.name}</Text>
          <Text style={d.description}>{t.coordinatorSubtitle}</Text>
        </Card>
        <Text accessibilityRole="header" style={d.sectionTitle}>
          {t.assignmentPending}
        </Text>
        <Text style={d.description}>{t.assignmentPendingHelp}</Text>
        <Button secondary onPress={() => router.replace("/home")}>
          {common.home}
        </Button>
      </Screen>
    );
  }
  return (
    <CoordinatorScope
      key={`${actorId}:${village.id}`}
      title={title}
      back={back}
      compact={compact || form}
      form={form}
      customScreen={customScreen}
      selectVillage={select}
      header={
        showSceneHeader ? (
          <PageSceneHeader
            title={title}
            subtitle={messages(language).activitySubtitle}
            backLabel={messages(language).back}
            onBack={() => router.replace("/home")}
            edgeInset={24}
            topInset={24}
          />
        ) : compact ? (
          <View style={{ gap: 6 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#153F2B",
                  borderWidth: 2,
                  borderColor: "#D9E9DC",
                }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}
                >
                  {language === "mr" ? "सं" : "VC"}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text accessibilityRole="header" style={d.cardTitle}>
                  {session?.user.name} (
                  {coordinatorMessages(language).coordinator})
                </Text>
                <Text style={d.description}>
                  {coordinatorMessages(language).coordinatorSubtitle}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${coordinatorMessages(language).assignedVillage}: ${language === "mr" ? village.nameMr : village.name}`}
                accessibilityState={{
                  expanded,
                  disabled: offline || villages.length < 2,
                }}
                disabled={offline || villages.length < 2}
                onPress={() => setExpanded(!expanded)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  maxWidth: "36%",
                  minHeight: 48,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 1,
                    paddingHorizontal: 9,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#CDE4CF",
                    backgroundColor: "#EDF6EB",
                  }}
                >
                  <Ionicons
                    accessible={false}
                    name="location-outline"
                    size={12}
                    color="#397243"
                  />
                  <Text
                    style={[
                      d.badgeText,
                      {
                        flexShrink: 1,
                        color: "#397243",
                        fontWeight: "400",
                      },
                    ]}
                  >
                    {language === "mr" ? village.nameMr : village.name}
                  </Text>
                  {villages.length > 1 && (
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={12}
                      color="#397243"
                    />
                  )}
                </View>
              </Pressable>
            </View>
            {expanded &&
              !offline &&
              villages.length > 1 &&
              villages.map((item) => (
                <Button
                  key={item.id}
                  secondary={item.id !== village.id}
                  onPress={() => {
                    select(item.id);
                    setExpanded(false);
                  }}
                >
                  {language === "mr" ? item.nameMr : item.name}
                </Button>
              ))}
          </View>
        ) : undefined
      }
      actorId={actorId}
      village={village}
    >
      {!compact && !form && !customScreen && (
        <>
          <Text style={d.description}>
            {coordinatorMessages(language).assignedVillage}
          </Text>
          <View style={{ gap: 6 }}>
            {villages.map((item) => (
              <Button
                key={item.id}
                secondary={item.id !== village.id}
                disabled={offline}
                onPress={() => select(item.id)}
              >
                {language === "mr" ? item.nameMr : item.name}
              </Button>
            ))}
          </View>
        </>
      )}
      {children}
    </CoordinatorScope>
  );
}
function CoordinatorScope({
  actorId,
  village,
  title,
  back,
  compact,
  form,
  customScreen,
  selectVillage,
  header,
  children,
}: {
  actorId: string;
  village: MobileVillage;
  title: string;
  back: boolean;
  compact: boolean;
  form: boolean;
  customScreen: boolean;
  selectVillage: (id: string) => void;
  header?: ReactNode;
  children: ReactNode;
}) {
  const { language, offline } = useAppStore();
  const t = coordinatorMessages(language);
  const router = useRouter();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false),
    [pending, setPending] = useState(false),
    [ready, setReady] = useState(false),
    [failure, setFailure] = useState<string | null>(null);
  const locked = useRef(false),
    mounted = useRef(true);
  const storageKey = `coordinator-pending-${actorId}-${village.id}`;
  useFocusEffect(
    useCallback(() => {
      void client.invalidateQueries({
        queryKey: ["coordinator", actorId, village.id],
      });
    }, [actorId, village.id, client]),
  );
  const current = () =>
    mounted.current &&
    useAppStore.getState().session?.user.id === actorId &&
    !!useAppStore
      .getState()
      .session?.user.coordinatorVillages?.some((row) => row.id === village.id);
  useEffect(() => {
    mounted.current = true;
    void secureOperations
      .read(storageKey)
      .then((raw) => {
        if (raw) pendingCoordinatorSchema.parse(JSON.parse(raw));
        if (mounted.current) {
          setPending(!!raw);
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted.current) setFailure(t.storageError);
      });
    return () => {
      mounted.current = false;
    };
    // The page remounts for every account/village scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  async function send(operation?: Omit<PendingCoordinator, "key">) {
    if (locked.current || !ready || offline || !current()) return null;
    locked.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const result = await sendCoordinatorOperation({
        storage: secureOperations,
        storageKey,
        isCurrent: current,
        operation,
        send: (saved) =>
          authenticatedApi(saved.path, coordinatorMutationSchema, {
            method: saved.method,
            headers: { "Idempotency-Key": saved.key },
            body: JSON.stringify(saved.body),
          }),
      });
      if (result && current()) {
        setPending(false);
        showToast(t.saved, "success");
        await client.invalidateQueries({
          queryKey: ["coordinator", actorId, village.id],
        });
        void client.invalidateQueries({ queryKey: ["marketplace-listings"] });
        void client.invalidateQueries({ queryKey: ["home-listings"] });
      }
      return result;
    } catch (error) {
      if (!current()) return null;
      if (
        error instanceof ApiError &&
        error.status &&
        error.status >= 400 &&
        error.status < 500 &&
        ![401, 408, 429].includes(error.status)
      ) {
        await secureOperations.remove(storageKey).catch(() => undefined);
        if (error.code === "COORDINATOR_REQUIRED") {
          const session = useAppStore.getState().session;
          if (session?.user.id === actorId)
            useAppStore.getState().setSession({
              ...session,
              user: {
                ...session.user,
                isCoordinator: false,
                coordinatorVillages: [],
              },
            });
        }
      }
      const saved = await secureOperations
        .read(storageKey)
        .catch(() => "unknown");
      if (current()) {
        setPending(!!saved);
        setFailure(
          error instanceof ApiError
            ? error.code === "MOBILE_ALREADY_EXISTS" ||
              error.code === "CONFLICT"
              ? t.duplicate
              : error.code === "STALE_VERSION"
                ? t.versionConflict
                : error.code.startsWith("COORDINATOR_")
                  ? t.unavailable
                  : error.code === "VALIDATION_ERROR"
                    ? t.invalid
                    : errorMessage(error, language)
            : error instanceof Error && error.message === "COORDINATOR_PENDING"
              ? t.pending
              : t.storageError,
        );
      }
      return null;
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const write: Scope["write"] = (path, method, body) =>
    send({
      path: `${path}${path.includes("?") ? "&" : "?"}villageId=${village.id}`,
      method,
      body,
    });
  const notices = (
    <>
      {failure && <ErrorMessage message={failure} />}
      {pending && (
        <>
          <Text style={d.description}>{t.pending}</Text>
          <Button loading={busy} disabled={offline} onPress={() => void send()}>
            {t.retryPending}
          </Button>
        </>
      )}
      {offline && (
        <Text style={d.description}>{messages(language).offlineAction}</Text>
      )}
    </>
  );
  return (
    <Context.Provider
      value={{
        actorId,
        village,
        selectVillage,
        busy: busy || !ready,
        pending,
        notices,
        write,
      }}
    >
      {customScreen ? (
        children
      ) : (
        <Screen compact={compact}>
          {form ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <BackButton
                label={messages(language).back}
                disabled={busy}
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/manage")
                }
              />
              <Text
                accessibilityRole="header"
                style={[d.sectionTitle, { flex: 1 }]}
              >
                {title}
              </Text>
            </View>
          ) : (
            back && (
              <BackButton
                label={messages(language).back}
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/manage")
                }
                disabled={busy}
              />
            )
          )}
          {!form &&
            (header || (
              <Text accessibilityRole="header" style={d.sectionTitle}>
                {title}
              </Text>
            ))}
          {failure && <ErrorMessage message={failure} />}
          {pending && (
            <>
              <Text style={d.description}>{t.pending}</Text>
              <Button
                loading={busy}
                disabled={offline}
                onPress={() => void send()}
              >
                {t.retryPending}
              </Button>
            </>
          )}
          {offline ? (
            <Text style={d.description}>
              {messages(language).offlineAction}
            </Text>
          ) : (
            children
          )}
        </Screen>
      )}
    </Context.Provider>
  );
}
export function useCoordinatorQuery<T>(
  path: string,
  schema: z.ZodType<T>,
  parameters: Record<string, string> = {},
) {
  const { actorId, village } = useCoordinator();
  const offline = useAppStore((state) => state.offline);
  const query = new URLSearchParams({ ...parameters, villageId: village.id });
  return useQuery({
    queryKey: ["coordinator", actorId, village.id, path, query.toString()],
    queryFn: ({ signal }) =>
      coordinatorRead(`${path}?${query}`, schema, signal, actorId),
    enabled: !offline,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnMount: "always",
  });
}
export function useCoordinatorPages<
  T extends { page: number; total: number; limit: number },
>(path: string, schema: z.ZodType<T>, parameters: Record<string, string> = {}) {
  const { actorId, village } = useCoordinator();
  const query = new URLSearchParams({
    ...parameters,
    villageId: village.id,
    limit: "20",
  });
  return useInfiniteQuery({
    queryKey: ["coordinator", actorId, village.id, path, query.toString()],
    initialPageParam: 1,
    queryFn: ({ signal, pageParam }) =>
      coordinatorRead(
        `${path}?${query}&page=${pageParam}`,
        schema,
        signal,
        actorId,
      ),
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnMount: "always",
  });
}
async function coordinatorRead<T>(
  path: string,
  schema: z.ZodType<T>,
  signal: AbortSignal,
  actorId: string,
) {
  try {
    return await authenticatedApi(path, schema, { signal });
  } catch (error) {
    if (error instanceof ApiError && error.code === "COORDINATOR_REQUIRED") {
      const session = useAppStore.getState().session;
      if (session?.user.id === actorId)
        useAppStore.getState().setSession({
          ...session,
          user: {
            ...session.user,
            isCoordinator: false,
            coordinatorVillages: [],
          },
        });
    }
    throw error;
  }
}
export function QueryStatus({
  query,
  empty = false,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  empty?: boolean;
}) {
  const { language, offline } = useAppStore();
  const t = coordinatorMessages(language);
  return query.isPending ? (
    <Text style={d.description}>{t.loading}</Text>
  ) : query.isError ? (
    <>
      <ErrorMessage
        message={
          query.error instanceof ApiError && query.error.status === 403
            ? t.noAccess
            : t.failed
        }
      />
      <Button secondary disabled={offline} onPress={() => void query.refetch()}>
        {messages(language).retry}
      </Button>
    </>
  ) : empty ? (
    <Text style={d.description}>{t.empty}</Text>
  ) : null;
}
