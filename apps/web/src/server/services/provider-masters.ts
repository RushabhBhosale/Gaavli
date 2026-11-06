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
  normalizedNames,
  providerMasterDto,
} from "../repositories/provider-masters";
import { AppError } from "../utils/errors";

export async function listProviderMasters(
  query: z.infer<typeof providerMasterQuerySchema>,
) {
  await connectDb();
  return findProviderMasters(query);
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
