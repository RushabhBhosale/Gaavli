import { providerMasterQuerySchema } from "@gaavli/validation";
import { exportProviderMastersCsv } from "@/server/services/provider-masters";
import { endpoint } from "@/server/utils/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return endpoint(request, async () => {
    const csv = await exportProviderMastersCsv(
      providerMasterQuerySchema.parse(
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="provider-masters.csv"',
        "Cache-Control": "no-store",
      },
    });
  });
}
