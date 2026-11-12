import "server-only";
import type { z } from "zod";
import type {
  directoryQuerySchema,
  directorySummaryQuerySchema,
} from "@gaavli/validation";
import { SHOWN_AS_HOME_EXCLUDED } from "@gaavli/constants";
import { Village, type UserRecord } from "../models";
import {
  directorySummary,
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
export async function directoryCategoryCounts(
  user: UserRecord | null,
  query: z.infer<typeof directorySummaryQuerySchema>,
) {
  await requireBrowsingVillage(user, query.sourceVillageId);
  return directorySummary(query, user ? String(user._id) : null);
}
// The dashboard shows a few entries, picked at random from a larger pool so
// every visit can surface different people and vehicles.
const DASHBOARD_POOL = 24;
const DASHBOARD_SHOWN = 4;
function shuffled<T extends { entries: unknown[] }>(page: T): T {
  const entries = [...page.entries];
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }
  return {
    ...page,
    page: 1,
    limit: DASHBOARD_SHOWN,
    entries: entries.slice(0, DASHBOARD_SHOWN),
  };
}
export async function dashboardDirectory(
  user: UserRecord | null,
  query: z.infer<typeof directoryQuerySchema>,
) {
  await requireBrowsingVillage(user, query.sourceVillageId);
  const viewer = user ? String(user._id) : null;
  const [services, transport, coordinator] = await Promise.all([
    findDirectory(
      { ...query, module: "services", page: 1, limit: DASHBOARD_POOL },
      viewer,
      undefined,
      [...SHOWN_AS_HOME_EXCLUDED],
    ),
    findDirectory(
      { ...query, module: "transport", page: 1, limit: DASHBOARD_POOL },
      viewer,
    ),
    findPublicCoordinator(query.sourceVillageId),
  ]);
  return {
    services: shuffled(services),
    transport: shuffled(transport),
    coordinator,
  };
}
