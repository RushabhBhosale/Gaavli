import {
  useCallback,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useAppStore } from "../store";
import { messages } from "../i18n";
import { theme } from "../theme";

// The one header every inner screen uses, so the app reads as a single
// product: a steel-blue band (the same colour as Home's banner) with the way
// back, what this page is, and room for actions or a search box below.
//
//   back="/home"   shows a back button; if there is no history it goes there.
//   onBack         use instead when leaving needs work first (saving a draft).
//   children       extra rows inside the band: a search field, chips, stats.
//   overlap        pixels of the band that the first card on the page covers.
export function AppHeader({
  title,
  subtitle,
  eyebrow,
  back,
  onBack,
  backDisabled = false,
  right,
  children,
  overlap = 0,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  back?: Href | true;
  onBack?: () => void;
  backDisabled?: boolean;
  right?: ReactNode;
  children?: ReactNode;
  overlap?: number;
}) {
  const language = useAppStore((state) => state.language);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The app's default status bar is dark; this band is dark, so switch to
  // light icons only while this screen is the one showing.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const showBack = !!(onBack || back);
  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace(back === true || !back ? "/home" : back);
  };
  return (
    <View
      style={[
        s.band,
        { paddingTop: insets.top + 8, paddingBottom: 16 + overlap },
      ]}
    >
      {focused && <StatusBar style="light" />}
      <View pointerEvents="none" style={s.circle} />
      <View style={s.row}>
        {showBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={messages(language).back}
            accessibilityState={{ disabled: backDisabled }}
            disabled={backDisabled}
            hitSlop={6}
            onPress={goBack}
            style={({ pressed }) => [
              s.back,
              backDisabled && s.disabled,
              pressed && s.pressed,
            ]}
          >
            <Ionicons
              accessible={false}
              name="chevron-back"
              size={22}
              color={theme.colors.heroText}
            />
          </Pressable>
        )}
        <View style={s.copy}>
          {!!eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}
          <Text accessibilityRole="header" numberOfLines={2} style={s.title}>
            {title}
          </Text>
          {!!subtitle && (
            <Text numberOfLines={2} style={s.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  band: {
    backgroundColor: theme.colors.primaryDark,
    paddingHorizontal: theme.layout.screenPadding,
    gap: 12,
    overflow: "hidden",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  circle: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    right: -60,
    top: -90,
    backgroundColor: theme.colors.steelSoft,
    opacity: 0.5,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.heroBorder,
  },
  disabled: { opacity: theme.interaction.disabledOpacity },
  pressed: { opacity: theme.interaction.pressedOpacity },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { ...theme.type.caption, color: theme.colors.heroMuted },
  title: { ...theme.type.title, color: theme.colors.heroText },
  subtitle: { ...theme.type.caption, color: theme.colors.heroMuted },
});

// A white search field that sits inside the header band, with an optional
// button (a mic) at its right end.
export function HeaderSearch({
  value,
  onChangeText,
  placeholder,
  label,
  right,
  onSubmit,
  autoFocus = false,
  inputRef,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  label: string;
  right?: ReactNode;
  onSubmit?: () => void;
  autoFocus?: boolean;
  inputRef?: RefObject<TextInput | null>;
}) {
  return (
    <View style={f.field}>
      <Ionicons
        accessible={false}
        name="search"
        size={20}
        color={theme.colors.muted}
      />
      <TextInput
        ref={inputRef}
        autoFocus={autoFocus}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
        returnKeyType="search"
        maxLength={100}
        onSubmitEditing={onSubmit}
        style={f.input}
      />
      {right}
    </View>
  );
}
const f = StyleSheet.create({
  field: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingVertical: 8,
    fontSize: 16,
    color: theme.colors.text,
  },
});

// A small pill button for the header's right side ("Save", "New").
export function HeaderAction({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        a.pill,
        (disabled || loading) && a.off,
        pressed && a.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        !!icon && (
          <Ionicons
            accessible={false}
            name={icon}
            size={18}
            color={theme.colors.primary}
          />
        )
      )}
      <Text style={a.text}>{label}</Text>
    </Pressable>
  );
}
const a = StyleSheet.create({
  pill: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
  },
  off: { opacity: theme.interaction.disabledOpacity },
  pressed: { opacity: theme.interaction.pressedOpacity },
  text: { ...theme.type.label, color: theme.colors.primary },
});
