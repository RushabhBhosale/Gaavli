import { objectId } from "@/schemas";
import { AppError } from "@/server/utils/errors";

function requiredId(value: string | null, missing: string) {
  if (!value?.trim()) throw new AppError(400, "VALIDATION_ERROR", missing);
  const parsed = objectId.safeParse(value.trim());
  if (!parsed.success)
    throw new AppError(400, "VALIDATION_ERROR", "Invalid ID");
  return parsed.data;
}

export function districtIdQuery(url: string) {
  return requiredId(
    new URL(url).searchParams.get("districtId"),
    "Choose a district.",
  );
}

export function talukaIdQuery(url: string) {
  const params = new URL(url).searchParams;
  if (!params.has("talukaId"))
    throw new AppError(400, "VALIDATION_ERROR", "Choose a taluka.");
  return requiredId(params.get("talukaId"), "Choose a taluka.");
}
