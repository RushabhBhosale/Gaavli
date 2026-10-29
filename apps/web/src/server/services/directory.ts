import "server-only";
import type { z } from "zod";
import type { directoryQuerySchema } from "@gaavli/validation";
import { Village, type UserRecord } from "../models";
import {
  findDirectory,
  findPublicCoordinator,
} from "../repositories/directory";
import { AppError } from "../utils/errors";

async function requireBrowsingVillage(
  user: UserRecord | null,
  sourceVillageId: string,
) {
  if (
    user &&
    (!user.village ||
      !(await Village.exists({ _id: user.village, isActive: true })))
  )
    throw new AppError(422, "VILLAGE_UNAVAILABLE", "Select an active village.");
  if (!(await Village.exists({ _id: sourceVillageId, isActive: true })))
    throw new AppError(422, "VILLAGE_UNAVAILABLE", "Select an active village.");
}
export async function listDirectory(
  user: UserRecord | null,
  query: z.infer<typeof directoryQuerySchema>,
  id?: string,
) {
  await requireBrowsingVillage(user, query.sourceVillageId);
  const page = await findDirectory(query, user ? String(user._id) : null, id);
  if (id) {
    if (!page.entries[0])
      throw new AppError(
        404,
        "LISTING_UNAVAILABLE",
        "This listing is unavailable.",
      );
    return page.entries[0];
  }
  return page;
}
export async function dashboardDirectory(
  user: UserRecord | null,
  query: z.infer<typeof directoryQuerySchema>,
) {
  await requireBrowsingVillage(user, query.sourceVillageId);
  const viewer = user ? String(user._id) : null;
  const [services, transport, coordinator] = await Promise.all([
    findDirectory({ ...query, module: "services", page: 1, limit: 3 }, viewer),
    findDirectory({ ...query, module: "transport", page: 1, limit: 3 }, viewer),
    findPublicCoordinator(query.sourceVillageId),
  ]);
  return { services, transport, coordinator };
}
