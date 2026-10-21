import { z } from "zod";
import {
  listingOperationKeySchema,
  coordinatorMutationSchema,
} from "@gaavli/validation";
import { listingOperationId } from "./listingForm";

export const pendingCoordinatorSchema = z
  .object({
    key: listingOperationKeySchema,
    path: z
      .string()
      .regex(
        /^(?:\/coordinator\/[a-zA-Z0-9/?=&%-]+|\/listings\/[a-f0-9]{24}\/reports)$/,
      ),
    method: z.enum(["POST", "PATCH", "DELETE"]),
    body: z.record(z.string(), z.unknown()),
  })
  .strict();
export type PendingCoordinator = z.infer<typeof pendingCoordinatorSchema>;

export async function addVillageConnections(
  ids: string[],
  write: (id: string) => Promise<{ id: string; confirmed: true } | null>,
  confirmed: (id: string) => void,
) {
  for (const id of [...new Set(ids)]) {
    const result = await write(id);
    if (!result) return false;
    confirmed(id);
  }
  return true;
}
type Storage = {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};
type OperationInput = {
  storage: Storage;
  storageKey: string;
  isCurrent: () => boolean;
  operation?: Omit<PendingCoordinator, "key">;
  send: (
    operation: PendingCoordinator,
  ) => Promise<z.infer<typeof coordinatorMutationSchema>>;
};
const pendingQueues = new WeakMap<Storage, Map<string, Promise<unknown>>>();
export async function sendCoordinatorOperation(input: OperationInput) {
  let queue = pendingQueues.get(input.storage);
  if (!queue) {
    queue = new Map();
    pendingQueues.set(input.storage, queue);
  }
  const previous = queue.get(input.storageKey) || Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(() => sendOperation(input));
  queue.set(input.storageKey, current);
  try {
    return await current;
  } finally {
    if (queue.get(input.storageKey) === current) queue.delete(input.storageKey);
  }
}
async function sendOperation(input: OperationInput) {
  const raw = await input.storage.read(input.storageKey);
  const saved = raw ? pendingCoordinatorSchema.parse(JSON.parse(raw)) : null;
  if (!saved && !input.operation) return null;
  if (
    saved &&
    input.operation &&
    JSON.stringify({ ...saved, key: undefined }) !==
      JSON.stringify({ ...input.operation, key: undefined })
  )
    throw new Error("COORDINATOR_PENDING");
  const operation =
    saved ||
    pendingCoordinatorSchema.parse({
      ...input.operation,
      key: listingOperationId(),
    });
  if (!saved)
    await input.storage.write(input.storageKey, JSON.stringify(operation));
  if (!input.isCurrent()) return null;
  const result = coordinatorMutationSchema.parse(await input.send(operation));
  if (!input.isCurrent()) return null;
  await input.storage.remove(input.storageKey).catch(() => undefined);
  return input.isCurrent() ? result : null;
}
