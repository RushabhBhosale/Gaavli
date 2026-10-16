import assert from "node:assert/strict";
import { healthStatusSchema, apiSuccessSchema } from "@gaavli/validation";
import { createApiClient } from "../apps/mobile/src/api/client";

async function main() {
  const base =
    process.env.GAAVLI_VERIFY_API_BASE_URL ?? "http://localhost:3000/api/v1";
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(
    apiSuccessSchema(healthStatusSchema).parse(await response.json()),
    { success: true, data: { status: "ok" } },
  );
  const client = createApiClient({ baseUrl: base, development: true });
  assert.deepEqual(await client("/health", healthStatusSchema), {
    status: "ok",
  });
  const admin = await fetch(`${base}/admin/categories`);
  assert.equal(admin.status, 401, "Admin endpoints must stay protected");
  assert.equal((await fetch(`${base}/health`, { method: "POST" })).status, 405);
  console.log(
    "PASS: public no-store health, validated mobile client, GET-only behavior and protected Admin API.",
  );
}
void main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Health check failed.",
  );
  process.exitCode = 1;
});
