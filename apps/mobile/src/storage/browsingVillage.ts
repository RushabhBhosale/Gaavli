import type { MobileSession, MobileVillage } from "@gaavli/types";
import { listingIdSchema, mobileVillageSchema } from "@gaavli/validation";
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
  return saved ?? session?.user.village ?? null;
}
export function browsingVillageFor(state: {
  browsingVillage: MobileVillage | null;
}) {
  return state.browsingVillage;
}
export function browsingListingsQuery(
  browsingVillageId: string,
  params: Record<string, string>,
) {
  return new URLSearchParams({
    ...params,
    sourceVillageId: browsingVillageId,
    villageId: browsingVillageId,
  }).toString();
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
function serializeVillageWrite<T>(work: () => Promise<T>) {
  const operation = writes.then(work);
  writes = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}
export function clearBrowsingVillage(storage: {
  clearGuestBrowsing(): Promise<void>;
}) {
  // Logout follows pending selections so their late writes cannot restore a
  // cleared village on the next launch.
  return serializeVillageWrite(() => storage.clearGuestBrowsing());
}
export function selectBrowsingVillage(
  storage: BrowsingVillageStorage,
  village: MobileVillage,
  commit: (village: MobileVillage) => void,
) {
  const validated = browsingVillageSchema.parse(village);
  // Serialize writes from both mounted tabs; publish only durable selections.
  return serializeVillageWrite(async () => {
    await storage.writeBrowsingVillage(JSON.stringify(validated));
    commit(validated);
    return validated;
  });
}
