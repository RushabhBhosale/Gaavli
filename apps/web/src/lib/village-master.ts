import { AppError } from "@/server/utils/errors";

export type MasterSnapshot = {
  id: string;
  nameEn: string;
  nameMr: string | null;
  lgdCode: string;
  districtId: string;
  talukaId: string;
  districtName: string;
  talukaName: string;
};

export type VillageIdentity = {
  nameEn: string;
  nameMr: string;
  taluka: string;
  district: string;
  villageMasterId: string;
  lgdCode: string;
  districtId: string;
  talukaId: string;
};

export function requireMasterSnapshot(
  master: MasterSnapshot | null,
): MasterSnapshot {
  if (!master)
    throw new AppError(422, "VALIDATION_ERROR", "Choose an official village.");
  if (!master.districtName.trim() || !master.talukaName.trim())
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "This official village is missing its district or taluka.",
    );
  return master;
}

export function fieldsFromMaster(
  master: MasterSnapshot,
  typedNameMr: string | undefined,
): VillageIdentity {
  const officialMarathi = master.nameMr?.trim() || "";
  const nameMr = officialMarathi || typedNameMr?.trim() || "";
  if (nameMr.length < 2)
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "Enter the Marathi village name.",
    );
  return {
    nameEn: master.nameEn.trim(),
    nameMr,
    taluka: master.talukaName.trim(),
    district: master.districtName.trim(),
    villageMasterId: master.id,
    lgdCode: master.lgdCode,
    districtId: master.districtId,
    talukaId: master.talukaId,
  };
}

export function rejectIfMasterTaken(
  existingVillageId: string | null,
  currentVillageId?: string,
) {
  if (existingVillageId && existingVillageId !== currentVillageId)
    throw new AppError(
      409,
      "CONFLICT",
      "This official village is already added.",
    );
}

function duplicateKeyPattern(error: object) {
  if ("keyPattern" in error && error.keyPattern && typeof error.keyPattern === "object")
    return error.keyPattern as Record<string, unknown>;
  if (
    "errorResponse" in error &&
    error.errorResponse &&
    typeof error.errorResponse === "object" &&
    "keyPattern" in error.errorResponse &&
    error.errorResponse.keyPattern &&
    typeof error.errorResponse.keyPattern === "object"
  )
    return error.errorResponse.keyPattern as Record<string, unknown>;
  return undefined;
}

export function villageDuplicateMessage(error: unknown) {
  if (typeof error !== "object" || !error || !("code" in error)) return null;
  if (error.code !== 11000 && error.code !== "11000") return null;
  const pattern = duplicateKeyPattern(error);
  const message = "message" in error ? String(error.message) : "";
  if (
    pattern?.villageMasterId ||
    message.includes("villageMasterId") ||
    message.includes("uq_village_master")
  )
    return "This official village is already added.";
  return "A village with this name already exists.";
}
