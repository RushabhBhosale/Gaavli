import "server-only";
import { Types, type PipelineStage } from "mongoose";
import type { z } from "zod";
import {
  indianMobileSchema,
  directoryEntrySchema,
  type directoryQuerySchema,
} from "@gaavli/validation";
import { Service } from "../models/service";
import { User, Village, VillageCoordinator } from "../models";

export async function findDirectory(
  query: z.infer<typeof directoryQuerySchema>,
  viewerId: string | null,
  id?: string,
) {
  const terms = query.search.split(/\s+/).filter(Boolean);
  const pipeline: PipelineStage[] = [
    {
      $match: {
        villageId: new Types.ObjectId(query.sourceVillageId),
        status: "ACTIVE",
        available: { $ne: false },
        ...(id ? { _id: new Types.ObjectId(id) } : {}),
        ...(viewerId ? { userId: { $ne: new Types.ObjectId(viewerId) } } : {}),
        ...(query.module === "transport"
          ? { module: "transport" }
          : query.module === "services"
            ? { module: { $in: ["services", null] } }
            : { module: { $in: ["services", "transport", null] } }),
        ...(terms.length
          ? {
              $and: terms.map((term) => ({
                $or: [
                  "profession",
                  "professionMr",
                  "description",
                  "serviceCategory",
                  "keywords",
                ].map((field) => ({
                  [field]: {
                    $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                    $options: "i",
                  },
                })),
              })),
            }
          : {}),
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
    entries: (page?.entries ?? []).map((row) =>
      directoryEntrySchema.parse(row),
    ),
    total: page?.count[0]?.total ?? 0,
    page: query.page,
    limit: query.limit,
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
