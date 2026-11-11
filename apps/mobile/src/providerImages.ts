import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { File } from "expo-file-system";
import { uploadedListingPhotoSchema } from "@gaavli/validation";
import { photoUploadBody } from "./data/photoUploadBody";
import { authenticatedApi } from "./session";
import { ApiError } from "./api/client";

export type ProviderImage = { key: string; url: string };
const MAX_BYTES = 5 * 1024 * 1024;

// Pick a photo and upload it straight away; the profile keeps only the key.
// Returns null when the person cancels.
export async function pickAndUploadImage(
  source: "camera" | "gallery",
): Promise<ProviderImage | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new ApiError("CAMERA_PERMISSION_REQUIRED");
  }
  // No forced square crop: a visiting card is wide.
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 0.7,
    exif: false,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const mimeType = asset.mimeType || "image/jpeg";
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType))
    throw new ApiError("PHOTO_INVALID");
  const info = await FileSystem.getInfoAsync(asset.uri);
  if (!info.exists || !info.size || info.size > MAX_BYTES)
    throw new ApiError("PHOTO_TOO_LARGE");
  const operationKey = `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  const extension =
    mimeType === "image/png"
      ? "png"
      : mimeType === "image/webp"
        ? "webp"
        : "jpg";
  const uploaded = await authenticatedApi(
    "/listings/photos",
    uploadedListingPhotoSchema,
    {
      method: "POST",
      headers: { "Idempotency-Key": operationKey },
      body: photoUploadBody(
        new File(asset.uri),
        `${operationKey}.${extension}`,
      ),
    },
    60000,
  );
  return { key: uploaded.photoObjectKey, url: uploaded.photoUrl };
}
