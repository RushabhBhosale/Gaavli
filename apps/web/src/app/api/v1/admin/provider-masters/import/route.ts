import { providerMasterGroupSchema } from "@gaavli/validation";
import { PROVIDER_MASTER_CSV_BYTE_LIMIT } from "@/lib/provider-master-csv";
import { importProviderMasters } from "@/server/services/provider-masters";
import { AppError } from "@/server/utils/errors";
import { endpoint, ok } from "@/server/utils/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return endpoint(request, async (admin) => {
    const type = request.headers.get("content-type") || "";
    if (!type.includes("text/csv") && !type.includes("text/plain"))
      throw new AppError(400, "VALIDATION_ERROR", "Upload a CSV file.");
    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > PROVIDER_MASTER_CSV_BYTE_LIMIT)
      throw new AppError(413, "VALIDATION_ERROR", "CSV file is too large.");
    const group = providerMasterGroupSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return ok(
      await importProviderMasters(admin.id, group, await request.text()),
    );
  });
}
