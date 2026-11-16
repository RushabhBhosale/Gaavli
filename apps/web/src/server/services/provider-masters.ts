import "server-only";
import { randomBytes } from "node:crypto";
import type { z } from "zod";
import type {
  providerMasterCreateSchema,
  providerMasterUpdateSchema,
  providerMasterStatusSchema,
  providerMasterQuerySchema,
  providerMasterGroupSchema,
} from "@gaavli/validation";
import { connectDb } from "../db/connect";
import { ProviderMaster } from "../models/provider-master";
import { AuditLog } from "../models";
import {
  findProviderMasters,
  findProviderMastersForExport,
  normalizedNames,
  providerMasterDto,
} from "../repositories/provider-masters";
import { normalizeProviderMasterName } from "@gaavli/validation";
import { AppError } from "../utils/errors";
import {
  providerMasterInputFromCsvRow,
  providerMastersToCsv,
  readProviderMasterCsv,
  PROVIDER_MASTER_CSV_BYTE_LIMIT,
} from "@/lib/provider-master-csv";

export const PROVIDER_MASTER_EXPORT_LIMIT = 5000;

export async function listProviderMasters(
  query: z.infer<typeof providerMasterQuerySchema>,
) {
  await connectDb();
  return findProviderMasters(query);
}
export async function exportProviderMastersCsv(
  query: z.infer<typeof providerMasterQuerySchema>,
) {
  await connectDb();
  const page = await findProviderMastersForExport(
    query,
    PROVIDER_MASTER_EXPORT_LIMIT,
  );
  if (page.total > PROVIDER_MASTER_EXPORT_LIMIT)
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "Narrow the filters. An export can include at most 5,000 master options.",
    );
  return providerMastersToCsv(page.records);
}
export async function importProviderMasters(
  actorId: string,
  group: z.infer<typeof providerMasterGroupSchema>,
  text: string,
) {
  if (text.length > PROVIDER_MASTER_CSV_BYTE_LIMIT)
    throw new AppError(413, "VALIDATION_ERROR", "CSV file is too large.");
  const read = readProviderMasterCsv(text);
  if ("error" in read) throw new AppError(422, "VALIDATION_ERROR", read.error);
  const failed: { line: number; message: string }[] = [];
  const seen = {
    en: new Set<string>(),
    mr: new Set<string>(),
    hi: new Set<string>(),
  };
  let created = 0;
  for (const row of read.rows) {
    const input = providerMasterInputFromCsvRow(row, group);
    if (!input.ok) {
      failed.push({ line: row.line, message: input.message });
      continue;
    }
    const names = {
      en: normalizeProviderMasterName(input.data.name.en),
      mr: normalizeProviderMasterName(input.data.name.mr),
      hi: normalizeProviderMasterName(input.data.name.hi),
    };
    const repeated = (["en", "mr", "hi"] as const).find((language) =>
      seen[language].has(names[language]),
    );
    if (repeated) {
      failed.push({
        line: row.line,
        message: `This ${repeated === "en" ? "English" : repeated === "mr" ? "Marathi" : "Hindi"} name is repeated in the file.`,
      });
      continue;
    }
    seen.en.add(names.en);
    seen.mr.add(names.mr);
    seen.hi.add(names.hi);
    try {
      await createProviderMaster(actorId, input.data);
      created += 1;
    } catch (error) {
      failed.push({
        line: row.line,
        message:
          error instanceof AppError
            ? error.message
            : "Unable to add this master option.",
      });
    }
  }
  return { created, failed };
}
export async function activeProviderMasters(
  group: z.infer<typeof providerMasterGroupSchema>,
) {
  await connectDb();
  const rows = await ProviderMaster.find({ ...group, isActive: true }).sort({
    sortOrder: 1,
    "name.en": 1,
    _id: 1,
  });
  return {
    records: rows.map((row) => ({
      id: String(row._id),
      code: row.code,
      name: { en: row.name.en, mr: row.name.mr, hi: row.name.hi },
    })),
  };
}
function conflict(error: unknown): never {
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === 11000
  )
    throw new AppError(
      409,
      "CONFLICT",
      "This name or code already exists in this master group.",
    );
  throw error;
}
export async function createProviderMaster(
  actorId: string,
  input: z.infer<typeof providerMasterCreateSchema>,
) {
  await connectDb();
  await ProviderMaster.init();
  const slug =
    input.name.en
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .toUpperCase()
      .slice(0, 60) || "OPTION";
  try {
    return await ProviderMaster.db.transaction(async (session) => {
      const [row] = await ProviderMaster.create(
        [
          {
            ...input,
            code: `${slug}_${randomBytes(6).toString("hex").toUpperCase()}`,
            normalizedName: normalizedNames(input.name),
          },
        ],
        { session },
      );
      await AuditLog.create(
        [{ actorId, action: "PROVIDER_MASTER_CREATED", targetId: row._id }],
        { session },
      );
      return providerMasterDto(row);
    });
  } catch (error) {
    return conflict(error);
  }
}
export async function updateProviderMaster(
  actorId: string,
  id: string,
  input:
    | z.infer<typeof providerMasterUpdateSchema>
    | z.infer<typeof providerMasterStatusSchema>,
) {
  await connectDb();
  await ProviderMaster.init();
  try {
    return await ProviderMaster.db.transaction(async (session) => {
      const row = await ProviderMaster.findById(id).session(session);
      if (!row)
        throw new AppError(404, "NOT_FOUND", "Master option not found.");
      if (row.__v !== input.version)
        throw new AppError(
          409,
          "STALE_VERSION",
          "This option changed. Reload it before saving.",
        );
      if ("name" in input) {
        row.name = input.name;
        row.normalizedName = normalizedNames(input.name);
        row.sortOrder = input.sortOrder;
      } else row.isActive = input.isActive;
      await row.save({ session });
      await AuditLog.create(
        [
          {
            actorId,
            action:
              "name" in input
                ? "PROVIDER_MASTER_UPDATED"
                : "PROVIDER_MASTER_STATUS_CHANGED",
            targetId: row._id,
          },
        ],
        { session },
      );
      return providerMasterDto(row);
    });
  } catch (error) {
    return conflict(error);
  }
}
