import { useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { MobileVillage } from "@gaavli/types";
import { authenticatedApi } from "../session";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useLocalSearchParams,
  useRouter,
  Redirect,
  type Href,
} from "expo-router";
import * as Location from "expo-location";
import type { z } from "zod";
import {
  coordinatorBuyerSchema,
  coordinatorUserEditSchema,
  coordinatorUsersSchema,
  coordinatorUserDetailSchema,
  coordinatorConnectionsSchema,
  villagePageSchema,
  coordinatorActivityPageSchema,
  coordinatorDashboardSchema,
  coordinatorReportsSchema,
  coordinatorReportSchema,
  coordinatorListingSchema,
  coordinatorQuerySchema,
  type coordinatorActivitySchema,
  type coordinatorUserSchema,
} from "@gaavli/validation";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import {
  BackButton,
  Button,
  Input,
  ErrorMessage,
  DropdownField,
  Screen,
  styles as ui,
} from "../components/ui";
import { NavigationCard, Panel, d } from "../components/dashboard/primitives";
import { ListingImage } from "../components/dashboard/ListingImage";
import { theme } from "../theme";
import { addVillageConnections } from "../data/coordinator";
import { coordinatorMessages } from "./i18n";
import {
  CoordinatorPage,
  useCoordinator,
  useCoordinatorPages,
  useCoordinatorQuery,
  QueryStatus,
} from "./context";

const useCopy = () => {
  const language = useAppStore((state) => state.language);
  return {
    language,
    t: coordinatorMessages(language),
    common: messages(language),
  };
};
type User = z.infer<typeof coordinatorUserSchema>;
function Chips({
  choices,
  value,
  onChange,
}: {
  choices: [string, string][];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {choices.map(([id, label]) => (
        <Button key={id} secondary={value !== id} onPress={() => onChange(id)}>
          {label}
        </Button>
      ))}
    </View>
  );
}
function More({
  query,
}: {
  query: {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => unknown;
  };
}) {
  const { t } = useCopy();
  return query.hasNextPage ? (
    <Button
      secondary
      loading={query.isFetchingNextPage}
      onPress={() => void query.fetchNextPage()}
    >
      {t.loadMore}
    </Button>
  ) : null;
}
function Refresh({
  query,
}: {
  query: { refetch: () => unknown; isFetching: boolean };
}) {
  const { t } = useCopy();
  return (
    <Button
      secondary
      loading={query.isFetching}
      onPress={() => void query.refetch()}
    >
      {t.refresh}
    </Button>
  );
}
export function CoordinatorManageScreen() {
  const { t } = useCopy();
  const router = useRouter();
  return (
    <CoordinatorPage title={t.manage} compact>
      <ManageSummary />
      <View style={{ marginTop: 8, gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            columnGap: 12,
            rowGap: 6,
            paddingVertical: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons
              accessible={false}
              name="flash-outline"
              size={16}
              color="#153F2B"
            />
            <Text accessibilityRole="header" style={d.cardTitle}>
              {t.quickActions}
            </Text>
          </View>
          <Text style={d.description}>{t.coordinatorWork}</Text>
        </View>
        <View
          style={{
            gap: 12,
            paddingBottom: 8,
          }}
        >
          <NavigationCard
            icon="person-add-outline"
            title={t.addBuyer}
            subtitle={t.addBuyerHelp}
            onPress={() => router.push("/coordinator/add-buyer")}
          />
          <NavigationCard
            icon="map-outline"
            title={t.connections}
            subtitle={t.connectionsHelp}
            onPress={() => router.push("/coordinator/connections")}
          />
          <NavigationCard
            icon="people-outline"
            title={t.directory}
            subtitle={t.directoryHelp}
            onPress={() => router.push("/coordinator/users")}
          />
        </View>
      </View>
    </CoordinatorPage>
  );
}
function ManageSummary() {
  const { language, t } = useCopy();
  const villageCount = useAppStore(
    (state) => state.session?.user.coordinatorVillages?.length ?? 0,
  );
  const sellers = useCoordinatorQuery(
    "/coordinator/users",
    coordinatorUsersSchema,
    { filter: "sellers", limit: "1" },
  );
  const buyers = useCoordinatorQuery(
    "/coordinator/users",
    coordinatorUsersSchema,
    { filter: "buyers", limit: "1" },
  );
  const number = new Intl.NumberFormat(
    language === "mr" ? "mr-IN-u-nu-deva" : "en-IN",
  );
  const cards = [
    {
      label: t.sellers,
      value: !sellers.isError ? sellers.data?.total : undefined,
      color: "#E0F5EA",
    },
    {
      label: t.buyers,
      value: !buyers.isError ? buyers.data?.total : undefined,
      color: "#EEE8FF",
    },
    { label: t.villages, value: villageCount, color: "#E1EEFF" },
  ];
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {cards.map((card) => (
          <View
            key={card.label}
            style={{
              flexGrow: 1,
              flexBasis: "28%",
              minWidth: 80,
              gap: 4,
              padding: 14,
              borderRadius: 18,
              backgroundColor: card.color,
            }}
          >
            <Text style={[ui.title, { color: theme.colors.heading }]}>
              {card.value === undefined ? "—" : number.format(card.value)}
            </Text>
            <Text style={d.description}>{card.label}</Text>
          </View>
        ))}
      </View>
      <QueryStatus query={sellers} />
      <QueryStatus query={buyers} />
    </View>
  );
}
type BuyerDraft = { firstName: string; lastName: string; mobile: string };
function BuyerForm({
  draft,
  setDraft,
}: {
  draft: BuyerDraft;
  setDraft: (draft: BuyerDraft) => void;
}) {
  const { language, t, common } = useCopy();
  const router = useRouter();
  const scope = useCoordinator();
  const { firstName, lastName, mobile } = draft;
  const setFirst = (value: string) => setDraft({ ...draft, firstName: value });
  const setLast = (value: string) => setDraft({ ...draft, lastName: value });
  const setMobile = (value: string) => setDraft({ ...draft, mobile: value });
  const [villageExpanded, setVillageExpanded] = useState(false);
  const offline = useAppStore((state) => state.offline);
  const assignments = useAppStore(
    (state) => state.session?.user.coordinatorVillages,
  );
  const [selectedVillage, setSelectedVillage] = useState<MobileVillage>(
    scope.village,
  );
  const villageQuery = useInfiniteQuery({
    queryKey: ["buyer-registration-villages", scope.actorId],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      authenticatedApi(
        `/villages?page=${pageParam}&limit=50`,
        villagePageSchema,
        { signal },
      ),
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    enabled: villageExpanded && !offline,
  });
  const villages =
    villageQuery.data?.pages.flatMap((page) => page.villages) ?? [];
  const [invalid, setInvalid] = useState(false),
    [created, setCreated] = useState<string | null>(null);
  const locked = scope.busy || scope.pending;
  const validation = coordinatorBuyerSchema.safeParse({
    firstName,
    lastName,
    mobile,
  });
  const hasError = (field: string) =>
    invalid &&
    !validation.success &&
    validation.error.issues.some((issue) => issue.path[0] === field);
  async function submit() {
    const parsed = coordinatorBuyerSchema.safeParse({
      firstName,
      lastName,
      mobile,
      targetVillageId: selectedVillage.id,
    });
    setInvalid(!parsed.success);
    if (!parsed.success) return;
    const result = await scope.write(
      "/coordinator/buyers",
      "POST",
      parsed.data,
    );
    if (result) setCreated(result.id);
  }
  return created ? (
    <>
      <Panel>
        <Text style={d.cardTitle}>{t.buyerSuccess}</Text>
        <Text style={d.description}>{t.buyerSuccessHelp}</Text>
      </Panel>
      <Button
        onPress={() => {
          setCreated(null);
          setDraft({ firstName: "", lastName: "", mobile: "" });
        }}
      >
        {t.addAnother}
      </Button>
      {assignments?.some((village) => village.id === selectedVillage.id) && (
        <Button
          secondary
          onPress={() => {
            scope.selectVillage(selectedVillage.id);
            router.push(`/coordinator/user/${created}`);
          }}
        >
          {t.viewUser}
        </Button>
      )}
      <Button secondary onPress={() => router.replace("/manage")}>
        {t.backManage}
      </Button>
    </>
  ) : (
    <>
      <Input
        label={common.firstName}
        value={firstName}
        maxLength={60}
        error={hasError("firstName") ? common.nameError : undefined}
        editable={!locked}
        onChangeText={setFirst}
        autoCapitalize="words"
      />
      <Input
        label={common.lastName}
        value={lastName}
        maxLength={60}
        error={hasError("lastName") ? common.nameError : undefined}
        editable={!locked}
        onChangeText={setLast}
        autoCapitalize="words"
      />
      <Input
        label={common.mobile}
        value={mobile}
        maxLength={24}
        error={hasError("mobile") ? common.mobileError : undefined}
        editable={!locked}
        onChangeText={setMobile}
        keyboardType="phone-pad"
      />
      <View style={{ gap: 8 }}>
        <DropdownField
          label={t.village}
          placeholder={t.village}
          value={
            language === "mr" ? selectedVillage.nameMr : selectedVillage.name
          }
          expanded={villageExpanded}
          disabled={locked}
          onPress={() => setVillageExpanded(!villageExpanded)}
        />
        {villageExpanded &&
          villages.map((village) => (
            <Button
              key={village.id}
              secondary={village.id !== selectedVillage.id}
              disabled={locked}
              onPress={() => {
                setVillageExpanded(false);
                setSelectedVillage(village);
              }}
            >
              {`${language === "mr" ? village.nameMr : village.name} · ${village.taluka}, ${village.district}`}
            </Button>
          ))}
        {villageExpanded && (
          <>
            <QueryStatus query={villageQuery} empty={!villages.length} />
            <More query={villageQuery} />
          </>
        )}
      </View>
      {invalid && <ErrorMessage message={t.invalid} />}
      <Text style={d.description}>{t.buyerSuccessHelp}</Text>
      <Button
        disabled={locked}
        loading={scope.busy}
        onPress={() => void submit()}
      >
        {t.addBuyer}
      </Button>
    </>
  );
}
function UserSummary({ user }: { user: User }) {
  const { language, t } = useCopy();
  const roles: Record<string, string> = {
    buyer: t.roleBuyer,
    seller: t.roleSeller,
    coordinator: t.roleCoordinator,
    service_provider: t.roleService,
  };
  return (
    <>
      <Text style={d.cardTitle}>{user.name}</Text>
      <Text style={d.description}>
        {language === "mr" ? user.village.nameMr : user.village.name}
      </Text>
      <Text style={d.description}>{user.mobile || t.unknown}</Text>
      <Text style={d.description}>
        {user.roles.map((role) => roles[role] || role).join(" · ")}
      </Text>
      <Text style={d.description}>
        {user.preRegistered
          ? t.preregistered
          : user.status === "active"
            ? t.active
            : user.status === "blocked"
              ? t.blocked
              : t.pendingAccount}
      </Text>
      <Text style={d.description}>
        {user.mobileVerified === true
          ? t.verified
          : user.mobileVerified === false
            ? t.unverified
            : t.unknown}
      </Text>
    </>
  );
}
function Directory() {
  const { t } = useCopy();
  const router = useRouter();
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const query = useCoordinatorPages(
    "/coordinator/users",
    coordinatorUsersSchema,
    { search, filter },
  );
  const rows = query.data?.pages.flatMap((page) => page.users) || [];
  return (
    <>
      <Input
        label={t.searchUsers}
        value={search}
        maxLength={100}
        onChangeText={setSearch}
        returnKeyType="search"
        onSubmitEditing={() => void query.refetch()}
      />
      <Chips
        choices={[
          ["all", t.all],
          ["buyers", t.buyers],
          ["sellers", t.sellers],
          ["active", t.active],
          ["preregistered", t.preregistered],
        ]}
        value={filter}
        onChange={setFilter}
      />
      <Refresh query={query} />
      <QueryStatus query={query} empty={!rows.length} />
      {!query.isError &&
        rows.map((user) => (
          <Pressable
            key={user.id}
            accessibilityRole="button"
            accessibilityLabel={user.name}
            style={({ pressed }) => [pressed && d.pressed]}
            onPress={() => router.push(`/coordinator/user/${user.id}`)}
          >
            <Panel>
              <UserSummary user={user} />
            </Panel>
          </Pressable>
        ))}
      <More query={query} />
    </>
  );
}
function UserDetail({ id, edit }: { id: string; edit: boolean }) {
  const query = useCoordinatorQuery(
    `/coordinator/users/${id}`,
    coordinatorUserDetailSchema,
  );
  const { t } = useCopy();
  const router = useRouter();
  return (
    <>
      <QueryStatus query={query} />
      <Refresh query={query} />
      {!query.isError &&
        query.data &&
        (edit ? (
          query.data.user.canEdit ? (
            <EditUser
              key={`${id}:${query.data.user.version}`}
              user={query.data.user}
            />
          ) : (
            <Text style={d.description}>{t.editHelp}</Text>
          )
        ) : (
          <>
            <Panel>
              <UserSummary user={query.data.user} />
            </Panel>
            {query.data.user.canEdit && (
              <Button
                onPress={() => router.push(`/coordinator/user/${id}/edit`)}
              >
                {t.editUser}
              </Button>
            )}
            <Text style={d.description}>{t.editHelp}</Text>
            <Text style={d.sectionTitle}>{t.listings}</Text>
            {!query.data.listings.length && (
              <Text style={d.description}>{t.empty}</Text>
            )}
            {query.data.listings.map((listing) => (
              <NavigationCard
                key={listing.id}
                icon="leaf-outline"
                title={listing.productName}
                subtitle={`${listing.quantity ?? t.unknown} ${listing.unit || ""}`}
                onPress={() =>
                  router.push(`/coordinator/listing/${listing.id}`)
                }
              />
            ))}
          </>
        ))}
    </>
  );
}
function EditUser({ user }: { user: User }) {
  const { t, common } = useCopy();
  const scope = useCoordinator();
  const router = useRouter();
  const [firstName, setFirst] = useState(user.firstName || ""),
    [lastName, setLast] = useState(user.lastName || ""),
    [invalid, setInvalid] = useState(false);
  async function save() {
    const parsed = coordinatorUserEditSchema.safeParse({
      firstName,
      lastName,
      version: user.version,
    });
    setInvalid(!parsed.success);
    if (!parsed.success) return;
    if (
      await scope.write(`/coordinator/users/${user.id}`, "PATCH", parsed.data)
    )
      router.back();
  }
  return (
    <>
      <Text style={d.description}>{t.editHelp}</Text>
      <Input
        label={common.firstName}
        value={firstName}
        onChangeText={setFirst}
        maxLength={60}
        editable={!scope.busy && !scope.pending}
      />
      <Input
        label={common.lastName}
        value={lastName}
        onChangeText={setLast}
        maxLength={60}
        editable={!scope.busy && !scope.pending}
      />
      {invalid && <ErrorMessage message={t.invalid} />}
      <Button
        loading={scope.busy}
        disabled={scope.pending}
        onPress={() => void save()}
      >
        {t.save}
      </Button>
    </>
  );
}
function Connections() {
  const { language, t } = useCopy();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [removing, setRemoving] = useState(false);
  const removalLock = useRef(false);
  const scope = useCoordinator();
  const router = useRouter();
  const path = `/coordinator/villages/${scope.village.id}/connections`;
  const query = useCoordinatorPages(path, coordinatorConnectionsSchema);
  const rows = query.data?.pages.flatMap((page) => page.connections) || [];
  const total = query.data?.pages[0]?.total;
  const locked = scope.busy || scope.pending;
  const add = () => router.push("/coordinator/connections/add");
  async function confirmRemove() {
    if (!removeTarget || locked || removalLock.current) return;
    removalLock.current = true;
    setRemoving(true);
    try {
      await scope.write(`${path}/${removeTarget.id}`, "DELETE", {});
    } finally {
      setRemoveTarget(null);
      setRemoving(false);
      removalLock.current = false;
    }
  }
  return (
    <>
      <Text style={d.description}>{t.connectionsIntro}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          padding: 16,
          borderRadius: 14,
          backgroundColor: "#EAF4E6",
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#D4E9CA",
          }}
        >
          <Ionicons
            accessible={false}
            name="location-outline"
            size={24}
            color="#4B8A36"
          />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={d.description}>{t.yourVillage}</Text>
          <Text style={d.cardTitle}>
            {language === "mr" ? scope.village.nameMr : scope.village.name}
          </Text>
          <Text style={d.description}>
            {scope.village.taluka}, {scope.village.district}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text accessibilityRole="header" style={d.sectionTitle}>
          {t.connectedVillages} (
          {total === undefined || query.isError
            ? "—"
            : new Intl.NumberFormat(
                language === "mr" ? "mr-IN-u-nu-deva" : "en-IN",
              ).format(total)}
          )
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: locked }}
          disabled={locked}
          onPress={add}
          style={{
            minHeight: 48,
            justifyContent: "center",
            opacity: locked ? 0.6 : 1,
          }}
        >
          <View
            style={{
              borderRadius: 9,
              backgroundColor: "#FFF1C5",
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text style={[d.description, { color: "#805B16" }]}>
              + {t.addVillage}
            </Text>
          </View>
        </Pressable>
      </View>
      <QueryStatus query={query} />
      {query.isSuccess && total === 0 && (
        <View
          style={{
            flexGrow: 1,
            justifyContent: "center",
            gap: 18,
            paddingVertical: 24,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: "#EAF4E6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              accessible={false}
              name="git-network-outline"
              size={38}
              color="#658F42"
            />
          </View>
          <Text
            accessibilityRole="header"
            style={[d.sectionTitle, { textAlign: "center", flex: 0 }]}
          >
            {t.noConnections}
          </Text>
          <Text style={[d.description, { textAlign: "center" }]}>
            {t.noConnectionsHelp}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: locked }}
            disabled={locked}
            onPress={add}
            style={{
              minHeight: 54,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#658F42",
              borderRadius: 12,
              padding: 12,
              opacity: locked ? 0.6 : 1,
            }}
          >
            <Text style={[ui.buttonText, { color: "#FFFFFF" }]}>
              + {t.addFirstVillage}
            </Text>
          </Pressable>
        </View>
      )}
      {!query.isError &&
        rows.map((row) => (
          <Panel
            key={row.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 12,
              zIndex: menuId === row.id ? 1 : 0,
              flexWrap: "wrap",
            }}
          >
            <View
              style={{
                width: 36,
                height: 40,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#FFF8DF",
              }}
            >
              <Ionicons
                accessible={false}
                name="location"
                size={20}
                color="#E4A018"
              />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={d.cardTitle}>
                {language === "mr" ? row.village.nameMr : row.village.name}
              </Text>
              <Text style={d.description}>
                {row.village.distanceKm === undefined
                  ? `${row.village.taluka} · ${row.village.district}`
                  : `${new Intl.NumberFormat(language === "mr" ? "mr-IN" : "en-IN", { maximumFractionDigits: 1 }).format(row.village.distanceKm)} ${language === "mr" ? "किमी" : "km"}`}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t.connectionOptions}: ${language === "mr" ? row.village.nameMr : row.village.name}`}
              accessibilityState={{
                disabled: locked,
                expanded: menuId === row.id,
              }}
              disabled={locked}
              onPress={() => setMenuId(menuId === row.id ? null : row.id)}
              style={{
                minWidth: 48,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
                opacity: locked ? 0.6 : 1,
              }}
            >
              <Ionicons
                accessible={false}
                name="ellipsis-vertical"
                size={20}
                color={theme.colors.text}
              />
            </Pressable>
            {menuId === row.id && (
              <View
                style={{
                  flexBasis: "100%",
                  borderRadius: theme.radii.control,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  padding: 6,
                  shadowColor: theme.shadow.color,
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 5,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  disabled={locked}
                  accessibilityState={{ disabled: locked }}
                  onPress={() => {
                    setMenuId(null);
                    setRemoveTarget({
                      id: row.id,
                      name:
                        language === "mr"
                          ? row.village.nameMr
                          : row.village.name,
                    });
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 12,
                    minHeight: theme.layout.touchTarget,
                  }}
                >
                  <Ionicons
                    accessible={false}
                    name="trash-outline"
                    size={22}
                    color={theme.colors.error}
                  />
                  <Text
                    style={[
                      d.cardTitle,
                      { color: theme.colors.error, flexShrink: 1 },
                    ]}
                  >
                    {t.remove}
                  </Text>
                </Pressable>
              </View>
            )}
          </Panel>
        ))}
      <More query={query} />
      <Modal
        transparent
        animationType="fade"
        visible={removeTarget !== null}
        onRequestClose={() => {
          if (!removing) setRemoveTarget(null);
        }}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            backgroundColor: theme.colors.overlay,
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 360,
              maxHeight: "90%",
              borderRadius: theme.radii.sheet,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  alignSelf: "center",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 32,
                  backgroundColor: "#FDEAEA",
                }}
              >
                <Ionicons
                  accessible={false}
                  name="trash-outline"
                  size={30}
                  color={theme.colors.error}
                />
              </View>
              <Text
                accessibilityRole="header"
                style={[d.sectionTitle, { flex: 0, textAlign: "center" }]}
              >
                {t.removeConfirmTitle}
              </Text>
              <Text style={[d.description, { textAlign: "center" }]}>
                <Text style={d.cardTitle}>{removeTarget?.name} </Text>
                {t.removeConfirmHelp}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled: removing || locked,
                  busy: removing,
                }}
                disabled={removing || locked}
                onPress={() => void confirmRemove()}
                style={[
                  ui.button,
                  {
                    backgroundColor: theme.colors.error,
                    opacity:
                      removing || locked
                        ? theme.interaction.disabledOpacity
                        : 1,
                  },
                ]}
              >
                {removing && <ActivityIndicator color="#FFFFFF" />}
                <Text style={[ui.buttonText, { color: "#FFFFFF" }]}>
                  {t.yes}
                </Text>
              </Pressable>
              <Button
                secondary
                disabled={removing}
                onPress={() => setRemoveTarget(null)}
              >
                {t.no}
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
function AddConnection() {
  const { language, t, common } = useCopy();
  const scope = useCoordinator();
  const router = useRouter();
  const offline = useAppStore((state) => state.offline);
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("taluka");
  const [selected, setSelected] = useState<Record<string, MobileVillage>>({});
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [coordinates, setCoordinates] = useState<Record<string, string>>({});
  const [locationFailure, setLocationFailure] = useState(false);
  const [locating, setLocating] = useState(false);
  const locked = saving || scope.busy || scope.pending || offline;
  const path = "/coordinator/villages/" + scope.village.id + "/connections";
  const query = useCoordinatorPages(
    "/coordinator/villages/" + scope.village.id + "/candidates",
    villagePageSchema,
    {
      ...(area === "gps" ? coordinates : {}),
      search,
      area: area === "gps" ? "all" : area,
    },
  );
  const rows = query.data?.pages.flatMap((page) => page.villages) || [];
  const count = Object.keys(selected).length;
  const number = new Intl.NumberFormat(
    language === "mr" ? "mr-IN-u-nu-deva" : "en-IN",
    { maximumFractionDigits: 1 },
  );
  const selectionLabel = number.format(count) + " " + t.selectedVillages;
  const back = () =>
    router.canGoBack()
      ? router.back()
      : router.replace("/coordinator/connections");
  async function locate() {
    setLocationFailure(false);
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Location denied");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoordinates({
        latitude: String(location.coords.latitude),
        longitude: String(location.coords.longitude),
      });
      setArea("gps");
    } catch {
      setLocationFailure(true);
    } finally {
      setLocating(false);
    }
  }
  async function save(ids: string[]) {
    if (submitting.current || locked) return;
    submitting.current = true;
    setSaving(true);
    try {
      const complete = await addVillageConnections(
        ids,
        (id) => scope.write(path, "POST", { targetVillageId: id }),
        (id) =>
          setSelected((current) => {
            const next = { ...current };
            delete next[id];
            return next;
          }),
      );
      if (complete) back();
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  function confirm() {
    if (locked || count === 0) return;
    const ids = Object.keys(selected);
    Alert.alert(t.confirmVillages, selectionLabel, [
      { text: common.cancel, style: "cancel" },
      { text: t.add, onPress: () => void save(ids) },
    ]);
  }
  return (
    <Screen
      compact
      footer={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={[d.cardTitle, { flex: 1 }]}>{selectionLabel}</Text>
          <Button
            loading={saving}
            disabled={locked || !count}
            onPress={confirm}
            icon={
              <Ionicons
                accessible={false}
                name="arrow-forward"
                size={18}
                color={theme.colors.onPrimary}
              />
            }
          >
            {`${t.add} (${number.format(count)})`}
          </Button>
        </View>
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <BackButton
          label={common.back}
          onPress={back}
          disabled={saving || scope.busy}
        />
        <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
          <Text
            accessibilityRole="header"
            style={[d.sectionTitle, { flex: 0 }]}
          >
            {t.addVillage}
          </Text>
          <Text style={d.description}>{selectionLabel}</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>
      {scope.notices}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          paddingHorizontal: 12,
        }}
      >
        <Ionicons
          accessible={false}
          name="search-outline"
          size={20}
          color={theme.colors.muted}
        />
        <TextInput
          accessibilityLabel={t.searchVillages}
          placeholder={t.searchVillages}
          placeholderTextColor={theme.colors.muted}
          value={search}
          onChangeText={setSearch}
          editable={!saving}
          maxLength={100}
          style={[
            ui.input,
            {
              flex: 1,
              borderWidth: 0,
              paddingHorizontal: 0,
              backgroundColor: "transparent",
            },
          ]}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[
          [
            "taluka",
            scope.village.taluka
              ? `${scope.village.taluka} ${t.taluka}`
              : t.byTaluka,
          ],
          ["other_talukas", t.otherTalukas],
          ["gps", t.nearbyGps],
        ].map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={value === "gps" ? t.suggestions : label}
            accessibilityState={{
              selected: area === value,
              disabled: saving || locating || offline,
              busy: value === "gps" && locating,
            }}
            disabled={saving || locating || offline}
            onPress={() => {
              if (value === "gps") {
                void locate();
                return;
              }
              setArea(value);
              setCoordinates({});
              setLocationFailure(false);
            }}
            style={[
              d.badge,
              {
                minHeight: 44,
                flex: Math.max(1, Array.from(label).length / 10),
                minWidth: 0,
                paddingHorizontal: 5,
                borderRadius: theme.radii.pill,
                flexDirection: "row",
                gap: 4,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  area === value ? theme.colors.tint : theme.colors.surface,
                borderWidth: 1,
                borderColor:
                  area === value
                    ? theme.colors.focusBorder
                    : theme.colors.border,
                opacity:
                  saving || locating || offline
                    ? theme.interaction.disabledOpacity
                    : 1,
              },
            ]}
          >
            {value === "gps" && locating && (
              <ActivityIndicator
                size="small"
                color={theme.colors.primaryDark}
              />
            )}
            <Text
              numberOfLines={1}
              style={[
                d.description,
                {
                  fontWeight: "600",
                  color: theme.colors.text,
                  flexShrink: 1,
                  textAlign: "center",
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {area !== "gps" && (
        <Text style={d.description}>
          {area === "taluka"
            ? `${scope.village.taluka}, ${scope.village.district}`
            : scope.village.district}
        </Text>
      )}
      {locationFailure && <ErrorMessage message={t.locationDenied} />}
      {!offline && <QueryStatus query={query} empty={!rows.length} />}
      {!offline && !query.isError && (
        <View>
          {rows.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="checkbox"
              accessibilityLabel={
                (language === "mr" ? row.nameMr : row.name) +
                ", " +
                row.taluka +
                ", " +
                row.district
              }
              accessibilityState={{
                checked: !!selected[row.id],
                disabled: locked,
              }}
              disabled={locked}
              onPress={() =>
                setSelected((current) => {
                  const next = { ...current };
                  if (next[row.id]) delete next[row.id];
                  else next[row.id] = row;
                  return next;
                })
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                minHeight: 76,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
                opacity: locked ? 0.6 : 1,
              }}
            >
              <Ionicons
                accessible={false}
                name={selected[row.id] ? "checkbox" : "square-outline"}
                size={24}
                color={
                  selected[row.id]
                    ? theme.colors.primaryDark
                    : theme.colors.muted
                }
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={d.cardTitle}>
                  {language === "mr" ? row.nameMr : row.name}
                </Text>
                <Text style={d.description}>
                  {row.taluka}, {row.district}
                </Text>
              </View>
              {row.distanceKm !== undefined && (
                <Text style={d.description}>
                  {number.format(row.distanceKm)}{" "}
                  {language === "mr" ? "किमी" : "km"}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
      {!offline && <More query={query} />}
    </Screen>
  );
}
function activityTitle(
  action: string,
  t: ReturnType<typeof coordinatorMessages>,
) {
  return (
    (
      {
        registered: t.registered,
        "user.corrected": t.userCorrected,
        "buyer.added": t.newBuyer,
        "seller.activated": t.sellerActivated,
        "listing.created": t.listingCreated,
        "connection.added": t.connectionAdded,
        "connection.removed": t.connectionRemoved,
        "report.created": t.reportCreated,
        "report.dismiss": t.reportDismissed,
        "report.hide": t.reportHidden,
        "report.flag": t.reportFlagged,
        "report.escalate": t.reportEscalated,
      } as Record<string, string>
    )[action] || t.activity
  );
}
function activityDestination(row: z.infer<typeof coordinatorActivitySchema>) {
  return row.type === "listings"
    ? `/coordinator/listing/${row.targetId}`
    : row.type === "mapping"
      ? "/coordinator/connections"
      : row.type === "reports"
        ? `/coordinator/report/${row.targetId}`
        : `/coordinator/user/${row.targetId}`;
}
export function CoordinatorActivityScreen() {
  const { t } = useCopy();
  return (
    <CoordinatorPage title={t.activity} showSceneHeader>
      <Activity />
    </CoordinatorPage>
  );
}
function Activity() {
  const { language, t } = useCopy();
  const router = useRouter();
  const [from, setFrom] = useState(() =>
      new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    ),
    [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [range, setRange] = useState({ from, to }),
    [invalid, setInvalid] = useState(false),
    [type, setType] = useState("all");
  const [action, setAction] = useState("all"),
    [reportStatusFilter, setReportStatusFilter] = useState("all");
  const query = useCoordinatorPages(
    "/coordinator/activity",
    coordinatorActivityPageSchema,
    { ...range, type, action, reportStatus: reportStatusFilter },
  );
  const summary = useCoordinatorQuery(
    "/coordinator/dashboard",
    coordinatorDashboardSchema,
    range,
  );
  const rows = query.data?.pages.flatMap((page) => page.activities) || [];
  const countLabels = {
    users: t.newUsers,
    buyers: t.newBuyers,
    sellers: t.newSellers,
    listings: t.newListings,
    mapping: t.newConnections,
    reports: t.pendingReports,
  };
  return (
    <>
      <Input
        label={t.from}
        value={from}
        onChangeText={setFrom}
        maxLength={10}
      />
      <Input label={t.to} value={to} onChangeText={setTo} maxLength={10} />
      <Text style={d.description}>{t.datesHelp}</Text>
      <Button
        secondary
        onPress={() => {
          const parsed = coordinatorQuerySchema.safeParse({ from, to });
          setInvalid(!parsed.success);
          if (parsed.success) setRange({ from, to });
        }}
      >
        {t.apply}
      </Button>
      {invalid && <ErrorMessage message={t.invalid} />}
      <QueryStatus query={summary} />
      {!summary.isError && summary.data && (
        <View style={{ gap: 8 }}>
          {Object.entries(summary.data.counts).map(([key, count]) => (
            <NavigationCard
              key={key}
              icon="stats-chart-outline"
              title={`${count} · ${countLabels[key as keyof typeof countLabels]}`}
              subtitle={t.activity}
              onPress={() => {
                setType(key);
                setAction(key === "users" ? "registered" : "all");
                setReportStatusFilter(key === "reports" ? "open" : "all");
              }}
            />
          ))}
        </View>
      )}
      <Chips
        choices={[
          ["all", t.all],
          ["users", t.users],
          ["listings", t.listings],
          ["mapping", t.mapping],
          ["reports", t.reports],
        ]}
        value={type}
        onChange={(value) => {
          setType(value);
          setAction("all");
          setReportStatusFilter("all");
        }}
      />
      <Refresh query={query} />
      <QueryStatus query={query} empty={!rows.length} />
      {!query.isError &&
        rows.map((row) => (
          <NavigationCard
            key={row.id}
            icon="time-outline"
            title={activityTitle(row.action, t)}
            subtitle={`${row.name}\n${new Intl.DateTimeFormat(language === "mr" ? "mr-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.createdAt))}`}
            onPress={() => router.push(activityDestination(row) as Href)}
          />
        ))}
      <More query={query} />
      <Button
        secondary
        onPress={() =>
          router.push(`/coordinator/reports?from=${range.from}&to=${range.to}`)
        }
      >
        {t.reports}
      </Button>
      <Button secondary onPress={() => router.push("/coordinator/requests")}>
        {t.personalRequests}
      </Button>
      {useAppStore.getState().session?.user.isSeller && (
        <Button secondary onPress={() => router.push("/my-listings")}>
          {t.ownListings}
        </Button>
      )}
    </>
  );
}
function Reports() {
  const { t } = useCopy();
  const router = useRouter();
  const { from, to } = useLocalSearchParams<{ from?: string; to?: string }>();
  const query = useCoordinatorPages(
    "/coordinator/reports",
    coordinatorReportsSchema,
    { ...(from ? { from } : {}), ...(to ? { to } : {}) },
  );
  const rows = query.data?.pages.flatMap((page) => page.reports) || [];
  return (
    <>
      <Refresh query={query} />
      <QueryStatus query={query} empty={!rows.length} />
      {!query.isError &&
        rows.map((row) => (
          <NavigationCard
            key={row.id}
            icon="flag-outline"
            title={row.productName}
            subtitle={reportStatus(row.status, t)}
            onPress={() => router.push(`/coordinator/report/${row.id}`)}
          />
        ))}
      <More query={query} />
    </>
  );
}
function reportStatus(
  status: string,
  t: ReturnType<typeof coordinatorMessages>,
) {
  return (
    (
      {
        pending: t.pendingStatus,
        dismissed: t.dismissed,
        flagged: t.flagged,
        hidden: t.hidden,
        escalated: t.escalated,
      } as Record<string, string>
    )[status] || status
  );
}
function ReportDetail({ id }: { id: string }) {
  const { t, common } = useCopy();
  const scope = useCoordinator();
  const router = useRouter();
  const query = useCoordinatorQuery(
    `/coordinator/reports/${id}`,
    coordinatorReportSchema,
  );
  function moderate(
    action: "dismiss" | "flag" | "hide" | "escalate",
    title: string,
  ) {
    const report = query.data?.report;
    if (!report) return;
    Alert.alert(title, t.moderationQuestion, [
      { text: common.cancel, style: "cancel" },
      {
        text: title,
        style: action === "hide" ? "destructive" : "default",
        onPress: () =>
          void scope.write(`/coordinator/reports/${id}`, "PATCH", {
            action,
            version: report.version,
          }),
      },
    ]);
  }
  return (
    <>
      <Refresh query={query} />
      <QueryStatus query={query} />
      {!query.isError && query.data && (
        <>
          <Panel>
            <Text style={d.cardTitle}>{query.data.report.productName}</Text>
            <Text style={d.description}>
              {reportStatus(query.data.report.status, t)}
            </Text>
            <Text style={d.cardTitle}>{t.complaint}</Text>
            <Text style={d.description}>{query.data.report.reason}</Text>
          </Panel>
          {query.data.listing && (
            <Button
              secondary
              onPress={() =>
                router.push(
                  `/coordinator/listing/${query.data!.report.listingId}`,
                )
              }
            >
              {t.listingDetail}
            </Button>
          )}
          <Text style={d.description}>{t.readOnly}</Text>
          {(
            [
              ["dismiss", t.dismiss],
              ["flag", t.flag],
              ["hide", t.hide],
              ["escalate", t.escalate],
            ] as const
          ).map(([action, label]) => (
            <Button
              key={action}
              secondary
              disabled={scope.busy || scope.pending}
              onPress={() => moderate(action, label)}
            >
              {label}
            </Button>
          ))}
          <Text style={d.sectionTitle}>{t.history}</Text>
          {query.data.history.map((event, index) => (
            <Panel key={`${event.createdAt}:${index}`}>
              <Text style={d.description}>
                {activityTitle(event.action, t)}
              </Text>
              <Text style={d.description}>
                {new Date(event.createdAt).toLocaleString()}
              </Text>
            </Panel>
          ))}
        </>
      )}
    </>
  );
}
function ListingDetail({ id }: { id: string }) {
  const { t } = useCopy();
  const query = useCoordinatorQuery(
    `/coordinator/listings/${id}`,
    coordinatorListingSchema,
  );
  const row = !query.isError ? query.data?.listing : null;
  return (
    <>
      <QueryStatus query={query} />
      <Refresh query={query} />
      {row && (
        <Panel>
          <ListingImage
            listing={{ photoUrl: row.photoUrl, image: null }}
            style={{
              width: "100%",
              height: 220,
              backgroundColor: theme.colors.tint,
            }}
          />
          <Text style={d.cardTitle}>{row.productName}</Text>
          <Text style={d.description}>{row.description || t.unknown}</Text>
          <Text style={d.description}>
            {t.quantity}: {row.quantity ?? t.unknown} {row.unit || ""}
          </Text>
          <Text style={d.description}>
            {t.price}: {row.price ?? t.unknown}
          </Text>
          <Text style={d.description}>{row.status}</Text>
          <Text style={d.description}>{t.readOnly}</Text>
        </Panel>
      )}
    </>
  );
}
function ActivityDetail({ id }: { id: string }) {
  const query = useCoordinatorQuery(
    `/coordinator/activity/${id}`,
    coordinatorActivityPageSchema,
  );
  const row = !query.isError ? query.data?.activities[0] : null;
  return row ? (
    <Redirect href={activityDestination(row) as Href} />
  ) : (
    <QueryStatus query={query} />
  );
}
export default function CoordinatorScreen() {
  const [buyerDraft, setBuyerDraft] = useState<BuyerDraft>({
    firstName: "",
    lastName: "",
    mobile: "",
  });
  const { path } = useLocalSearchParams<{ path: string[] }>();
  const { t } = useCopy();
  const parts = Array.isArray(path) ? path : [];
  let title = t.manage;
  let content;
  if (parts[0] === "add-buyer") {
    title = t.addBuyer;
    content = <BuyerForm draft={buyerDraft} setDraft={setBuyerDraft} />;
  } else if (parts[0] === "users") {
    title = t.directory;
    content = <Directory />;
  } else if (parts[0] === "user" && parts[1]) {
    title = parts[2] === "edit" ? t.editUser : t.userDetails;
    content = <UserDetail id={parts[1]} edit={parts[2] === "edit"} />;
  } else if (parts[0] === "connections") {
    title = t.connections;
    content = parts[1] === "add" ? <AddConnection /> : <Connections />;
  } else if (parts[0] === "reports") {
    title = t.reports;
    content = <Reports />;
  } else if (parts[0] === "report" && parts[1]) {
    title = t.reportDetail;
    content = <ReportDetail id={parts[1]} />;
  } else if (parts[0] === "listing" && parts[1]) {
    title = t.listingDetail;
    content = <ListingDetail id={parts[1]} />;
  } else if (parts[0] === "activity" && parts[1]) {
    title = t.activity;
    content = <ActivityDetail id={parts[1]} />;
  } else return <Redirect href="/manage" />;
  return (
    <CoordinatorPage
      title={title}
      back
      customScreen={parts[0] === "connections" && parts[1] === "add"}
      form={
        parts[0] === "add-buyer" || (parts[0] === "connections" && !parts[1])
      }
    >
      {content}
    </CoordinatorPage>
  );
}
