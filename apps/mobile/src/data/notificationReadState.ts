import type { QueryClient, InfiniteData } from "@tanstack/react-query";
import type { z } from "zod";
import type {
  notificationPageSchema,
  notificationReadResultSchema,
  requestPageSchema,
} from "@gaavli/validation";
type NotificationPages = InfiniteData<z.infer<typeof notificationPageSchema>>;
type RequestPages = InfiniteData<z.infer<typeof requestPageSchema>>;

export function applyNotificationReads(
  client: QueryClient,
  accountId: string,
  result: z.infer<typeof notificationReadResultSchema>,
) {
  const read = new Map(result.notifications.map((row) => [row.id, row.readAt]));
  client.setQueriesData<NotificationPages>(
    { queryKey: ["notifications", accountId] },
    (old) =>
      old && {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          notifications: page.notifications.map((row) =>
            read.has(row.id) ? { ...row, readAt: read.get(row.id)! } : row,
          ),
        })),
      },
  );
  client.setQueriesData<RequestPages>(
    { queryKey: ["activity-requests", accountId] },
    (old) =>
      old && {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          requests: page.requests.map((row) =>
            read.has(row.id)
              ? {
                  ...row,
                  seenAt: read.get(row.id)!,
                  status: row.status === "new" ? ("seen" as const) : row.status,
                }
              : row,
          ),
        })),
      },
  );
  client.setQueryData(
    ["notification-unread", accountId],
    (old: z.infer<typeof notificationPageSchema> | undefined) => ({
      notifications: [],
      total: 0,
      page: 1,
      limit: 1,
      ...old,
      unreadCount: result.unreadCount,
    }),
  );
}
