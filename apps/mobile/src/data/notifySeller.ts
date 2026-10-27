import { z } from "zod";
import {
  listingOperationKeySchema,
  notifySellerResultSchema,
  notifySellerInputSchema,
} from "@gaavli/validation";
import { listingOperationId } from "./listingForm";

type Storage = {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};
export const pendingSellerNotificationSchema = z
  .object({ key: listingOperationKeySchema, body: notifySellerInputSchema })
  .strict();
export type PendingSellerNotification = z.infer<
  typeof pendingSellerNotificationSchema
>;
export const sellerNotificationStorageKey = (
  accountId: string,
  listingId: string,
) => `notify-seller:${accountId}:${listingId}`;
export function parseSavedSellerNotification(raw: string) {
  const legacy = listingOperationKeySchema.safeParse(raw);
  return legacy.success
    ? { key: legacy.data, body: {} }
    : pendingSellerNotificationSchema.parse(JSON.parse(raw));
}
export function prepareSellerRequest(
  value: string,
  available: number | null,
  minimum: number | null,
  message = "",
) {
  const normalized = value
    .trim()
    .replace(/[०-९]/g, (digit) => String("०१२३४५६७८९".indexOf(digit)));
  const quantity = /^\d+(?:\.\d+)?$/.test(normalized)
    ? Number(normalized)
    : NaN;
  const parsed = notifySellerInputSchema.safeParse({
    quantity,
    callbackConsent: true,
    ...(message.trim() ? { message } : {}),
  });
  if (
    !parsed.success &&
    parsed.error.issues.some((issue) => issue.path[0] === "message")
  )
    throw new Error("REQUEST_MESSAGE_INVALID");
  if (
    !parsed.success ||
    available === null ||
    quantity > available ||
    quantity < (minimum || 0)
  )
    throw new Error("REQUEST_QUANTITY_INVALID");
  return parsed.data;
}
export async function sendSellerNotification(input: {
  accountId: string;
  listingId: string;
  storage: Storage;
  isCurrent: () => boolean;
  body?: z.infer<typeof notifySellerInputSchema>;
  onStaged?: (pending: PendingSellerNotification) => void;
  send: (
    key: string,
    body: z.infer<typeof notifySellerInputSchema>,
  ) => Promise<z.infer<typeof notifySellerResultSchema>>;
}) {
  const storageKey = sellerNotificationStorageKey(
    input.accountId,
    input.listingId,
  );
  const saved = await input.storage.read(storageKey);
  const pending = saved
    ? parseSavedSellerNotification(saved)
    : pendingSellerNotificationSchema.parse({
        key: listingOperationId(),
        body: input.body || {},
      });
  if (
    JSON.stringify(pending.body) !==
    JSON.stringify(notifySellerInputSchema.parse(input.body || {}))
  )
    throw new Error("REQUEST_PENDING_CHANGED");
  if (!saved) await input.storage.write(storageKey, JSON.stringify(pending));
  if (!input.isCurrent()) return null;
  input.onStaged?.(pending);
  const result = notifySellerResultSchema.parse(
    await input.send(pending.key, pending.body),
  );
  if (result.listingId !== input.listingId)
    throw new Error("Unexpected notification target");
  if (!input.isCurrent()) return null;
  // A cleanup failure retains the already confirmed key for safe replay.
  await input.storage.remove(storageKey).catch(() => undefined);
  return input.isCurrent() ? result : null;
}
