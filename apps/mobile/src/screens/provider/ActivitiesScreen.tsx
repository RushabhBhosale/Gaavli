import { Redirect, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { PROVIDER_KINDS, providerKind } from "@gaavli/constants";
import { useAppStore } from "../../store";
import { formatMessage, messages } from "../../i18n";
import { theme } from "../../theme";
import { errorMessage } from "../../errors";
import { useMyProviderProfiles } from "../../providerProfiles";
import {
  BackButton,
  Button,
  Card,
  ErrorMessage,
  Screen,
  styles,
} from "../../components/ui";

// "My Activities": the marketplace plus every profile registered on this
// account, with anything waiting for an answer called out.
export default function ActivitiesScreen() {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const query = useMyProviderProfiles();
  if (!session) return <Redirect href="/register" />;
  const profiles = query.data?.profiles ?? [];
  const links = query.data?.links ?? [];
  return (
    <Screen>
      <BackButton
        label={t.back}
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/home")
        }
      />
      <Text accessibilityRole="header" style={styles.title}>
        {t.actTitle}
      </Text>
      <Text style={styles.body}>{t.actSubtitle}</Text>
      <Card>
        <Text style={s.title}>{t.actMarketplace}</Text>
        <Text style={s.hint}>{t.actMarketplaceHelp}</Text>
        <Button
          secondary
          onPress={() =>
            router.push(
              session.user.isSeller ? "/my-listings" : "/become-seller",
            )
          }
        >
          {t.actManage}
        </Button>
      </Card>
      {query.isError && (
        <ErrorMessage message={errorMessage(query.error, language)} />
      )}
      {query.isSuccess && !profiles.length && (
        <Text style={styles.body}>{t.actEmpty}</Text>
      )}
      {profiles.map((profile) => {
        const kind =
          providerKind(profile.providerType) ?? PROVIDER_KINDS.OTHER_SERVICE;
        const waiting = links.filter(
          (link) =>
            link.needsMyAnswer &&
            link.status === "PENDING" &&
            (link.facility.id === profile.id || link.doctor.id === profile.id),
        ).length;
        const doctors = links.filter(
          (link) =>
            link.facility.id === profile.id && link.status === "CONFIRMED",
        ).length;
        return (
          <Card key={profile.id}>
            <Text style={s.kind}>{kind.title[language]}</Text>
            <Text style={s.title}>{profile.name}</Text>
            <Text style={s.hint}>
              {profile.village[language === "en" ? "name" : "nameMr"]}
            </Text>
            {profile.status !== "ACTIVE" && (
              <Text style={s.warn}>{t.actInactive}</Text>
            )}
            {profile.practice?.facility && (
              <Text style={s.hint}>
                {formatMessage(t.actLinkedTo, {
                  name: profile.practice.facility.name,
                })}
              </Text>
            )}
            {doctors > 0 && (
              <Text style={s.hint}>
                {formatMessage(t.actLinkedDoctors, { count: String(doctors) })}
              </Text>
            )}
            {waiting > 0 && (
              <Text style={s.warn}>
                {formatMessage(t.actWaiting, { count: String(waiting) })}
              </Text>
            )}
            <Button
              secondary
              onPress={() =>
                router.push({
                  pathname: "/provider/[id]",
                  params: { id: profile.id },
                })
              }
            >
              {t.actManage}
            </Button>
          </Card>
        );
      })}
      <View style={{ gap: 12 }}>
        <Button secondary onPress={() => router.push("/provider/type")}>
          {t.actAdd}
        </Button>
        <Button onPress={() => router.replace("/home")}>{t.home}</Button>
      </View>
    </Screen>
  );
}
const s = StyleSheet.create({
  kind: {
    ...theme.type.micro,
    color: theme.colors.saffronText,
    letterSpacing: 0.5,
  },
  title: { ...theme.type.heading, color: theme.colors.heading },
  hint: { ...theme.type.caption, color: theme.colors.muted },
  warn: { ...theme.type.label, color: theme.colors.saffronText },
});
