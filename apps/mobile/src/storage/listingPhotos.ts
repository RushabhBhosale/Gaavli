import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { File } from "expo-file-system";
import { photoUploadBody } from "../data/photoUploadBody";
import { uploadedListingPhotoSchema } from "@gaavli/validation";
import { authenticatedApi } from "../session";
import { ApiError } from "../api/client";
import { useAppStore } from "../store";
import {
  localListingPhotoSchema,
  type LocalListingPhoto,
} from "../data/listingForm";

function directory(accountId: string, villageId: string) {
  if (
    !/^[a-f0-9]{24}$/.test(accountId) ||
    !/^[a-f0-9]{24}$/.test(villageId) ||
    !FileSystem.documentDirectory
  )
    throw new Error("Photo storage unavailable");
  return `${FileSystem.documentDirectory}listing-photos/${accountId}/${villageId}/`;
}
export function localListingPhotoUri(
  photo: LocalListingPhoto,
  accountId: string,
  villageId: string,
) {
  return (
    directory(accountId, villageId) +
    localListingPhotoSchema.parse(photo).fileName
  );
}
export async function pickListingPhoto(
  accountId: string,
  villageId: string,
  source: "camera" | "gallery" = "gallery",
): Promise<LocalListingPhoto | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new ApiError("CAMERA_PERMISSION_REQUIRED");
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.8,
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
  if (!info.exists || !info.size || info.size > 5 * 1024 * 1024)
    throw new ApiError("PHOTO_TOO_LARGE");
  const operationKey = `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  const photo = localListingPhotoSchema.parse({
    fileName: `${operationKey}.${mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg"}`,
    mimeType,
    operationKey,
    uploadedKey: null,
  });
  const dir = directory(accountId, villageId);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  await FileSystem.copyAsync({
    from: asset.uri,
    to: localListingPhotoUri(photo, accountId, villageId),
  });
  return photo;
}
export async function uploadDraftPhoto(
  photo: LocalListingPhoto,
  accountId: string,
  villageId: string,
) {
  if (photo.uploadedKey) return photo.uploadedKey;
  const uri = localListingPhotoUri(photo, accountId, villageId);
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) throw new ApiError("PHOTO_MISSING");
  const current = useAppStore.getState().session;
  if (current?.user.id !== accountId || current.user.village?.id !== villageId)
    throw new ApiError("AUTH_REQUIRED", 401);
  const form = photoUploadBody(new File(uri), photo.fileName);
  const result = await authenticatedApi(
    "/listings/photos",
    uploadedListingPhotoSchema,
    {
      method: "POST",
      headers: { "Idempotency-Key": photo.operationKey },
      body: form,
    },
    60000,
  );
  return result.photoObjectKey;
}
export async function removeDraftPhoto(
  photo: LocalListingPhoto | null,
  accountId: string,
  villageId: string,
) {
  if (photo)
    await FileSystem.deleteAsync(
      localListingPhotoUri(photo, accountId, villageId),
      { idempotent: true },
    );
}
