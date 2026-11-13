import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppAlertStore } from "../alert";
import { messages } from "../i18n";
import { useAppStore } from "../store";
import { theme } from "../theme";

export function AppAlertHost() {
  const notice = useAppAlertStore((state) => state.notice);
  const dismiss = useAppAlertStore((state) => state.dismiss);
  const insets = useSafeAreaInsets();
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  if (!notice) return null;

  const cancelButton = notice.buttons.find(
    (button) => button.style === "cancel",
  );
  const primaryIndex = notice.buttons.reduce(
    (last, button, index) => (button.style === "cancel" ? last : index),
    -1,
  );
  function close() {
    if (!notice.cancelable) return;
    dismiss(notice.id);
    cancelButton?.onPress?.();
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={s.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.close}
          disabled={!notice.cancelable}
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[
            s.dialog,
            { marginTop: insets.top, marginBottom: insets.bottom },
          ]}
        >
          <Text accessibilityRole="header" style={s.title}>
            {notice.title}
          </Text>
          {!!notice.message && <Text style={s.message}>{notice.message}</Text>}
          <View
            style={[s.actions, notice.buttons.length > 2 && s.actionsStacked]}
          >
            {notice.buttons.map((button, index) => {
              const cancel = button.style === "cancel";
              const destructive = button.style === "destructive";
              const primary = !cancel && index === primaryIndex;
              return (
                <Pressable
                  key={`${notice.id}-${index}`}
                  accessibilityRole="button"
                  onPress={() => {
                    dismiss(notice.id);
                    button.onPress?.();
                  }}
                  style={({ pressed }) => [
                    s.button,
                    primary && s.primaryButton,
                    cancel && s.cancelButton,
                    destructive && s.destructiveButton,
                    notice.buttons.length > 2 && s.stackedButton,
                    pressed && s.pressed,
                  ]}
                >
                  <Text
                    style={[
                      s.buttonText,
                      primary && s.primaryButtonText,
                      destructive && s.destructiveButtonText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing,
    backgroundColor: theme.colors.overlay,
  },
  dialog: {
    width: "100%",
    maxWidth: theme.layout.contentWidth,
    gap: 12,
    padding: 20,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.shadow.color,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  title: {
    ...theme.type.heading,
    color: theme.colors.heading,
  },
  message: {
    ...theme.type.body,
    color: theme.colors.text,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  actionsStacked: {
    flexDirection: "column",
  },
  button: {
    minHeight: theme.layout.touchTarget,
    minWidth: 88,
    flex: 1,
    paddingHorizontal: 16,
    borderRadius: theme.radii.control,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stackedButton: { flex: 0 },
  primaryButton: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  cancelButton: {
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
  },
  destructiveButton: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorBackground,
  },
  buttonText: {
    ...theme.type.label,
    color: theme.colors.text,
    textAlign: "center",
  },
  primaryButtonText: { color: theme.colors.onPrimary },
  destructiveButtonText: { color: theme.colors.error },
  pressed: { opacity: theme.interaction.pressedOpacity },
});
