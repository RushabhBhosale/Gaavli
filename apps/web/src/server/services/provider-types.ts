import "server-only";
import { ProviderType, PROVIDER_TYPE_LABELS } from "@gaavli/constants";
import type { z } from "zod";
import { providerTypeOptionsQuerySchema } from "@/schemas";
import type {
  providerTypeOptionSchema,
  providerTypeOptionUpdateSchema,
} from "@/schemas";
import { connectDb } from "../db/connect";
import { ProviderTypeOption } from "../models/provider-type-option";
import { AuditLog } from "../models";
import { AppError } from "../utils/errors";

type Input = z.infer<typeof providerTypeOptionSchema>;
type Update = z.infer<typeof providerTypeOptionUpdateSchema>;
const builtIns = Object.values(ProviderType).map((code, index) => ({
  code,
  name: PROVIDER_TYPE_LABELS[code],
  sortOrder: (index + 1) * 10,
  isActive: true,
  version: 0,
  builtIn: true,
}));
function dto(row: {
  code: string;
  name: { en: string; mr: string; hi: string };
  sortOrder: number;
  isActive: boolean;
  __v?: number;
}) {
  return {
    code: row.code,
    name: row.name,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    version: row.__v ?? 0,
    builtIn: Object.values(ProviderType).includes(row.code as ProviderType),
  };
}
function compareOptions(
  a: ReturnType<typeof dto>,
  b: ReturnType<typeof dto>,
  sort: z.infer<typeof providerTypeOptionsQuerySchema>["sort"],
) {
  switch (sort) {
    case "name.en":
      return a.name.en.localeCompare(b.name.en);
    case "name.mr":
      return a.name.mr.localeCompare(b.name.mr);
    case "name.hi":
      return a.name.hi.localeCompare(b.name.hi);
    case "code":
      return a.code.localeCompare(b.code);
    case "isActive":
      return Number(a.isActive) - Number(b.isActive);
    default:
      return a.sortOrder - b.sortOrder;
  }
}

export async function listProviderTypeOptions(rawQuery: unknown = {}) {
  const query = providerTypeOptionsQuerySchema.parse(rawQuery);
  await connectDb();
  const stored = await ProviderTypeOption.find().sort({ sortOrder: 1, code: 1 }).lean();
  const overrides = new Map(
    stored.map((row) => [row.code, dto(row)] as const),
  );
  const all = [
    ...builtIns.map((row) => overrides.get(row.code) ?? row),
    ...stored.filter((row) => !builtIns.some((base) => base.code === row.code)).map(dto),
  ];
  const search = query.search.toLocaleLowerCase();
  const filtered = all.filter((row) => {
    if (query.status !== "all" && row.isActive !== (query.status === "active"))
      return false;
    if (!search) return true;
    return `${row.code} ${row.name.en} ${row.name.mr} ${row.name.hi}`
      .toLocaleLowerCase()
      .includes(search);
  });
  const direction = query.direction === "desc" ? -1 : 1;
  filtered.sort(
    (a, b) => compareOptions(a, b, query.sort) * direction || a.code.localeCompare(b.code),
  );
  const total = filtered.length;
  const page = Math.min(
    query.page,
    Math.max(1, Math.ceil(total / query.limit)),
  );
  const start = (page - 1) * query.limit;
  return {
    records: filtered.slice(start, start + query.limit),
    total,
    page,
    limit: query.limit,
  };
}
export async function createProviderTypeOption(actorId: string, input: Input) {
  await connectDb();
  if (Object.values(ProviderType).includes(input.code as ProviderType))
    throw new AppError(409, "CONFLICT", "That provider type already exists.");
  if (await ProviderTypeOption.exists({ code: input.code }))
    throw new AppError(409, "CONFLICT", "That provider type code already exists.");
  const row = await ProviderTypeOption.create(input);
  await AuditLog.create({ actorId, action: "provider-type.created", targetId: row._id });
  return dto(row);
}
export async function updateProviderTypeOption(actorId: string, code: string, input: Update) {
  await connectDb();
  const builtin = Object.values(ProviderType).includes(code as ProviderType);
  const row = await ProviderTypeOption.findOne({ code });
  if (!row && !builtin) throw new AppError(404, "NOT_FOUND", "Provider type not found.");
  if (!row) {
    const created = await ProviderTypeOption.create({ code, ...input });
    await AuditLog.create({ actorId, action: "provider-type.updated", targetId: created._id });
    return dto(created);
  }
  if (row.__v !== input.version)
    throw new AppError(409, "STALE_VERSION", "This provider type changed. Refresh and try again.");
  row.name = input.name;
  row.sortOrder = input.sortOrder;
  row.isActive = input.isActive;
  await row.save();
  await AuditLog.create({ actorId, action: "provider-type.updated", targetId: row._id });
  return dto(row);
}
