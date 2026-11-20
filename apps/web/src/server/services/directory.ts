import "server-only";
import type { z } from "zod";
import type {
  directoryQuerySchema,
  directorySummaryQuerySchema,
  productShopsQuerySchema,
} from "@gaavli/validation";
import { SHOWN_AS_HOME_EXCLUDED, shopGroupForProduct } from "@gaavli/constants";
import { Village, type UserRecord } from "../models";
import {
  directorySummary,
  findDirectory,
  findProductShops,
  findPublicCoordinator,
} from "../repositories/directory";
import { searchCatalog } from "../repositories/catalog-search";
import { Service } from "../models/service";
import { ProductMaster } from "../models/product-master";
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
// Shops that sell what the buyer typed: the text is matched to its best
// catalogue product first. See docs/03-api/SHOP_PRODUCTS.md.
export async function productShops(
  user: UserRecord | null,
  query: z.infer<typeof productShopsQuerySchema>,
) {
  await requireBrowsingVillage(user, query.sourceVillageId);
  const empty = { entries: [], total: 0 };
  const [best] = query.q ? (await searchCatalog(query.q, 1)).products : [];
  if (!best) return { product: null, haveIt: empty, sellsGroup: empty };
  // Older rows use "grain"; shops pick the catalogue's "grains".
  const productGroup = shopGroupForProduct(best.code, best.productGroup);
  const shops = await findProductShops(
    query.sourceVillageId,
    { code: best.code, productGroup },
    query.limit,
    user ? String(user._id) : null,
  );
  return {
    product: {
      code: best.code,
      nameEn: best.nameEn,
      nameMr: best.nameMr,
      nameHi: best.nameHi,
      productGroup,
    },
    ...shops,
  };
}
// What one visible shop sells. Visibility is checked like the entry itself.
export async function directoryShopProducts(
  user: UserRecord | null,
  query: z.infer<typeof directoryQuerySchema>,
  id: string,
) {
  await listDirectory(user, query, id);
  const row = await Service.findById(id)
    .select("productGroups productCodes")
    .lean();
  const groups = row?.productGroups ?? [];
  const codes = row?.productCodes ?? [];
  const masters = codes.length
    ? await ProductMaster.find({ code: { $in: codes }, status: "ACTIVE" })
        .select("code nameEn nameMr nameHi productGroup")
        .lean()
    : [];
  const byCode = new Map(masters.map((m) => [m.code, m]));
  return {
    groups,
    // In the order the shop ticked them; retired products drop out.
    products: codes.flatMap((code) => {
      const m = byCode.get(code);
      return m
        ? [
            {
              code: m.code,
              nameEn: m.nameEn,
              nameMr: m.nameMr,
              nameHi: m.nameHi || null,
              productGroup: m.productGroup,
            },
          ]
        : [];
    }),
  };
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
