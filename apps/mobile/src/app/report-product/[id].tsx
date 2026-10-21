import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  listingIdSchema,
  listingReportInputSchema,
  coordinatorMutationSchema,
} from "@gaavli/validation";
import { useAppStore } from "../../store";
import { useListing } from "../../listings";
import { authenticatedApi } from "../../session";
import { ApiError } from "../../api/client";
import { messages } from "../../i18n";
import { errorMessage } from "../../errors";
import { coordinatorMessages } from "../../coordinator/i18n";
import {
  pendingCoordinatorSchema,
  sendCoordinatorOperation,
} from "../../data/coordinator";
import {
  Screen,
  BackButton,
  Input,
  Button,
  ErrorMessage,
} from "../../components/ui";
import { d } from "../../components/dashboard/primitives";
const storage = {
  read: (key: string) => SecureStore.getItemAsync(key),
  write: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
export default function ReportProduct() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAppStore((state) => state.session);
  if (!session) return <Redirect href="/register" />;
  if (!listingIdSchema.safeParse(id).success) return <Redirect href="/home" />;
  return (
    <ReportForm
      key={`${session.user.id}:${session.user.village?.id}:${id}`}
      id={id}
      actorId={session.user.id}
    />
  );
}
function ReportForm({ id, actorId }: { id: string; actorId: string }) {
  const { language, offline, session } = useAppStore();
  const t = coordinatorMessages(language),
    common = messages(language);
  const router = useRouter();
  const query = useListing(id);
  const [reason, setReason] = useState(""),
    [pending, setPending] = useState(false),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [failure, setFailure] = useState<string | null>(null);
  const locked = useRef(false),
    mounted = useRef(true);
  const villageId = session?.user.village?.id;
  const storageKey = `listing-report-${actorId}-${id}`;
  useEffect(() => {
    mounted.current = true;
    void storage
      .read(storageKey)
      .then((raw) => {
        const saved = raw
          ? pendingCoordinatorSchema.parse(JSON.parse(raw))
          : null;
        if (mounted.current) {
          if (saved)
            setReason(listingReportInputSchema.parse(saved.body).reason);
          setPending(!!saved);
          setReady(true);
        }
      })
      .catch(() => setFailure(t.storageError));
    return () => {
      mounted.current = false;
    };
  }, [storageKey, t.storageError]);
  const current = () =>
    mounted.current &&
    useAppStore.getState().session?.user.id === actorId &&
    useAppStore.getState().session?.user.village?.id === villageId;
  async function submit() {
    if (offline || locked.current || !ready) return;
    const parsed = listingReportInputSchema.safeParse({ reason });
    if (!parsed.success) {
      setFailure(t.invalid);
      return;
    }
    locked.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const result = await sendCoordinatorOperation({
        storage,
        storageKey,
        isCurrent: current,
        operation: pending
          ? undefined
          : {
              path: `/listings/${id}/reports`,
              method: "POST",
              body: parsed.data,
            },
        send: (saved) =>
          authenticatedApi(saved.path, coordinatorMutationSchema, {
            method: saved.method,
            headers: { "Idempotency-Key": saved.key },
            body: JSON.stringify(saved.body),
          }),
      });
      if (result && current()) {
        setDone(true);
        setPending(false);
      }
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status &&
        error.status >= 400 &&
        error.status < 500 &&
        ![401, 408, 429].includes(error.status)
      )
        await storage.remove(storageKey).catch(() => undefined);
      const raw = await storage.read(storageKey).catch(() => "unknown");
      if (current()) {
        setPending(!!raw);
        setFailure(
          error instanceof ApiError && error.code === "REPORT_ALREADY_EXISTS"
            ? t.reportAlreadyExists
            : errorMessage(error, language),
        );
      }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Screen>
      <BackButton
        label={common.back}
        disabled={busy}
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/home")
        }
      />
      <Text style={d.sectionTitle}>
        {done ? t.reportSubmitted : t.reportProduct}
      </Text>
      {query.data && <Text style={d.cardTitle}>{query.data.productName}</Text>}
      {done ? (
        <Button onPress={() => router.back()}>{common.back}</Button>
      ) : (
        <>
          <Text style={d.description}>{t.reportHelp}</Text>
          <Input
            label={t.reportReason}
            value={reason}
            multiline
            maxLength={1000}
            style={{ minHeight: 120, textAlignVertical: "top" }}
            editable={ready && !busy && !pending}
            onChangeText={setReason}
          />
          {pending && <Text style={d.description}>{t.pending}</Text>}
          {offline && <Text style={d.description}>{common.offlineAction}</Text>}
          {failure && <ErrorMessage message={failure} />}
          <Button
            loading={busy}
            disabled={offline || !ready || (!query.data && !pending)}
            onPress={() => void submit()}
          >
            {pending ? t.retryPending : t.reportProduct}
          </Button>
        </>
      )}
    </Screen>
  );
}
