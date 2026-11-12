import "server-only";
import { Types, type PipelineStage } from "mongoose";
import type { z } from "zod";
import {
  indianMobileSchema,
  directoryEntrySchema,
  type directoryQuerySchema,
  type directorySummaryQuerySchema,
} from "@gaavli/validation";
import {
  directoryGroup,
  directoryGroupPattern,
  directoryGroupsFor,
  directoryGroupsOf,
  isCatchAllGroup,
  type DirectoryGroup,
} from "@gaavli/constants";
import { Service } from "../models/service";
import { listingPhotoUrl } from "../providers/listing-photos";
import { User, Village, VillageCoordinator } from "../models";

const escapeRegex = (term: string) =>
  term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// What a category tile means in a query: a provider code, an older category,
// or a word in the name. The catch-all is everything the other tiles skip.
function groupFilter(group: DirectoryGroup): Record<string, unknown> {
  if (isCatchAllGroup(group.id))
    return {
      $nor: directoryGroupsFor(group.module)
        .filter((item) => !isCatchAllGroup(item.id))
        .map(groupFilter),
    };
  const pattern = directoryGroupPattern(group);
  return {
    $or: [
      ...(group.providerTypes?.length
        ? [{ providerType: { $in: [...group.providerTypes] } }]
        : []),
      ...(group.codes.length
        ? [{ professionCode: { $in: [...group.codes] } }]
        : []),
      ...(group.categories.length
        ? [{ serviceCategory: { $in: [...group.categories] } }]
        : []),
      ...(pattern
        ? ["profession", "professionMr"].map((field) => ({
            [field]: { $regex: pattern, $options: "i" },
          }))
        : []),
    ],
  };
}

// Active entries a villager may see: live provider, live village, not their own.
function visibleEntries(
  query: Pick<
    z.infer<typeof directoryQuerySchema>,
    "sourceVillageId" | "module" | "category" | "search"
  >,
  viewerId: string | null,
  id?: string,
  excludeProviderTypes: readonly string[] = [],
): PipelineStage[] {
  const terms = query.search.split(/\s+/).filter(Boolean);
  const group = query.category ? directoryGroup(query.category) : undefined;
  const filters = [
    ...(group ? [groupFilter(group)] : []),
    ...terms.map((term) => ({
      $or: [
        "profession",
        "professionMr",
        "description",
        "serviceCategory",
        "keywords",
      ].map((field) => ({
        [field]: { $regex: escapeRegex(term), $options: "i" },
      })),
    })),
  ];
  return [
    {
      $match: {
        villageId: new Types.ObjectId(query.sourceVillageId),
        status: "ACTIVE",
        available: { $ne: false },
        ...(id ? { _id: new Types.ObjectId(id) } : {}),
        ...(excludeProviderTypes.length
          ? { providerType: { $nin: [...excludeProviderTypes] } }
          : {}),
        ...(query.module === "transport"
          ? { module: "transport" }
          : query.module === "services"
            ? { module: { $in: ["services", null] } }
            : { module: { $in: ["services", "transport", null] } }),
        ...(filters.length ? { $and: filters } : {}),
      },
    },
    {
      $lookup: {
        from: User.collection.name,
        localField: "userId",
        foreignField: "_id",
        as: "provider",
      },
    },
    { $match: { "provider.status": "active" } },
    {
      $lookup: {
        from: Village.collection.name,
        localField: "villageId",
        foreignField: "_id",
        as: "village",
      },
    },
    { $unwind: "$village" },
    { $match: { "village.isActive": true } },
  ];
}

export async function findDirectory(
  query: z.infer<typeof directoryQuerySchema>,
  viewerId: string | null,
  id?: string,
  // Kinds of provider to leave out of this listing (party offices stay off Home).
  excludeProviderTypes: readonly string[] = [],
) {
  const pipeline: PipelineStage[] = [
    ...visibleEntries(query, viewerId, id, excludeProviderTypes),
    {
      $facet: {
        entries: [
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
          {
            $project: {
              _id: 0,
              id: { $toString: "$_id" },
              module: {
                $cond: [
                  { $eq: ["$module", "transport"] },
                  "transport",
                  "services",
                ],
              },
              name: "$profession",
              nameMr: { $ifNull: ["$professionMr", null] },
              description: { $ifNull: ["$description", null] },
              category: { $ifNull: ["$serviceCategory", "Other"] },
              contacts: { $ifNull: ["$contacts", []] },
              images: { $ifNull: ["$images", []] },
              hours: { $ifNull: ["$hours", null] },
              providerType: { $ifNull: ["$providerType", null] },
              // Your own entries stay in the lists, marked as yours.
              mine: viewerId
                ? { $eq: ["$userId", new Types.ObjectId(viewerId)] }
                : { $literal: false },
              price: { $ifNull: ["$price", null] },
              unit: { $ifNull: ["$unit", null] },
              village: {
                id: { $toString: "$village._id" },
                name: "$village.nameEn",
                nameMr: "$village.nameMr",
              },
              createdAt: {
                $dateToString: {
                  date: "$createdAt",
                  format: "%Y-%m-%dT%H:%M:%S.%LZ",
                },
              },
            },
          },
        ],
        count: [{ $count: "total" }],
      },
    },
  ];
  const [page] = await Service.aggregate<{
    entries: unknown[];
    count: { total: number }[];
  }>(pipeline);
  return {
    entries: (page?.entries ?? []).map((row) => {
      const keys = (row as { images?: string[] }).images ?? [];
      return directoryEntrySchema.parse({
        ...(row as object),
        images: keys.flatMap((key) => {
          const url = listingPhotoUrl(key);
          return url ? [{ key, url }] : [];
        }),
      });
    }),
    total: page?.count[0]?.total ?? 0,
    page: query.page,
    limit: query.limit,
  };
}

// How many entries each category tile of one module holds.
export async function directorySummary(
  query: z.infer<typeof directorySummaryQuerySchema>,
  viewerId: string | null,
) {
  const rows = await Service.aggregate<{
    profession: string;
    professionMr?: string | null;
    professionCode?: string | null;
    serviceCategory?: string | null;
    providerType?: string | null;
  }>([
    ...visibleEntries({ ...query, search: "" }, viewerId),
    {
      $project: {
        _id: 0,
        profession: 1,
        professionMr: 1,
        professionCode: 1,
        serviceCategory: 1,
        providerType: 1,
      },
    },
  ]);
  const counts = new Map<string, number>();
  for (const row of rows)
    for (const group of directoryGroupsOf(query.module, row))
      counts.set(group, (counts.get(group) ?? 0) + 1);
  return {
    total: rows.length,
    groups: directoryGroupsFor(query.module).map((group) => ({
      id: group.id,
      count: counts.get(group.id) ?? 0,
    })),
  };
}

export async function findPublicCoordinator(villageId: string) {
  const assignment = await VillageCoordinator.findOne({ villageId }).lean();
  if (!assignment) return null;
  const [user, village] = await Promise.all([
    User.findOne({
      _id: assignment.userId,
      status: "active",
      roles: "coordinator",
    })
      .select("name mobile")
      .lean(),
    Village.findOne({ _id: villageId, isActive: true })
      .select("nameEn nameMr")
      .lean(),
  ]);
  if (!user || !village) return null;
  const registeredPhone = indianMobileSchema.safeParse(user.mobile);
  const permittedPhone = indianMobileSchema.safeParse(
    assignment.publicContactPhone,
  );
  const publicPhone =
    registeredPhone.success &&
    permittedPhone.success &&
    registeredPhone.data === permittedPhone.data
      ? `+91${registeredPhone.data}`
      : null;
  return {
    name: user.name,
    village: {
      id: String(village._id),
      name: village.nameEn,
      nameMr: village.nameMr,
    },
    // Permission covers this exact registered number only, never a replacement.
    publicContactPhone: publicPhone,
  };
}
