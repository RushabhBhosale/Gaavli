import "server-only";
import { z } from "zod";
import { connectDb } from "../db/connect";
import { findAdminReports } from "../repositories/coordinator-reports";
export const adminReportsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    status: z
      .enum(["pending", "dismissed", "flagged", "hidden", "escalated"])
      .optional(),
  })
  .strict();
export async function listReportsForAdmin(
  query: z.infer<typeof adminReportsQuerySchema>,
) {
  await connectDb();
  return findAdminReports(query.page, query.status);
}
