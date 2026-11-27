import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WATI sends many event shapes; only the discriminator is required.
const eventSchema = z
  .object({
    eventType: z.string().min(1).max(100),
    id: z.string().nullish(),
    waId: z.string().nullish(),
    statusString: z.string().nullish(),
  })
  .passthrough();

function authorized(request: NextRequest) {
  const secret = process.env.WATI_WEBHOOK_SECRET?.trim();
  const given = request.nextUrl.searchParams.get("token") ?? "";
  if (!secret || secret.length < 16) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Public WATI webhook receiver (WATI cannot send our auth headers, so the
 * endpoint is protected by a secret `token` query parameter).
 * Register as: https://<host>/api/v1/webhooks/wati?token=<WATI_WEBHOOK_SECRET>
 */
export async function POST(request: NextRequest) {
  if (!authorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = eventSchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });

  // Log only non-sensitive metadata (no phone numbers or message text).
  console.info("[wati-webhook]", {
    eventType: body.data.eventType,
    id: body.data.id ?? undefined,
    status: body.data.statusString ?? undefined,
  });

  // Always ack quickly so WATI does not retry.
  return NextResponse.json({ received: true });
}
