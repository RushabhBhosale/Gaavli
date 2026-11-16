import "server-only";
import type { z } from "zod";
import {
  normalizeProviderMasterName,
  type providerMasterQuerySchema,
  type providerMasterSeedSchema,
} from "@gaavli/validation";
import { ProviderMaster } from "../models/provider-master";

export const normalizedNames = (name: {
  en: string;
  mr: string;
  hi: string;
}) => ({
  en: normalizeProviderMasterName(name.en),
  mr: normalizeProviderMasterName(name.mr),
  hi: normalizeProviderMasterName(name.hi),
});
export function providerMasterDto(row: InstanceType<typeof ProviderMaster>) {
  return {
    id: String(row._id),
    providerType: row.providerType,
    masterType: row.masterType,
    code: row.code,
    name: { en: row.name.en, mr: row.name.mr, hi: row.name.hi },
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    version: row.__v,
  };
}
function masterQuery(query: z.infer<typeof providerMasterQuerySchema>) {
  const search = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const base = {
    providerType: query.providerType,
    masterType: query.masterType,
    ...(search
      ? {
          $or: ["name.en", "name.mr", "name.hi", "code"].map((key) => ({
            [key]: { $regex: search, $options: "i" },
          })),
        }
      : {}),
  };
  return {
    base,
    filter: {
      ...base,
      ...(query.status === "all"
        ? {}
        : { isActive: query.status === "active" }),
    },
    sort: { [query.sort]: query.direction === "asc" ? 1 : -1, _id: 1 } as const,
  };
}
export async function findProviderMasters(
  query: z.infer<typeof providerMasterQuerySchema>,
) {
  const { base, filter, sort } = masterQuery(query);
  const [total, active, inactive] = await Promise.all([
    ProviderMaster.countDocuments(filter),
    ProviderMaster.countDocuments({ ...base, isActive: true }),
    ProviderMaster.countDocuments({ ...base, isActive: false }),
  ]);
  const page = Math.min(
    query.page,
    Math.max(1, Math.ceil(total / query.limit)),
  );
  const rows = await ProviderMaster.find(filter)
    .sort(sort)
    .skip((page - 1) * query.limit)
    .limit(query.limit);
  return {
    records: rows.map(providerMasterDto),
    total,
    page,
    limit: query.limit,
    counts: { total: active + inactive, active, inactive },
  };
}
export async function findProviderMastersForExport(
  query: z.infer<typeof providerMasterQuerySchema>,
  limit: number,
) {
  const { filter, sort } = masterQuery(query);
  const total = await ProviderMaster.countDocuments(filter);
  if (total > limit) return { records: [], total };
  const rows = await ProviderMaster.find(filter).sort(sort).limit(limit);
  return { records: rows.map(providerMasterDto), total };
}
export async function seedProviderMasters(
  rows: z.infer<typeof providerMasterSeedSchema>,
) {
  await ProviderMaster.init();
  const now = new Date();
  const result = await ProviderMaster.bulkWrite(
    rows.map((row) => ({
      updateOne: {
        filter: {
          providerType: row.providerType,
          masterType: row.masterType,
          code: row.code,
        },
        update: {
          $setOnInsert: {
            ...row,
            normalizedName: normalizedNames(row.name),
            __v: 0,
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
        timestamps: false,
      },
    })),
    { ordered: false },
  );
  const verified = await ProviderMaster.countDocuments({
    $or: rows.map(({ providerType, masterType, code }) => ({
      providerType,
      masterType,
      code,
    })),
  });
  if (verified !== rows.length)
    throw new Error("Provider master seed count verification failed.");
  return {
    source: rows.length,
    inserted: result.upsertedCount,
    existing: rows.length - result.upsertedCount,
    verified,
  };
}
