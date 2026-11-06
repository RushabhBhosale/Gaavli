import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useAppStore } from "../store";
import { formatMessage, messages } from "../i18n";
import { theme } from "../theme";
import { toHomeListing } from "../data/listings";
import { useSearchSuggestions } from "../listings";
import { listingName, type HomeListing } from "../types/home";
import { recentSearchStorage } from "../storage/sqlite";
import {
  addRecentSearch,
  parseRecentSearches,
  POPULAR_SEARCHES,
  splitMatch,
} from "../data/recentSearches";
import {
  marketplaceSearchRoute,
  produceVoiceHints,
  voiceProductSearch,
} from "../data/voiceSearch";
import { useVoiceSearch } from "../hooks/useVoiceSearch";
import {
  VoiceMicButton,
  voiceErrorText,
  voiceStatusText,
} from "../components/VoiceMicButton";
import { ListingImage } from "../components/dashboard/ListingImage";
import { listingRate } from "../components/dashboard/listingText";

const VOICE_HINTS = produceVoiceHints();
const CATEGORIES = [
  ["vegetables", "leaf-outline"],
  ["fruits", "nutrition-outline"],
  ["grain", "basket-outline"],
  ["dairy", "water-outline"],
  ["homemade", "restaurant-outline"],
] as const;

// Full-screen search like a shopping app: tap the box anywhere, see what you
// searched before and what others pick, watch matching products appear as you
// type, and open one in a single tap.
export default function SearchScreen() {
  const router = useRouter();
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const input = useRef<TextInput>(null);
  const [text, setText] = useState("");
  const [typed, setTyped] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => setTyped(text.trim()), 200);
    return () => clearTimeout(timer);
  }, [text]);
  useEffect(() => {
    let active = true;
    void recentSearchStorage
      .read()
      .then((raw) => active && setRecent(parseRecentSearches(raw)))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const suggestions = useSearchSuggestions(typed);
  const [now] = useState(() => Date.now());
  const products = typed
    ? (suggestions.data?.listings ?? []).map((row) => toHomeListing(row, now))
    : [];

  function remember(value: string) {
    const next = addRecentSearch(recent, value);
    setRecent(next);
    void recentSearchStorage.write(JSON.stringify(next)).catch(() => undefined);
  }
  function search(value: string, group?: string | null) {
    Keyboard.dismiss();
    if (value.trim()) remember(value);
    router.replace(marketplaceSearchRoute(value, group));
  }
  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  }
  const voice = useVoiceSearch({
    language,
    scope: "search",
    hints: VOICE_HINTS,
    onResult: (transcript) => {
      const spoken = voiceProductSearch(transcript, language);
      if (spoken.text) search(spoken.text, spoken.productGroup);
    },
  });
  const note =
    voiceStatusText(t, voice.status) ?? voiceErrorText(t, voice.error);
  const popular = POPULAR_SEARCHES.map((item) =>
    language === "en" ? item.en : item.mr,
  );
  const categoryLabels: Record<string, string> = {
    vegetables: t.vegetables,
    fruits: t.fruits,
    grain: t.grains,
    dairy: t.dairy,
    homemade: t.homemade,
  };

  const empty = (
    <View style={s.sections}>
      {!!recent.length && (
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text accessibilityRole="header" style={s.sectionTitle}>
              {t.searchRecent}
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => {
                setRecent([]);
                void recentSearchStorage.write("[]").catch(() => undefined);
              }}
            >
              <Text style={s.link}>{t.searchClear}</Text>
            </Pressable>
          </View>
          {recent.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              onPress={() => search(item)}
              style={({ pressed }) => [s.recent, pressed && s.pressed]}
            >
              <Ionicons
                accessible={false}
                name="time-outline"
                size={20}
                color={theme.colors.muted}
              />
              <Text numberOfLines={1} style={s.recentText}>
                {item}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item}
                hitSlop={10}
                onPress={() => {
                  setText(item);
                  input.current?.focus();
                }}
              >
                <Ionicons
                  accessible={false}
                  name="arrow-up-outline"
                  size={18}
                  color={theme.colors.inactive}
                  style={s.fill}
                />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}
      <View style={s.section}>
        <Text accessibilityRole="header" style={s.sectionTitle}>
          {t.searchPopular}
        </Text>
        <View style={s.chips}>
          {popular.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              onPress={() => search(item)}
              style={({ pressed }) => [s.chip, pressed && s.pressed]}
            >
              <Ionicons
                accessible={false}
                name="trending-up-outline"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={s.chipText}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={s.section}>
        <Text accessibilityRole="header" style={s.sectionTitle}>
          {t.searchCategories}
        </Text>
        <View style={s.grid}>
          {CATEGORIES.map(([group, icon]) => (
            <Pressable
              key={group}
              accessibilityRole="button"
              onPress={() => search("", group)}
              style={({ pressed }) => [s.tile, pressed && s.pressed]}
            >
              <View style={s.tileIcon}>
                <Ionicons
                  accessible={false}
                  name={icon}
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <Text numberOfLines={2} style={s.tileText}>
                {categoryLabels[group]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.searchBack}
          hitSlop={8}
          onPress={close}
          style={({ pressed }) => [s.back, pressed && s.pressed]}
        >
          <Ionicons
            accessible={false}
            name="arrow-back"
            size={24}
            color={theme.colors.heading}
          />
        </Pressable>
        <View style={s.field}>
          <Ionicons
            accessible={false}
            name="search"
            size={20}
            color={theme.colors.muted}
          />
          <TextInput
            ref={input}
            autoFocus
            value={text}
            onChangeText={(value) => {
              if (voice.status !== "idle") voice.cancel();
              voice.clearError();
              setText(value);
            }}
            placeholder={t.homeSearchHint}
            placeholderTextColor={theme.colors.placeholder}
            accessibilityLabel={t.marketplaceSearchPlaceholder}
            returnKeyType="search"
            maxLength={100}
            onSubmitEditing={() => search(text)}
            style={s.input}
          />
          {!!text && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.searchClear}
              hitSlop={8}
              onPress={() => {
                setText("");
                input.current?.focus();
              }}
            >
              <Ionicons
                accessible={false}
                name="close-circle"
                size={20}
                color={theme.colors.inactive}
              />
            </Pressable>
          )}
          <VoiceMicButton
            status={voice.status}
            onStart={voice.start}
            onFinish={voice.finish}
            onCancel={voice.cancel}
            t={t}
          />
        </View>
      </View>
      {!!note && (
        <Text accessibilityLiveRegion="polite" style={s.note}>
          {note}
        </Text>
      )}
      <FlatList
        data={typed ? products : []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.list}
        ListHeaderComponent={
          typed ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => search(typed)}
              style={({ pressed }) => [s.searchFor, pressed && s.pressed]}
            >
              <Ionicons
                accessible={false}
                name="search"
                size={20}
                color={theme.colors.primary}
              />
              <Text numberOfLines={1} style={s.searchForText}>
                {formatMessage(t.searchFor, { text: typed })}
              </Text>
              <Ionicons
                accessible={false}
                name="chevron-forward"
                size={18}
                color={theme.colors.inactive}
              />
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          typed ? (
            suggestions.isFetching ? null : (
              <Text style={s.none}>
                {formatMessage(t.searchNoMatches, { text: typed })}
              </Text>
            )
          ) : (
            empty
          )
        }
        renderItem={({ item }) => (
          <Suggestion
            listing={item}
            query={typed}
            language={language}
            onPress={() => {
              remember(typed);
              router.replace({
                pathname: "/product/[id]",
                params: { id: item.id },
              });
            }}
          />
        )}
      />
    </SafeAreaView>
  );
}

function Suggestion({
  listing,
  query,
  language,
  onPress,
}: {
  listing: HomeListing;
  query: string;
  language: "en" | "mr" | "hi";
  onPress: () => void;
}) {
  const t = messages(language);
  const name = listingName(listing, language);
  const part = splitMatch(name, query);
  const sellers = listing.offerCount ?? 1;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${listingRate(listing, language)}`}
      onPress={onPress}
      style={({ pressed }) => [s.item, pressed && s.pressed]}
    >
      <View style={s.itemImage}>
        <ListingImage listing={listing} style={s.photo} iconSize={22} />
      </View>
      <View style={s.itemBody}>
        <Text numberOfLines={1} style={s.itemName}>
          {part.before}
          <Text style={s.itemMatch}>{part.match}</Text>
          {part.after}
        </Text>
        <Text numberOfLines={1} style={s.itemMeta}>
          {sellers > 1
            ? formatMessage(t.sellerCount, { count: String(sellers) })
            : language !== "en"
              ? listing.villageMr
              : listing.village}
        </Text>
      </View>
      <Text numberOfLines={1} style={s.itemPrice}>
        {listingRate(listing, language)}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  back: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 12,
    paddingRight: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    paddingVertical: 8,
    fontSize: 16,
    color: theme.colors.text,
  },
  note: {
    ...theme.type.caption,
    color: theme.colors.saffronText,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  list: { paddingBottom: 24 },
  sections: { gap: 22, padding: 20 },
  section: { gap: 10 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { ...theme.type.heading, color: theme.colors.heading },
  link: { ...theme.type.label, color: theme.colors.primary },
  recent: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recentText: { ...theme.type.body, color: theme.colors.text, flex: 1 },
  fill: { transform: [{ rotate: "-45deg" }] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  chipText: { ...theme.type.label, color: theme.colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "31%",
    flexGrow: 1,
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 10,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: {
    ...theme.type.micro,
    color: theme.colors.heading,
    textAlign: "center",
  },
  searchFor: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  searchForText: {
    ...theme.type.subheading,
    color: theme.colors.heading,
    flex: 1,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.tint,
  },
  photo: { width: "100%", height: "100%" },
  itemBody: { flex: 1, minWidth: 0 },
  itemName: { ...theme.type.subheading, color: theme.colors.text },
  itemMatch: { color: theme.colors.primary, fontWeight: "800" },
  itemMeta: { ...theme.type.caption, color: theme.colors.saffronText },
  itemPrice: { ...theme.type.subheading, color: theme.colors.saffronText },
  none: { ...theme.type.body, color: theme.colors.muted, padding: 20 },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
