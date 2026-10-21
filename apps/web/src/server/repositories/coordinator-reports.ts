import "server-only";
import { VillageReport } from "../models/coordinator";
import { coordinatorReportDto } from "./coordinator";
export async function findAdminReports(page: number, status?: string) {
  const filter = status ? { status } : {};
  const [rows, total] = await Promise.all([
    VillageReport.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * 20)
      .limit(20),
    VillageReport.countDocuments(filter),
  ]);
  return { reports: rows.map(coordinatorReportDto), total, page, limit: 20 };
}
