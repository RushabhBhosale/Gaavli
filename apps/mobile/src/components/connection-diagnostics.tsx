import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { healthStatusSchema } from "@gaavli/validation";
import { api } from "../api";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { Button, Card, ErrorMessage, styles } from "./ui";

export function ConnectionDiagnostics() {
  const language = useAppStore((state) => state.language);
  const offline = useAppStore((state) => state.offline);
  const t = messages(language);
  const query = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => api("/health", healthStatusSchema, { signal }),
    enabled: false,
    retry: false,
  });
  return (
    <Card>
      <Text style={styles.label}>{t.diagnostics}</Text>
      <Button
        secondary
        disabled={offline}
        loading={query.isFetching}
        onPress={() => void query.refetch()}
      >
        {query.isFetching ? t.checking : t.checkConnection}
      </Button>
      {!query.isFetching && query.isSuccess && (
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {t.connected}
        </Text>
      )}
      {!query.isFetching && query.isError && (
        <ErrorMessage message={t.connectionError} />
      )}
    </Card>
  );
}
