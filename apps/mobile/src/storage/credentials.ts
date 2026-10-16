import * as SecureStore from "expo-secure-store";
import { mobileSessionSchema } from "@gaavli/validation";
import type { MobileSession } from "@gaavli/types";

// One atomic value avoids mixing credentials from different renewals.
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
export const credentials = {
  async read(): Promise<MobileSession | null> {
    const value = await SecureStore.getItemAsync(
      "gaavli.mobileSession",
      options,
    );
    return value ? mobileSessionSchema.parse(JSON.parse(value)) : null;
  },
  write: (value: MobileSession) =>
    SecureStore.setItemAsync(
      "gaavli.mobileSession",
      JSON.stringify(mobileSessionSchema.parse(value)),
      options,
    ),
  async clear() {
    await Promise.all(
      ["accessToken", "refreshToken", "mobileSession"].map((key) =>
        SecureStore.deleteItemAsync(`gaavli.${key}`, options),
      ),
    );
  },
};
