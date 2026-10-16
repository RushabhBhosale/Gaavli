// Expo's fetch accepts Blob/File values, not legacy RN { uri, name, type }
// objects. Keep actual file bytes in the multipart part and let fetch set boundary.
export function photoUploadBody(file: Blob, name: string) {
  if (!file || typeof file.arrayBuffer !== "function")
    throw new TypeError("PHOTO_FILE_REQUIRED");
  const form = new FormData();
  form.append("photo", file, name);
  return form;
}
