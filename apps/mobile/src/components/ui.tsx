import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
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
}: {
  children: ReactNode;
  compact?: boolean;
  footer?: ReactNode;
}) {
  const offline = useAppStore((state) => state.offline);
  const language = useAppStore((state) => state.language);
  return (
    <SafeAreaView style={styles.safe}>
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
        {footer && (
          <View
            style={{
              paddingHorizontal: theme.layout.screenPadding,
              paddingVertical: 12,
              backgroundColor: theme.colors.surface,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}
          >
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Button({
  children,
  onPress,
  disabled = false,
  loading = false,
  secondary = false,
  outlined = false,
  icon,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  outlined?: boolean;
  icon?: ReactNode;
}) {
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
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading && (
        <ActivityIndicator
          color={
            secondary || outlined
              ? theme.colors.primary
              : theme.colors.onPrimary
          }
        />
      )}
      {icon}
      <Text
        style={[
          styles.buttonText,
          (secondary || outlined) && styles.secondaryText,
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
        size={24}
        color={theme.colors.text}
      />
    </Pressable>
  );
}
export function DropdownField({
  label,
  value,
  placeholder,
  expanded,
  disabled = false,
  onPress,
}: {
  label: string;
  value?: string;
  placeholder: string;
  expanded: boolean;
  disabled?: boolean;
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
          (expanded || pressed || !!value) && styles.inputFocused,
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.dropdownValue, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Text accessible={false} style={styles.chevron}>
          ⌄
        </Text>
      </Pressable>
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
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.error}
    >
      {message}
    </Text>
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
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brand}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.mark, compact && { transform: [{ scale: 0.75 }] }]}
      >
        <View style={styles.sun} />
        <View style={[styles.leaf, styles.leftLeaf]} />
        <View style={[styles.leaf, styles.rightLeaf]} />
        <View style={styles.stem} />
      </View>
      <Text style={[styles.brandText, compact && { fontSize: 28 }]}>
        Gaavli
      </Text>
    </View>
  );
}
export const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    flexGrow: 1,
    padding: theme.layout.screenPadding,
    gap: theme.spacing,
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    alignSelf: "center",
  },
  title: {
    fontSize: 27,
    lineHeight: 36,
    fontWeight: "700",
    color: theme.colors.heading,
  },
  body: { fontSize: 16, lineHeight: 24, color: theme.colors.muted },
  label: { fontSize: 16, fontWeight: "500", color: theme.colors.text },
  button: {
    minHeight: 54,
    borderRadius: theme.radii.control,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontSize: 17,
    includeFontPadding: true,
    paddingVertical: 2,
    fontWeight: "600",
    textAlign: "center",
    flexShrink: 1,
  },
  secondary: {
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryText: { color: theme.colors.primaryDark },
  outlined: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.softGreen,
  },
  disabled: { opacity: theme.interaction.disabledOpacity },
  pressed: { opacity: theme.interaction.pressedOpacity },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    gap: 12,
  },
  field: { gap: 10 },
  input: {
    minHeight: 56,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  inputFocused: { borderColor: theme.colors.focusBorder },
  placeholder: { color: theme.colors.placeholder },
  dropdown: { flexDirection: "row", alignItems: "center", gap: 12 },
  dropdownValue: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
  chevron: { color: theme.colors.icon, fontSize: 25 },
  back: {
    minHeight: theme.layout.touchTarget,
    minWidth: theme.layout.touchTarget,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  actionCard: {
    backgroundColor: theme.colors.tint,
    borderRadius: theme.radii.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 80,
  },
  actionCopy: { flex: 1, gap: 5 },
  actionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "600",
  },
  actionSubtitle: { color: theme.colors.muted, fontSize: 13, lineHeight: 20 },
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
    backgroundColor: theme.colors.tint,
  },
  error: { color: theme.colors.error, fontSize: 16, lineHeight: 25 },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 32,
  },
  offline: {
    backgroundColor: theme.colors.warningBackground,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  offlineText: { color: theme.colors.warning, fontSize: 14, lineHeight: 22 },
  brand: { alignItems: "center", gap: 4 },
  brandText: { fontSize: 40, fontWeight: "800", color: theme.colors.brand },
  mark: { width: 80, height: 65 },
  sun: {
    position: "absolute",
    right: 6,
    top: 0,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: theme.colors.accent,
  },
  leaf: {
    position: "absolute",
    width: 34,
    height: 22,
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  leftLeaf: { top: 19, left: 5, transform: [{ rotate: "32deg" }] },
  rightLeaf: { top: 30, right: 4, transform: [{ rotate: "-25deg" }] },
  stem: {
    position: "absolute",
    left: 38,
    top: 32,
    width: 4,
    height: 31,
    backgroundColor: theme.colors.primaryDark,
    transform: [{ rotate: "12deg" }],
  },
});
