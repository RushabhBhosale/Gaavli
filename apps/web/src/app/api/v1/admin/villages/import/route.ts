import { VILLAGE_CSV_BYTE_LIMIT } from "@/lib/village-csv";
import { importVillages } from "@/server/services/villages";
import { AppError } from "@/server/utils/errors";
import { endpoint, ok } from "@/server/utils/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return endpoint(request, async (admin) => {
    const type = request.headers.get("content-type") || "";
    if (!type.includes("text/csv") && !type.includes("text/plain"))
      throw new AppError(400, "VALIDATION_ERROR", "Upload a CSV file.");
    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > VILLAGE_CSV_BYTE_LIMIT)
      throw new AppError(413, "VALIDATION_ERROR", "CSV file is too large.");
    return ok(await importVillages(admin.id, await request.text()));
  });
}
