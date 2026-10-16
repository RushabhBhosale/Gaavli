import { healthStatusSchema } from "@gaavli/validation";
import { ok } from "@/server/utils/http";

export const runtime = "nodejs";

/** Public liveness only: no database query or application/user data. */
export async function GET() {
  return ok(healthStatusSchema.parse({ status: "ok" }));
}
