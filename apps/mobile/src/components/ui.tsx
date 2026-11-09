import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "../theme";
import { useAppStore } from "../store";
import { messages } from "../i18n";

export function Screen({
  children,
  compact = false,
  footer,
  topContent,
  header,
}: {
  children: ReactNode;
  compact?: boolean;
  footer?: ReactNode;
  topContent?: ReactNode;
  // An AppHeader. It sits above everything and draws behind the status bar,
  // so the page content below only needs the bottom and side safe areas.
  header?: ReactNode;
}) {
  const offline = useAppStore((state) => state.offline);
  const language = useAppStore((state) => state.language);
  return (
    <View style={styles.safe}>
      {header}
      <SafeAreaView
        edges={header ? ["left", "right", "bottom"] : undefined}
        style={styles.flex}
      >
        {topContent}
        {offline && <OfflineBanner message={messages(language).offline} />}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={[
              styles.content,
              compact && { paddingTop: 8, gap: 12 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// One primary action per screen: solid saffron. Secondary actions are steel
// blue tints, outlines or plain text, so the main choice is always obvious.
export function Button({
  children,
  onPress,
  disabled = false,
  loading = false,
  secondary = false,
  outlined = false,
  danger = false,
  ghost = false,
  icon,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  outlined?: boolean;
  danger?: boolean;
  ghost?: boolean;
  icon?: ReactNode;
}) {
  const quiet = secondary || outlined || danger || ghost;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        outlined && styles.outlined,
        danger && styles.danger,
        ghost && styles.ghost,
        pressed && !quiet && styles.primaryPressed,
        pressed && quiet && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading && (
        <ActivityIndicator
          color={quiet ? theme.colors.primary : theme.colors.onPrimary}
        />
      )}
      {icon}
      <Text
        style={[
          styles.buttonText,
          (secondary || ghost) && styles.secondaryText,
          outlined && styles.outlinedText,
          danger && styles.dangerText,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function OfflineBanner({ message }: { message: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.offline}>
      <Ionicons
        accessible={false}
        name="cloud-offline-outline"
        size={18}
        color={theme.colors.warning}
      />
      <Text style={styles.offlineText}>{message}</Text>
    </View>
  );
}
export function BackButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.back,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        accessible={false}
        name="chevron-back"
        size={22}
        color={theme.colors.heading}
      />
    </Pressable>
  );
}
// Top bar for inner screens: where you are, and the way back.
export function ScreenHeader({
  title,
  subtitle,
  backLabel,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack && backLabel ? (
        <BackButton label={backLabel} onPress={onBack} />
      ) : null}
      <View style={styles.headerCopy}>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
export function DropdownField({
  label,
  value,
  placeholder,
  expanded,
  disabled = false,
  error,
  onPress,
}: {
  label: string;
  value?: string;
  placeholder: string;
  expanded: boolean;
  disabled?: boolean;
  error?: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        accessibilityState={{ expanded, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.input,
          styles.dropdown,
          (expanded || pressed) && styles.inputFocused,
          !!error && styles.inputError,
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.dropdownValue, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Ionicons
          accessible={false}
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.colors.muted}
        />
      </Pressable>
      {error && <ErrorMessage message={error} />}
    </View>
  );
}
export function LocationPin() {
  return (
    <View accessible={false} style={styles.pinArea}>
      <View style={styles.pin}>
        <View style={styles.pinHole} />
      </View>
    </View>
  );
}
export function ActionCard({
  title,
  subtitle,
  icon,
  onPress,
  disabled = false,
  loading = false,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <View style={styles.pinArea}>
          <ActivityIndicator color={theme.colors.icon} />
        </View>
      ) : (
        icon
      )}
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}
export function Input({
  label,
  error,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          props.editable === false && styles.disabled,
          props.style,
        ]}
        placeholderTextColor={theme.colors.placeholder}
      />
      {error && <ErrorMessage message={error} />}
    </View>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return (
    <View style={styles.errorRow}>
      <Ionicons
        accessible={false}
        name="alert-circle"
        size={18}
        color={theme.colors.error}
        style={styles.errorIcon}
      />
      <Text
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={styles.error}
      >
        {message}
      </Text>
    </View>
  );
}
export function LoadingState({ label }: { label: string }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={styles.loading}
    >
      <ActivityIndicator color={theme.colors.primary} />
      <Text style={styles.body}>{label}</Text>
    </View>
  );
}
// An empty, failed or offline state: what happened, and what to do about it.
export function StateMessage({
  icon = "leaf-outline",
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Ionicons
          accessible={false}
          name={icon}
          size={26}
          color={theme.colors.primary}
        />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {body ? <Text style={styles.stateBody}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Button secondary onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
// A filter or choice pill. Selected is solid saffron so the current filter is
// never in doubt.
export function Chip({
  label,
  selected = false,
  onPress,
  count,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  count?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={count ? `${label}, ${count}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {count ? `${label} (${count})` : label}
      </Text>
    </Pressable>
  );
}
// Grey placeholder cards in the shape of the content that is on its way, so a
// slow connection feels like a page filling in rather than a spinner. Screen
// readers hear the label once instead of empty boxes.
export function SkeletonList({
  rows = 3,
  label,
}: {
  rows?: number;
  label: string;
}) {
  const [pulse] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={styles.skeletonList}
    >
      {Array.from({ length: rows }, (_, index) => (
        <Animated.View
          key={index}
          style={[styles.skeletonCard, { opacity: pulse }]}
        >
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonBar, { width: "62%" }]} />
            <View style={[styles.skeletonBar, { width: "40%" }]} />
            <View
              style={[
                styles.skeletonBar,
                styles.skeletonPrice,
                { width: "28%" },
              ]}
            />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}
// The Gaavli mark: a bold "ग" tile with the wordmark in both scripts.
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Gaavli"
      style={styles.brand}
    >
      <View style={[styles.markTile, compact && styles.markTileCompact]}>
        <Text
          allowFontScaling={false}
          style={[styles.markGlyph, compact && styles.markGlyphCompact]}
        >
          ग
        </Text>
      </View>
      <View style={styles.wordmark}>
        <Text
          allowFontScaling={false}
          style={[styles.brandName, compact && styles.brandNameCompact]}
        >
          गावली
        </Text>
        <Text allowFontScaling={false} style={styles.brandLatin}>
          G A A V L I
        </Text>
      </View>
    </View>
  );
}
export const styles = StyleSheet.create({
  skeletonList: { gap: 10 },
  skeletonCard: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  skeletonImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: theme.colors.skeleton,
  },
  skeletonLines: { flex: 1, justifyContent: "center", gap: 8 },
  skeletonBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.skeleton,
  },
  skeletonPrice: { height: 14, backgroundColor: theme.colors.saffronTint },
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    flexGrow: 1,
    padding: theme.layout.screenPadding,
    gap: 16,
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
  },
  footer: {
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  title: { ...theme.type.title, color: theme.colors.heading },
  body: { ...theme.type.body, color: theme.colors.muted },
  label: { ...theme.type.label, color: theme.colors.text },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerCopy: { flex: 1, gap: 1 },
  headerTitle: { ...theme.type.title, color: theme.colors.heading },
  headerSubtitle: { ...theme.type.caption, color: theme.colors.muted },
  button: {
    minHeight: 52,
    borderRadius: theme.radii.control,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    lineHeight: 24,
    includeFontPadding: true,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
  },
  primaryPressed: { backgroundColor: theme.colors.primaryPressed },
  secondary: {
    backgroundColor: theme.colors.steelTint,
    borderWidth: 1,
    borderColor: "transparent",
  },
  secondaryText: { color: theme.colors.steel },
  outlined: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  outlinedText: { color: theme.colors.steel },
  danger: {
    backgroundColor: theme.colors.errorBackground,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dangerText: { color: theme.colors.error },
  ghost: { backgroundColor: "transparent", minHeight: 44 },
  disabled: { opacity: theme.interaction.disabledOpacity },
  pressed: { opacity: theme.interaction.pressedOpacity },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 12,
  },
  field: { gap: 8 },
  input: {
    minHeight: 52,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  inputFocused: { borderColor: theme.colors.focusBorder, borderWidth: 1.5 },
  inputError: { borderColor: theme.colors.error },
  placeholder: { color: theme.colors.placeholder },
  dropdown: { flexDirection: "row", alignItems: "center", gap: 12 },
  dropdownValue: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionCard: {
    backgroundColor: theme.colors.steelTint,
    borderRadius: theme.radii.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 76,
  },
  actionCopy: { flex: 1, gap: 4 },
  actionTitle: { ...theme.type.subheading, color: theme.colors.text },
  actionSubtitle: { ...theme.type.caption, color: theme.colors.muted },
  pinArea: {
    width: 30,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  pin: {
    width: 26,
    height: 26,
    backgroundColor: theme.colors.icon,
    borderRadius: 14,
    borderBottomRightRadius: 2,
    transform: [{ rotate: "45deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  pinHole: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.colors.steelTint,
  },
  errorRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  errorIcon: { marginTop: 2 },
  error: { flex: 1, color: theme.colors.error, fontSize: 14, lineHeight: 21 },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 32,
  },
  state: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.saffronTint,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    ...theme.type.subheading,
    color: theme.colors.heading,
    textAlign: "center",
  },
  stateBody: {
    ...theme.type.caption,
    color: theme.colors.muted,
    textAlign: "center",
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radii.chip,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: { ...theme.type.label, color: theme.colors.text },
  chipTextSelected: { color: theme.colors.onPrimary },
  offline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.warningBackground,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  offlineText: {
    flex: 1,
    color: theme.colors.warning,
    fontSize: 14,
    lineHeight: 21,
  },
  brand: { alignItems: "center", gap: 14 },
  markTile: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  markTileCompact: { width: 52, height: 52, borderRadius: 15 },
  markGlyph: {
    fontSize: 54,
    lineHeight: 74,
    fontWeight: "800",
    color: theme.colors.onPrimary,
    includeFontPadding: true,
  },
  markGlyphCompact: { fontSize: 32, lineHeight: 46 },
  wordmark: { alignItems: "center", gap: 2 },
  brandName: {
    fontSize: 34,
    lineHeight: 48,
    fontWeight: "800",
    color: theme.colors.primaryDark,
    includeFontPadding: true,
  },
  brandNameCompact: { fontSize: 24, lineHeight: 34 },
  brandLatin: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    letterSpacing: 2,
    color: theme.colors.muted,
  },
});
