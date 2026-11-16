import { USER_CSV_BYTE_LIMIT } from "@/lib/user-csv";
import { importUsers } from "@/server/services/users";
import { AppError } from "@/server/utils/errors";
import { endpoint, ok } from "@/server/utils/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return endpoint(request, async (admin) => {
    const type = request.headers.get("content-type") || "";
    if (!type.includes("text/csv") && !type.includes("text/plain"))
      throw new AppError(400, "VALIDATION_ERROR", "Upload a CSV file.");
    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > USER_CSV_BYTE_LIMIT)
      throw new AppError(413, "VALIDATION_ERROR", "CSV file is too large.");
    return ok(await importUsers(admin.id, await request.text()));
  });
}
