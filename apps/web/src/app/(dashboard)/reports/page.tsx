import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import {
  adminReportsQuerySchema,
  listReportsForAdmin,
} from "@/server/services/coordinator-reports";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const parsed = adminReportsQuerySchema.safeParse(await searchParams);
  const query = parsed.success
    ? parsed.data
    : adminReportsQuerySchema.parse({});
  const data = await listReportsForAdmin(query);
  const url = (page: number, status = query.status) =>
    `/reports?${new URLSearchParams({ page: String(page), ...(status ? { status } : {}) })}`;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      <nav className="flex flex-wrap gap-4">
        <Link href="/reports">All</Link>
        {(
          ["pending", "escalated", "flagged", "hidden", "dismissed"] as const
        ).map((status) => (
          <Link key={status} href={url(1, status)}>
            {status}
          </Link>
        ))}
      </nav>
      <p>Escalated reports are available here for Super Admin review.</p>
      {!data.reports.length ? (
        <p>No reports found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>Product</th>
                <th>Complaint</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.reports.map((report) => (
                <tr key={report.id} className="border-t">
                  <td className="p-3">{report.productName}</td>
                  <td className="whitespace-pre-wrap p-3">{report.reason}</td>
                  <td className="p-3">{report.status}</td>
                  <td className="p-3">
                    {new Date(report.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav className="flex gap-4">
        {query.page > 1 && <Link href={url(query.page - 1)}>Previous</Link>}
        {query.page * 20 < data.total && (
          <Link href={url(query.page + 1)}>Next</Link>
        )}
      </nav>
    </div>
  );
}
