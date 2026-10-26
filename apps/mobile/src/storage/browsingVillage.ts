import type { MobileSession, MobileVillage } from "@gaavli/types";
import { listingIdSchema, mobileVillageSchema } from "@gaavli/validation";
import { hasCoordinatorRole } from "../data/accountAccess";
const browsingVillageSchema = mobileVillageSchema.extend({
  id: listingIdSchema,
});

export interface BrowsingVillageStorage {
  readBrowsingVillage(): Promise<string | null>;
  writeBrowsingVillage(value: string): Promise<void>;
}
export function initialBrowsingVillage(
  saved: MobileVillage | null,
  session: MobileSession | null,
) {
  // Buyers and sellers start at their registered village; explicit selections
  // during this launch can still override it without changing their profile.
  return session && !hasCoordinatorRole(session.user) ? null : saved;
}
export function browsingVillageFor(state: {
  browsingVillage: MobileVillage | null;
  session: MobileSession | null;
  guestVillage: MobileVillage | null;
}) {
  return (
    state.browsingVillage ?? state.session?.user.village ?? state.guestVillage
  );
}
export async function restoreBrowsingVillage(storage: BrowsingVillageStorage) {
  const saved = await storage.readBrowsingVillage();
  if (!saved) return null;
  try {
    const parsed = browsingVillageSchema.safeParse(JSON.parse(saved));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
let writes: Promise<void> = Promise.resolve();
export function selectBrowsingVillage(
  storage: BrowsingVillageStorage,
  village: MobileVillage,
  commit: (village: MobileVillage) => void,
) {
  const validated = browsingVillageSchema.parse(village);
  // Serialize writes from both mounted tabs; publish only durable selections.
  const operation = writes.then(async () => {
    await storage.writeBrowsingVillage(JSON.stringify(validated));
    commit(validated);
    return validated;
  });
  writes = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}
