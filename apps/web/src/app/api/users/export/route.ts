import { usersFilterSchema } from "@/schemas";
import { exportUsersCsv } from "@/server/services/users";
import { endpoint } from "@/server/utils/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return endpoint(request, async () => {
    const csv = await exportUsersCsv(
      usersFilterSchema.parse(
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="users.csv"',
        "Cache-Control": "no-store",
      },
    });
  });
}
