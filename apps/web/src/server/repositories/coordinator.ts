import "server-only";
import { Types, type PipelineStage } from "mongoose";
import type { z } from "zod";
import type { coordinatorQuerySchema } from "@gaavli/validation";
import { User, Village, Listing, AuditLog } from "../models";
import { VillageConnection, VillageReport } from "../models/coordinator";
import { mobileVillageDto } from "./mobile";
import { listingPhotoUrl } from "../providers/listing-photos";

export type CoordinatorQuery = z.infer<typeof coordinatorQuerySchema>;
export const escapeSearch = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function dateRange(query: CoordinatorQuery) {
  const to = query.to || new Date().toISOString().slice(0, 10);
  const from =
    query.from ||
    new Date(Date.parse(`${to}T00:00:00Z`) - 29 * 86400000)
      .toISOString()
      .slice(0, 10);
  return {
    from,
    to,
    filter: {
      $gte: new Date(`${from}T00:00:00Z`),
      $lt: new Date(Date.parse(`${to}T00:00:00Z`) + 86400000),
    },
  };
}
export function coordinatorUserDto(
  row: InstanceType<typeof User>,
  village: Parameters<typeof mobileVillageDto>[0],
  actorId: string,
) {
  const preRegistered = !!row.preRegisteredAt && row.mobileVerified !== true;
  return {
    id: String(row._id),
    name: row.name,
    firstName: row.firstName || null,
    lastName: row.lastName || null,
    mobile: row.mobile || null,
    village: mobileVillageDto(village),
    roles: row.roles,
    status: row.status,
    preRegistered,
    mobileVerified: row.mobileVerified ?? null,
    canEdit:
      preRegistered &&
      String(row.createdByCoordinator) === actorId &&
      row.status === "active" &&
      !row.roles.includes("coordinator") &&
      !row.roles.includes("seller"),
    version: row.__v || 0,
    createdAt: row.createdAt.toISOString(),
  };
}
export function coordinatorListingDto(row: InstanceType<typeof Listing>) {
  return {
    id: String(row._id),
    productName: row.productName,
    description: row.description || null,
    quantity: row.quantity ?? null,
    unit: row.unit || null,
    price: row.price ?? null,
    status: row.status,
    photoUrl: listingPhotoUrl(row.photoObjectKey),
    createdAt: row.createdAt.toISOString(),
  };
}
export function coordinatorReportDto(row: InstanceType<typeof VillageReport>) {
  return {
    id: String(row._id),
    listingId: String(row.listingId),
    productName: row.productName,
    reason: row.reason,
    status: row.status,
    version: row.__v || 0,
    createdAt: row.createdAt.toISOString(),
  };
}
export async function findCoordinatorUsers(
  actorId: string,
  village: InstanceType<typeof Village>,
  query: CoordinatorQuery,
) {
  const search = escapeSearch(query.search);
  const filter = {
    village: village._id,
    ...(search
      ? {
          $or: ["name", "firstName", "lastName", "mobile"].map((key) => ({
            [key]: { $regex: search, $options: "i" },
          })),
        }
      : {}),
    ...(query.filter === "buyers"
      ? { roles: "buyer" }
      : query.filter === "sellers"
        ? { roles: "seller" }
        : query.filter === "active"
          ? { status: "active" }
          : query.filter === "preregistered"
            ? {
                preRegisteredAt: { $type: "date" },
                mobileVerified: { $ne: true },
              }
            : {}),
  };
  const [rows, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    User.countDocuments(filter),
  ]);
  return {
    users: rows.map((row) => coordinatorUserDto(row, village, actorId)),
    total,
    page: query.page,
    limit: query.limit,
  };
}
export async function findConnections(
  villageId: string,
  query: CoordinatorQuery,
) {
  const filter = {
    active: true,
    $or: [{ sourceVillageId: villageId }, { targetVillageId: villageId }],
  };
  const [rows, total] = await Promise.all([
    VillageConnection.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    VillageConnection.countDocuments(filter),
  ]);
  const connections = [];
  for (const row of rows) {
    const other =
      String(row.sourceVillageId) === villageId
        ? row.targetVillageId
        : row.sourceVillageId;
    const village = await Village.findById(other).lean();
    if (village)
      connections.push({
        id: String(row._id),
        village: mobileVillageDto(village),
        createdAt: row.createdAt.toISOString(),
      });
  }
  return { connections, total, page: query.page, limit: query.limit };
}
// Historical user/listing events are derived from authoritative records; no demo
// events or guessed seller-activation dates are backfilled.
export async function findCoordinatorActivity(
  villageId: string,
  query: CoordinatorQuery,
  activityId?: string,
) {
  const village = new Types.ObjectId(villageId);
  const range = dateRange(query);
  const project = (
    type: string,
    action: string,
    date: unknown,
    name: unknown,
    targetId: unknown = { $toString: "$_id" },
  ) => ({
    _id: 0,
    id: { $concat: [`${type}:`, { $toString: "$_id" }] },
    type: { $literal: type },
    action: { $literal: action },
    name,
    targetId,
    createdAt: date,
    quantity: { $literal: null },
    unit: { $literal: null },
  });
  const pipeline: PipelineStage[] = [
    {
      $match: {
        village,
        $or: [
          { preRegisteredAt: { $exists: false } },
          { mobileVerified: true },
        ],
      },
    },
    {
      $project: project(
        "users",
        "registered",
        { $ifNull: ["$registeredAt", "$createdAt"] },
        "$name",
      ),
    },
    {
      $unionWith: {
        coll: User.collection.name,
        pipeline: [
          { $match: { village, preRegisteredAt: { $type: "date" } } },
          {
            $project: project(
              "buyers",
              "buyer.added",
              "$preRegisteredAt",
              "$name",
            ),
          },
        ],
      },
    },
    {
      $unionWith: {
        coll: User.collection.name,
        pipeline: [
          { $match: { village, sellerActivatedAt: { $type: "date" } } },
          {
            $project: project(
              "sellers",
              "seller.activated",
              "$sellerActivatedAt",
              "$name",
            ),
          },
        ],
      },
    },
    {
      $unionWith: {
        coll: Listing.collection.name,
        pipeline: [
          { $match: { village } },
          {
            $project: {
              ...project(
                "listings",
                "listing.created",
                "$createdAt",
                "$productName",
              ),
              quantity: { $ifNull: ["$quantity", null] },
              unit: { $ifNull: ["$unit", null] },
            },
          },
        ],
      },
    },
    {
      $unionWith: {
        coll: AuditLog.collection.name,
        pipeline: [
          {
            $match: {
              villageId: village,
              actorUserId: { $exists: true },
              action: /^connection\./,
            },
          },
          {
            $project: {
              ...project(
                "mapping",
                "",
                "$createdAt",
                { $ifNull: ["$targetName", ""] },
                { $toString: "$targetId" },
              ),
              action: "$action",
            },
          },
        ],
      },
    },
    {
      $unionWith: {
        coll: VillageReport.collection.name,
        pipeline: [
          {
            $match: {
              villageId: village,
              ...(query.reportStatus === "open"
                ? { status: { $in: ["pending", "flagged", "escalated"] } }
                : {}),
            },
          },
          {
            $project: project(
              "reports",
              "report.created",
              "$createdAt",
              "$productName",
            ),
          },
        ],
      },
    },
    {
      $unionWith: {
        coll: AuditLog.collection.name,
        pipeline: [
          {
            $match: {
              villageId: village,
              actorUserId: { $exists: true },
              action: {
                $in: [
                  "report.dismiss",
                  "report.flag",
                  "report.hide",
                  "report.escalate",
                  "user.corrected",
                ],
              },
            },
          },
          {
            $project: {
              ...project(
                "reports",
                "",
                "$createdAt",
                { $ifNull: ["$targetName", ""] },
                { $toString: "$targetId" },
              ),
              type: {
                $cond: [
                  { $eq: ["$action", "user.corrected"] },
                  "users",
                  "reports",
                ],
              },
              id: {
                $concat: [
                  {
                    $cond: [
                      { $eq: ["$action", "user.corrected"] },
                      "users:",
                      "reports:",
                    ],
                  },
                  { $toString: "$_id" },
                ],
              },
              action: "$action",
            },
          },
        ],
      },
    },
    {
      $match: {
        ...(activityId ? { id: activityId } : { createdAt: range.filter }),
        ...(query.type !== "all"
          ? {
              type:
                query.type === "users"
                  ? { $in: ["users", "buyers", "sellers"] }
                  : query.type,
            }
          : {}),
        ...(query.action === "registered" ? { action: "registered" } : {}),
        ...(query.reportStatus === "open" ? { action: "report.created" } : {}),
      },
    },
    {
      $facet: {
        rows: [
          { $sort: { createdAt: -1, id: -1 } },
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
        ],
        count: [{ $count: "total" }],
      },
    },
  ];
  const [result] = await User.aggregate<{
    rows: { createdAt: Date }[];
    count: { total: number }[];
  }>(pipeline);
  return {
    activities: (result?.rows || []).map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    total: result?.count[0]?.total || 0,
    page: query.page,
    limit: query.limit,
  };
}
