import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdmin } from "../auth/session";
import { AppError } from "./errors";
import type { AdminDto } from "@/lib/contracts";
export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new AppError(403, "FORBIDDEN", "Request origin is not allowed.");
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError(400, "VALIDATION_ERROR", "Send a JSON request.");
  const text = await request.text();
  if (text.length > 16384)
    throw new AppError(413, "VALIDATION_ERROR", "Request too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid JSON.");
  }
}
export const ok = (data: unknown, status = 200) =>
  NextResponse.json(
    { success: true, data },
    { status, headers: { "Cache-Control": "no-store" } },
  );
export async function endpoint(
  request: Request,
  handler: (admin: AdminDto) => Promise<Response>,
) {
  return safe(async () => {
    if (!["GET", "HEAD"].includes(request.method)) checkOrigin(request);
    const admin = await requireAdmin();
    return handler(admin);
  });
}
export async function safe(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    let status = 500,
      code = "INTERNAL_ERROR",
      message = "Something went wrong. Please try again.";
    if (error instanceof AppError) ({ status, code, message } = error);
    else if (error instanceof ZodError) {
      status = 422;
      code = "VALIDATION_ERROR";
      message = error.issues[0]?.message || "Invalid input.";
    } else if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === 11000
    ) {
      status = 409;
      code = "CONFLICT";
      message = "This mobile number or email already exists.";
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          ...(error instanceof AppError && error.details
            ? { details: error.details }
            : {}),
        },
        requestId: crypto.randomUUID(),
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
