import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MAX_PROVIDER_IMAGES } from "@gaavli/constants";
import { useAppStore } from "../../store";
import { formatMessage, messages } from "../../i18n";
import { theme } from "../../theme";
import { errorMessage } from "../../errors";
import { resolveListingPhotoUrl } from "../../data/listingPhotos";
import { pickAndUploadImage, type ProviderImage } from "../../providerImages";
import { ErrorMessage } from "../ui";

const resolve = (url: string) =>
  resolveListingPhotoUrl(url, process.env.EXPO_PUBLIC_API_BASE_URL, __DEV__);

// Read-only photos of a shop or service; tap one to see it full screen.
export function ProviderImageGallery({
  images,
}: {
  images: readonly ProviderImage[];
}) {
  const t = messages(useAppStore((state) => state.language));
  const [open, setOpen] = useState<string | null>(null);
  const shown = images.flatMap((image) => {
    const uri = resolve(image.url);
    return uri ? [{ key: image.key, uri }] : [];
  });
  if (!shown.length) return null;
  return (
    <>
      <View style={s.row}>
        {shown.map((image) => (
          <Pressable
            key={image.key}
            accessibilityRole="imagebutton"
            accessibilityLabel={t.provImageOpen}
            onPress={() => setOpen(image.uri)}
            style={s.tile}
          >
            <Image source={{ uri: image.uri }} style={s.photo} />
          </Pressable>
        ))}
      </View>
      <Modal
        visible={!!open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(null)}
      >
        <Pressable style={s.backdrop} onPress={() => setOpen(null)}>
          {open && (
            <Image
              source={{ uri: open }}
              style={s.full}
              resizeMode="contain"
              accessible={false}
            />
          )}
          <View style={s.close}>
            <Ionicons name="close" size={26} color="#fff" />
            <Text style={s.closeText}>{t.provImageClose}</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// Add up to two photos and remove them again. Photos upload as soon as they
// are chosen, so saving the form only sends their keys.
export function ProviderImagesField({
  images,
  onChange,
  disabled = false,
}: {
  images: readonly ProviderImage[];
  onChange: (next: ProviderImage[]) => void;
  disabled?: boolean;
}) {
  const language = useAppStore((state) => state.language);
  const t = messages(language);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const full = images.length >= MAX_PROVIDER_IMAGES;

  async function add(source: "camera" | "gallery") {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const picked = await pickAndUploadImage(source);
      if (picked && !images.some((image) => image.key === picked.key))
        onChange([...images, picked].slice(0, MAX_PROVIDER_IMAGES));
    } catch (error) {
      setFailure(error);
    } finally {
      setBusy(false);
    }
  }
  function choose() {
    Alert.alert(t.provImageAdd, undefined, [
      { text: t.provImageCamera, onPress: () => void add("camera") },
      { text: t.provImageGallery, onPress: () => void add("gallery") },
      { text: t.cancel, style: "cancel" },
    ]);
  }
  return (
    <View style={s.field}>
      <Text style={s.title}>{t.provImagesTitle}</Text>
      <Text style={s.hint}>{t.provImagesHint}</Text>
      <View style={s.row}>
        {images.map((image) => {
          const uri = resolve(image.url);
          return (
            <View key={image.key} style={s.tile}>
              {uri ? (
                <Image source={{ uri }} style={s.photo} accessible={false} />
              ) : (
                <View style={[s.photo, s.center]}>
                  <Ionicons
                    name="image-outline"
                    size={28}
                    color={theme.colors.muted}
                  />
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.provImageRemove}
                disabled={disabled || busy}
                onPress={() =>
                  onChange(images.filter((item) => item.key !== image.key))
                }
                style={s.remove}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </Pressable>
            </View>
          );
        })}
        {!full && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.provImageAdd}
            disabled={disabled || busy}
            onPress={choose}
            style={[s.tile, s.add, (disabled || busy) && s.dim]}
          >
            {busy ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <>
                <Ionicons
                  name="camera-outline"
                  size={28}
                  color={theme.colors.primary}
                />
                <Text style={s.addText}>{t.provImageAdd}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
      <Text style={s.hint}>
        {busy
          ? t.provImageUploading
          : formatMessage(t.provImageCount, {
              n: images.length,
              total: MAX_PROVIDER_IMAGES,
            })}
      </Text>
      {!!failure && <ErrorMessage message={errorMessage(failure, language)} />}
    </View>
  );
}

const s = StyleSheet.create({
  field: { gap: 8 },
  title: { color: theme.colors.heading, fontSize: 16, fontWeight: "700" },
  hint: { color: theme.colors.muted, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  tile: {
    width: 140,
    height: 140,
    borderRadius: theme.radii.card,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceMuted,
  },
  photo: { width: "100%", height: "100%" },
  center: { alignItems: "center", justifyContent: "center" },
  add: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.saffronBorder,
    backgroundColor: theme.colors.tint,
  },
  addText: { color: theme.colors.primary, fontSize: 14, fontWeight: "700" },
  dim: { opacity: theme.interaction.disabledOpacity },
  remove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#16222DB3",
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#000000EE",
    alignItems: "center",
    justifyContent: "center",
  },
  full: { width: "100%", height: "80%" },
  close: {
    position: "absolute",
    top: 60,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  closeText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
