import type { MobileSession } from "@gaavli/types";
import { mobileSessionSchema } from "@gaavli/validation";
export interface SessionStorage {
  read(): Promise<MobileSession | null>;
  write(session: MobileSession): Promise<void>;
  clear(): Promise<void>;
}
export async function persistSession(
  storage: SessionStorage,
  session: MobileSession,
  commit: (value: MobileSession) => void,
) {
  const validated = mobileSessionSchema.parse(session);
  await storage.write(validated);
  commit(validated);
}

export async function clearSessionForGuest(
  storage: SessionStorage,
  clearGuestBrowsing: () => Promise<void>,
  commit: () => void,
) {
  await clearGuestBrowsing();
  await storage.clear();
  commit();
}
