import {
  notificationsQuerySchema,
  notificationReadInputSchema,
} from "@gaavli/validation";
import { requireMobile } from "@/server/services/mobile-auth";
import {
  getUserNotifications,
  markUserNotificationsRead,
} from "@/server/services/notifications";
import { mobileEndpoint } from "@/server/utils/mobile-http";
import { jsonBody, ok } from "@/server/utils/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const query = notificationsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return ok(await getUserNotifications(String(user._id), query));
  });
}
export async function PATCH(request: Request) {
  return mobileEndpoint(request, async () => {
    const user = await requireMobile(request);
    const input = notificationReadInputSchema.parse(await jsonBody(request));
    return ok(await markUserNotificationsRead(String(user._id), input.ids));
  });
}
